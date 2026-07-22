-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v2
-- Reservas · Renovações · Pagamentos · Notificações · Histórico
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Ampliar rentals ────────────────────────────────────────────
alter table public.rentals
  add column if not exists renewals_count int default 0 not null,
  add column if not exists max_renewals int default 1 not null,
  add column if not exists late_fee_paid boolean default false not null,
  add column if not exists damage_fee_paid boolean default false not null,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text,
  add column if not exists payment_notes text;

comment on column public.rentals.renewals_count is 'Quantas vezes o empréstimo foi renovado';
comment on column public.rentals.max_renewals is 'Limite de renovações (default 1)';
comment on column public.rentals.late_fee_paid is 'Multa de atraso paga?';
comment on column public.rentals.damage_fee_paid is 'Taxa de dano/extravio paga?';

-- ── 2. Reservas / fila de espera ──────────────────────────────────
do $$ begin
  create type reservation_status as enum ('waiting', 'notified', 'fulfilled', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.reservations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status reservation_status default 'waiting' not null,
  notified_at timestamptz,
  expires_at timestamptz,   -- prazo pra retirar após ser notificado (default 48h)
  fulfilled_at timestamptz, -- quando virou empréstimo
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Um leitor só pode ter uma reserva ativa por livro
create unique index if not exists unique_active_reservation
  on public.reservations(user_id, book_id)
  where status in ('waiting', 'notified');

create index if not exists idx_reservations_book_waiting
  on public.reservations(book_id, created_at)
  where status = 'waiting';

create index if not exists idx_reservations_user
  on public.reservations(user_id);

drop trigger if exists trg_reservations_updated on public.reservations;
create trigger trg_reservations_updated
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- ── 3. Log de notificações ────────────────────────────────────────
do $$ begin
  create type notification_type as enum (
    'due_soon',              -- Vence em breve (2 dias)
    'overdue',               -- Já venceu
    'reservation_available', -- Livro reservado ficou disponível
    'reservation_expiring'   -- Reserva expira em breve
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.notification_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  rental_id uuid references public.rentals(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  type notification_type not null,
  channel text default 'email' not null,
  status text default 'pending' not null, -- pending, sent, failed
  error text,
  payload jsonb,
  sent_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user on public.notification_log(user_id);
create index if not exists idx_notifications_pending on public.notification_log(status) where status = 'pending';

-- Função auxiliar IMMUTABLE — o cast timestamptz::date depende do fuso
-- horário da sessão, então o Postgres não confia que seja imutável "de
-- verdade" dentro de um índice. Embrulhar resolve (mesmo padrão usado no
-- índice de busca de livros, em schema.sql).
create or replace function public.date_only(ts timestamptz)
returns date
language sql
immutable
as $$
  select ts::date;
$$;

-- Evita disparar a mesma notificação duas vezes no mesmo dia
create unique index if not exists unique_daily_notification
  on public.notification_log(rental_id, type, public.date_only(created_at))
  where rental_id is not null;

-- ═══════════════════════════════════════════════════════════════════
-- FUNÇÕES / RPCs
-- ═══════════════════════════════════════════════════════════════════

-- ── Renovar empréstimo ────────────────────────────────────────────
create or replace function public.renew_rental(
  rental_id_input uuid,
  extension_days int default 14
)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  waitlist_count int;
begin
  select * into r from public.rentals where id = rental_id_input;

  if r.id is null then
    raise exception 'Empréstimo não encontrado';
  end if;

  -- Autorização: dono do empréstimo ou admin
  if auth.uid() != r.user_id and not public.is_admin() then
    raise exception 'Sem permissão';
  end if;

  if r.status != 'active' then
    raise exception 'Apenas empréstimos em curso podem ser renovados';
  end if;

  if r.due_date < now() then
    raise exception 'Empréstimos atrasados não podem ser renovados. Devolva primeiro e quite a multa.';
  end if;

  if r.renewals_count >= r.max_renewals then
    raise exception 'Limite de renovações atingido para este empréstimo';
  end if;

  -- Verifica fila de espera pelo livro
  select count(*) into waitlist_count
  from public.reservations
  where book_id = r.book_id and status = 'waiting';

  if waitlist_count > 0 then
    raise exception 'Há % leitor(es) na fila por este livro. Renovação não permitida.', waitlist_count;
  end if;

  update public.rentals
  set due_date = due_date + (extension_days || ' days')::interval,
      renewals_count = renewals_count + 1,
      updated_at = now()
  where id = rental_id_input
  returning * into r;

  return r;
end;
$$;

-- ── Criar reserva ─────────────────────────────────────────────────
create or replace function public.create_reservation(book_id_input uuid)
returns public.reservations
language plpgsql
security definer
as $$
declare
  res public.reservations;
  book_available int;
  already_has_active bool;
  already_renting bool;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  -- Livro existe?
  select available_copies into book_available
  from public.books where id = book_id_input;
  if book_available is null then
    raise exception 'Livro não encontrado';
  end if;

  -- Se ainda tem cópias, não faz sentido reservar
  if book_available > 0 then
    raise exception 'Este livro está disponível para retirada direta';
  end if;

  -- Já tem reserva ativa?
  select exists (
    select 1 from public.reservations
    where user_id = auth.uid()
      and book_id = book_id_input
      and status in ('waiting', 'notified')
  ) into already_has_active;
  if already_has_active then
    raise exception 'Você já está na fila deste livro';
  end if;

  -- Já está com o livro emprestado?
  select exists (
    select 1 from public.rentals
    where user_id = auth.uid()
      and book_id = book_id_input
      and status = 'active'
  ) into already_renting;
  if already_renting then
    raise exception 'Você já está com este livro em curso';
  end if;

  insert into public.reservations (user_id, book_id, status)
  values (auth.uid(), book_id_input, 'waiting')
  returning * into res;

  return res;
end;
$$;

-- ── Cancelar reserva ──────────────────────────────────────────────
create or replace function public.cancel_reservation(reservation_id_input uuid)
returns public.reservations
language plpgsql
security definer
as $$
declare
  res public.reservations;
begin
  select * into res from public.reservations where id = reservation_id_input;

  if res.id is null then
    raise exception 'Reserva não encontrada';
  end if;

  if auth.uid() != res.user_id and not public.is_admin() then
    raise exception 'Sem permissão';
  end if;

  if res.status not in ('waiting', 'notified') then
    raise exception 'Esta reserva não pode ser cancelada';
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_at = now()
  where id = reservation_id_input
  returning * into res;

  return res;
end;
$$;

-- ── Posição na fila ───────────────────────────────────────────────
create or replace function public.reservation_position(reservation_id_input uuid)
returns int
language sql
stable
as $$
  with ranked as (
    select id, row_number() over (
      partition by book_id order by created_at
    ) as pos
    from public.reservations
    where status = 'waiting'
  )
  select pos::int from ranked where id = reservation_id_input;
$$;

-- ── Trigger: quando cópia volta a ficar disponível, notifica fila ─
create or replace function public.notify_next_in_waitlist()
returns trigger
language plpgsql
security definer
as $$
declare
  next_reservation_id uuid;
  next_user_id uuid;
begin
  -- Se available_copies passou de 0 para > 0
  if new.available_copies > 0 and old.available_copies = 0 then
    -- Pega o primeiro da fila
    select id, user_id into next_reservation_id, next_user_id
    from public.reservations
    where book_id = new.id and status = 'waiting'
    order by created_at asc
    limit 1;

    if next_reservation_id is not null then
      -- Marca como notificado, dá 48h de janela
      update public.reservations
      set status = 'notified',
          notified_at = now(),
          expires_at = now() + interval '48 hours'
      where id = next_reservation_id;

      -- Loga notificação pendente
      insert into public.notification_log (user_id, reservation_id, type, payload)
      values (
        next_user_id,
        next_reservation_id,
        'reservation_available',
        jsonb_build_object(
          'book_id', new.id,
          'book_title', new.title,
          'expires_at', (now() + interval '48 hours')::text
        )
      )
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_waitlist on public.books;
create trigger trg_notify_waitlist
  after update of available_copies on public.books
  for each row execute function public.notify_next_in_waitlist();

-- ── Registrar pagamento de multa ──────────────────────────────────
create or replace function public.register_payment(
  rental_id_input uuid,
  pay_late boolean default true,
  pay_damage boolean default true,
  method text default 'cash',
  notes_input text default null
)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar pagamentos';
  end if;

  update public.rentals
  set late_fee_paid = case when pay_late then true else late_fee_paid end,
      damage_fee_paid = case when pay_damage then true else damage_fee_paid end,
      paid_at = now(),
      payment_method = method,
      payment_notes = coalesce(notes_input, payment_notes),
      updated_at = now()
  where id = rental_id_input
  returning * into r;

  if r.id is null then
    raise exception 'Empréstimo não encontrado';
  end if;

  return r;
end;
$$;

-- ── View de pendências financeiras ────────────────────────────────
create or replace view public.financial_pending_view as
select
  r.id as rental_id,
  r.user_id,
  p.full_name,
  p.email,
  p.phone,
  b.id as book_id,
  b.title as book_title,
  r.status,
  r.returned_at,
  r.due_date,
  r.late_fee,
  r.late_fee_paid,
  r.damage_fee,
  r.damage_fee_paid,
  case when not r.late_fee_paid then r.late_fee else 0 end +
  case when not r.damage_fee_paid then r.damage_fee else 0 end as pending_amount
from public.rentals r
join public.profiles p on p.id = r.user_id
join public.books b on b.id = r.book_id
where r.returned_at is not null
  and (
    (r.late_fee > 0 and not r.late_fee_paid) or
    (r.damage_fee > 0 and not r.damage_fee_paid)
  );

-- ── Estatísticas por leitor ───────────────────────────────────────
create or replace function public.reader_stats(reader_id uuid)
returns table (
  total_rentals bigint,
  active_rentals bigint,
  late_returns bigint,
  damaged_returns bigint,
  lost_returns bigint,
  total_fines_paid numeric,
  total_fines_pending numeric,
  late_return_rate numeric
)
language sql
stable
as $$
  with agg as (
    select
      count(*) as total,
      count(*) filter (where status = 'active') as active,
      count(*) filter (where returned_at > due_date and status in ('returned','damaged','lost')) as late,
      count(*) filter (where status = 'damaged') as damaged,
      count(*) filter (where status = 'lost') as lost,
      coalesce(sum(case when late_fee_paid then late_fee else 0 end), 0) +
      coalesce(sum(case when damage_fee_paid then damage_fee else 0 end), 0) as paid,
      coalesce(sum(case when not late_fee_paid then late_fee else 0 end), 0) +
      coalesce(sum(case when not damage_fee_paid then damage_fee else 0 end), 0) as pending
    from public.rentals
    where user_id = reader_id
  )
  select
    total,
    active,
    late,
    damaged,
    lost,
    paid,
    pending,
    case when total > 0
      then round((late::numeric / total::numeric) * 100, 1)
      else 0
    end as rate
  from agg;
$$;
