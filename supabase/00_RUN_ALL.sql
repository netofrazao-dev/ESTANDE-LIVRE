-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — SCRIPT ÚNICO DE SETUP DO BANCO
-- ═══════════════════════════════════════════════════════════════════
--
-- Cole este arquivo INTEIRO no SQL Editor do Supabase e rode de uma vez.
-- Ele já contém, na ordem certa, tudo que foi construído até agora:
--
--   1) schema.sql          — tabelas, índices, triggers, funções base
--   2) rls-policies.sql    — segurança (Row Level Security)
--   3) migration_v2.sql    — reservas, renovação, pagamento de multa,
--                            notificações, estatísticas de leitor
--   4) rls-v2.sql          — segurança das tabelas novas do item 3
--   5) migration_v3.sql    — congela valores do contrato + LGPD
--   6) migration_v4.sql    — configurações do sistema editáveis
--   7) migration_v5.sql    — checkout atômico + locação no balcão
--   8) seed.sql            — categorias e livros de exemplo (opcional,
--                            mas incluído aqui; não duplica nada se
--                            você rodar este script mais de uma vez)
--
-- Seguro rodar de novo? Sim — cada trecho usa "if not exists",
-- "or replace", "on conflict do nothing" ou similar, então rodar este
-- arquivo mais de uma vez não deve quebrar nada nem duplicar dados.
--
-- O que NÃO está aqui (são passos manuais, fora do SQL Editor):
--   - Deploy das Edge Functions (notify-rentals, admin-create-reader)
--   - cron_setup.sql (precisa rodar DEPOIS de a Edge Function estar
--     deployada, e precisa que você troque os placeholders pelo seu
--     project ref e service role key)
--   - Configurações no painel (Site URL, SMTP, Captcha) — ver README.md
-- ═══════════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 1) schema.sql                                                  │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Schema completo
-- Postgres/Supabase
-- ═══════════════════════════════════════════════════════════════════

-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────────────
create type user_role as enum ('user', 'admin');
create type rental_status as enum ('active', 'returned', 'damaged', 'lost');

-- ═══════════════════════════════════════════════════════════════════
-- Tabela: profiles
-- Estende auth.users do Supabase com dados públicos do leitor
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  phone text,
  role user_role default 'user' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_email on public.profiles(email);

-- Trigger: cria profile automaticamente após signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Leitor'),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- Tabela: categories
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  slug text unique not null,
  description text,
  created_at timestamptz default now() not null
);

-- ═══════════════════════════════════════════════════════════════════
-- Tabela: books
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  author text not null,
  synopsis text,
  publisher text,
  year integer,
  pages integer,
  language text default 'Português',
  category_id uuid references public.categories(id) on delete set null,
  cover_url text,
  isbn text,
  catalog_number text,
  total_copies integer default 1 not null check (total_copies >= 0),
  available_copies integer default 1 not null check (available_copies >= 0),
  featured boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint available_le_total check (available_copies <= total_copies)
);

create index idx_books_slug on public.books(slug);
create index idx_books_category on public.books(category_id);
create index idx_books_featured on public.books(featured) where featured = true;
-- Função auxiliar IMMUTABLE para o índice de busca — o Postgres não aceita
-- to_tsvector(...) direto num índice porque, tecnicamente, ele depende da
-- configuração de idioma carregada, e não confia que seja imutável.
-- Embrulhar numa função declarada IMMUTABLE resolve isso (padrão comum).
create or replace function public.books_search_vector(title text, author text, synopsis text)
returns tsvector
language sql
immutable
as $$
  select to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(synopsis, ''));
$$;

create index idx_books_search on public.books using gin (
  public.books_search_vector(title, author, synopsis)
);

-- Slugify automático se vier vazio
create or replace function public.books_generate_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug = lower(regexp_replace(
      translate(new.title, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'),
      '[^a-z0-9]+', '-', 'g'
    ));
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_books_slug on public.books;
create trigger trg_books_slug
  before insert or update on public.books
  for each row execute function public.books_generate_slug();

-- ═══════════════════════════════════════════════════════════════════
-- Tabela: rentals
-- O coração transacional
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.rentals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  book_id uuid not null references public.books(id) on delete restrict,

  -- Datas
  rented_at timestamptz default now() not null,
  due_date timestamptz not null,
  returned_at timestamptz,

  -- Status e regras
  status rental_status default 'active' not null,
  daily_fine_rate numeric(10, 2) default 2.00 not null,
  late_fee numeric(10, 2) default 0 not null,
  damage_fee numeric(10, 2) default 0 not null,

  -- Termos e observações
  terms_accepted_at timestamptz default now() not null,
  notes text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_rentals_user on public.rentals(user_id);
create index idx_rentals_book on public.rentals(book_id);
create index idx_rentals_status on public.rentals(status);
create index idx_rentals_due_date on public.rentals(due_date) where status = 'active';

-- Trigger de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_rentals_updated on public.rentals;
create trigger trg_rentals_updated
  before update on public.rentals
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- Funções auxiliares (RPCs)
-- ═══════════════════════════════════════════════════════════════════

-- Decrementar cópias disponíveis (usado no checkout)
create or replace function public.decrement_available_copies(book_id_input uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.books
  set available_copies = available_copies - 1
  where id = book_id_input and available_copies > 0;
end;
$$;

-- Incrementar cópias disponíveis (usado na devolução)
create or replace function public.increment_available_copies(book_id_input uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.books
  set available_copies = available_copies + 1
  where id = book_id_input and available_copies < total_copies;
end;
$$;

-- View de aluguéis atrasados
create or replace view public.late_rentals_view as
select
  r.*,
  extract(day from (now() - r.due_date))::int as days_late,
  round(extract(day from (now() - r.due_date))::numeric * r.daily_fine_rate, 2) as accumulated_fine
from public.rentals r
where r.status = 'active'
  and r.due_date < now();

-- ═══════════════════════════════════════════════════════════════════
-- Storage buckets
-- ═══════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 2) rls-policies.sql                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════

-- Habilita RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.rentals enable row level security;

-- ── Função auxiliar: verifica se o usuário é admin ─────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ═══════════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════════

-- Usuário lê o próprio profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Usuário atualiza o próprio profile (menos o role)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Admin lê todos os profiles
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- CATEGORIES
-- ═══════════════════════════════════════════════════════════════════

-- Todos leem
drop policy if exists "categories_read_all" on public.categories;
create policy "categories_read_all"
  on public.categories for select
  using (true);

-- Só admin escreve
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- BOOKS
-- ═══════════════════════════════════════════════════════════════════

-- Todos leem
drop policy if exists "books_read_all" on public.books;
create policy "books_read_all"
  on public.books for select
  using (true);

-- Só admin escreve
drop policy if exists "books_admin_write" on public.books;
create policy "books_admin_write"
  on public.books for all
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- RENTALS
-- ═══════════════════════════════════════════════════════════════════

-- Usuário lê os próprios aluguéis
drop policy if exists "rentals_select_own" on public.rentals;
create policy "rentals_select_own"
  on public.rentals for select
  using (auth.uid() = user_id);

-- Usuário cria os próprios aluguéis
drop policy if exists "rentals_insert_own" on public.rentals;
create policy "rentals_insert_own"
  on public.rentals for insert
  with check (auth.uid() = user_id);

-- Admin lê e edita todos os aluguéis
drop policy if exists "rentals_admin_all" on public.rentals;
create policy "rentals_admin_all"
  on public.rentals for all
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- STORAGE (capas de livros)
-- ═══════════════════════════════════════════════════════════════════

-- Público lê capas
drop policy if exists "book_covers_public_read" on storage.objects;
create policy "book_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'book-covers');

-- Só admin faz upload/atualiza/remove capas
drop policy if exists "book_covers_admin_write" on storage.objects;
create policy "book_covers_admin_write"
  on storage.objects for insert
  with check (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "book_covers_admin_update" on storage.objects;
create policy "book_covers_admin_update"
  on storage.objects for update
  using (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "book_covers_admin_delete" on storage.objects;
create policy "book_covers_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'book-covers' and public.is_admin());

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 3) migration_v2.sql                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Migração v2
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

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 4) rls-v2.sql                                                  │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — RLS v2 (novas tabelas)
-- ═══════════════════════════════════════════════════════════════════

alter table public.reservations enable row level security;
alter table public.notification_log enable row level security;

-- ═══════════════════════════════════════════════════════════════════
-- RESERVATIONS
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "reservations_select_own" on public.reservations;
create policy "reservations_select_own"
  on public.reservations for select
  using (auth.uid() = user_id);

drop policy if exists "reservations_admin_all" on public.reservations;
create policy "reservations_admin_all"
  on public.reservations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Inserts e updates são feitos via functions (create_reservation, cancel_reservation)
-- Não precisa policy de insert direto porque as SECURITY DEFINER funcs cuidam disso.

-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICATION_LOG
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "notifications_select_own" on public.notification_log;
create policy "notifications_select_own"
  on public.notification_log for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_admin_all" on public.notification_log;
create policy "notifications_admin_all"
  on public.notification_log for all
  using (public.is_admin())
  with check (public.is_admin());

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 5) migration_v3.sql                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Migração v3
-- Congelamento dos termos do contrato · Consentimento LGPD
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Congelar valores do contrato no momento do aceite ──────────
-- Problema que resolve: 'daily_fine_rate' já era gravado por locação,
-- mas o prazo (rental_days) e as taxas de dano/extravio eram lidas do
-- RENTAL_CONFIG "ao vivo" no momento da devolução — ou seja, se você
-- mudar o valor da taxa hoje, ela mudaria retroativamente até para
-- contratos assinados há meses. Agora tudo fica congelado no aceite.

alter table public.rentals
  add column if not exists rental_days int default 14 not null,
  add column if not exists damage_fee_rate numeric(10,2) default 50.00 not null,
  add column if not exists loss_fee_rate numeric(10,2) default 150.00 not null;

comment on column public.rentals.rental_days is
  'Prazo em dias vigente no momento do aceite do termo (congelado, não muda retroativamente)';
comment on column public.rentals.damage_fee_rate is
  'Taxa de dano vigente no momento do aceite (congelada)';
comment on column public.rentals.loss_fee_rate is
  'Taxa de extravio/reposição vigente no momento do aceite (congelada)';

-- ── 2. Consentimento LGPD ──────────────────────────────────────────
alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz;

comment on column public.profiles.privacy_accepted_at is
  'Timestamp do aceite da Política de Privacidade no cadastro (LGPD)';

-- Atualiza o trigger de criação de perfil para também gravar o aceite
-- (o front-end manda esse dado em raw_user_meta_data no momento do signUp)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, privacy_accepted_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Leitor'),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'privacy_accepted_at', '')::timestamptz
  );
  return new;
end;
$$;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 6) migration_v4.sql                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Migração v4
-- Configurações do sistema (editáveis pelo admin, sem precisar de deploy)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.settings (
  id int primary key default 1,
  max_books_per_rental int default 3 not null,
  rental_days int default 14 not null,
  daily_fine numeric(10,2) default 2.00 not null,
  damage_fee numeric(10,2) default 50.00 not null,
  loss_fee numeric(10,2) default 150.00 not null,
  store_name text default 'Estande Livre' not null,
  store_address text,
  store_phone text,
  store_hours text,
  updated_at timestamptz default now() not null,

  constraint settings_singleton check (id = 1)
);

comment on table public.settings is
  'Linha única (id=1) com as configurações vigentes do sistema. Locações já
   criadas NÃO são afetadas por mudanças aqui — os valores ficam congelados
   por locação em rentals.rental_days / daily_fine_rate / damage_fee_rate /
   loss_fee_rate no momento do aceite do contrato.';

-- Garante que a linha singleton existe (idempotente)
insert into public.settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.settings enable row level security;

-- Todos leem (o site público precisa saber prazo/multa antes do checkout)
drop policy if exists "settings_read_all" on public.settings;
create policy "settings_read_all"
  on public.settings for select
  using (true);

-- Só admin edita
drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write"
  on public.settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 7) migration_v5.sql                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Migração v5
-- Checkout atômico (corrige corrida de disponibilidade) · Locação no balcão
-- ═══════════════════════════════════════════════════════════════════

-- ── Problema que resolve ───────────────────────────────────────────
-- O checkout antigo fazia, do lado do front-end: 1) insere a locação,
-- 2) chama decrement_available_copies. Entre os dois passos, duas pessoas
-- podiam "ganhar" o último exemplar de um livro ao mesmo tempo. Agora tudo
-- roda dentro de uma única transação no banco, com trava de linha
-- (FOR UPDATE) no livro — a segunda tentativa concorrente espera a
-- primeira terminar e então vê corretamente que não há mais cópias.

-- ── Checkout do próprio leitor (self-service) ──────────────────────
create or replace function public.create_checkout(
  book_ids uuid[],
  rental_days_input int,
  daily_fine_input numeric,
  damage_fee_input numeric,
  loss_fee_input numeric
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  bid uuid;
  avail int;
  book_title text;
  now_ts timestamptz := now();
  due timestamptz := now() + (rental_days_input || ' days')::interval;
  new_rental public.rentals;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  if array_length(book_ids, 1) is null then
    raise exception 'Sacola vazia';
  end if;

  foreach bid in array book_ids loop
    -- Trava a linha do livro até o fim da transação: qualquer outro
    -- checkout concorrente pro mesmo livro espera aqui.
    select available_copies, title into avail, book_title
    from public.books
    where id = bid
    for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;

    if avail <= 0 then
      raise exception 'O livro "%" acabou de ficar indisponível. Remova-o da sacola.', book_title;
    end if;

    update public.books
    set available_copies = available_copies - 1
    where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      daily_fine_rate, rental_days, damage_fee_rate, loss_fee_rate
    ) values (
      auth.uid(), bid, now_ts, due, 'active', now_ts,
      daily_fine_input, rental_days_input, damage_fee_input, loss_fee_input
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- ── Checkout assistido pelo admin (locação no balcão) ───────────────
-- Mesma lógica atômica, mas o admin registra em nome de outro leitor
-- (ex.: alguém que entrou na loja e não usou o site).
create or replace function public.admin_checkout(
  target_user_id uuid,
  book_ids uuid[],
  rental_days_input int,
  daily_fine_input numeric,
  damage_fee_input numeric,
  loss_fee_input numeric
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  bid uuid;
  avail int;
  book_title text;
  now_ts timestamptz := now();
  due timestamptz := now() + (rental_days_input || ' days')::interval;
  new_rental public.rentals;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar locação no balcão';
  end if;

  if array_length(book_ids, 1) is null then
    raise exception 'Selecione ao menos um livro';
  end if;

  foreach bid in array book_ids loop
    select available_copies, title into avail, book_title
    from public.books
    where id = bid
    for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;

    if avail <= 0 then
      raise exception 'O livro "%" não está mais disponível.', book_title;
    end if;

    update public.books
    set available_copies = available_copies - 1
    where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      daily_fine_rate, rental_days, damage_fee_rate, loss_fee_rate, notes
    ) values (
      target_user_id, bid, now_ts, due, 'active', now_ts,
      daily_fine_input, rental_days_input, damage_fee_input, loss_fee_input,
      'Registrado no balcão pelo admin'
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 8) seed.sql (opcional — categorias e livros de exemplo)        │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Seed data
-- Categorias iniciais e alguns livros de exemplo
-- ═══════════════════════════════════════════════════════════════════

-- Categorias
insert into public.categories (name, slug, description) values
  ('Ficção', 'ficcao', 'Romances, novelas e narrativas contemporâneas'),
  ('Filosofia', 'filosofia', 'Ensaios, tratados e obras filosóficas'),
  ('História', 'historia', 'Biografias e narrativas históricas'),
  ('Poesia', 'poesia', 'Coletâneas e obras poéticas'),
  ('Ciências', 'ciencias', 'Divulgação científica e ensaios'),
  ('Clássicos', 'classicos', 'Obras da tradição literária universal'),
  ('Ensaio', 'ensaio', 'Ensaios contemporâneos e crítica'),
  ('Infantojuvenil', 'infantojuvenil', 'Livros para jovens leitores')
on conflict (slug) do nothing;

-- Livros de exemplo
-- (Substitua as URLs de capas por imagens reais do seu Supabase Storage)
insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Grande Sertão: Veredas',
  'grande-sertao-veredas',
  'João Guimarães Rosa',
  'A saga de Riobaldo, jagunço do sertão mineiro, que narra suas aventuras, seus amores e o duelo com o Diabo pelo destino de sua alma. Uma das obras-primas da literatura brasileira, com uma linguagem que reinventa o português.',
  'Nova Fronteira',
  2019,
  624,
  (select id from public.categories where slug = 'classicos'),
  null,
  3, 3, true, 'GS-001'
where not exists (select 1 from public.books where slug = 'grande-sertao-veredas');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'O Idiota',
  'o-idiota',
  'Fiódor Dostoiévski',
  'O príncipe Míchkin volta à Rússia depois de anos em um sanatório suíço. Sua bondade extrema e sua ingenuidade o colocam em confronto com uma sociedade cínica.',
  'Editora 34',
  2011,
  680,
  (select id from public.categories where slug = 'classicos'),
  null,
  2, 2, true, 'ID-002'
where not exists (select 1 from public.books where slug = 'o-idiota');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Meditações',
  'meditacoes',
  'Marco Aurélio',
  'Anotações pessoais do imperador romano, escritas para si mesmo. Um dos textos fundamentais do estoicismo, reflexões sobre virtude, dever e a natureza humana.',
  'Companhia das Letras',
  2020,
  240,
  (select id from public.categories where slug = 'filosofia'),
  null,
  4, 4, true, 'MD-003'
where not exists (select 1 from public.books where slug = 'meditacoes');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'A Hora da Estrela',
  'a-hora-da-estrela',
  'Clarice Lispector',
  'A história de Macabéa, uma jovem nordestina que vive no Rio de Janeiro. O narrador Rodrigo S.M. constrói e questiona a existência de sua personagem.',
  'Rocco',
  2020,
  112,
  (select id from public.categories where slug = 'ficcao'),
  null,
  2, 2, false, 'HE-004'
where not exists (select 1 from public.books where slug = 'a-hora-da-estrela');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  '1984',
  '1984',
  'George Orwell',
  'Em uma Londres distópica, Winston Smith trabalha reescrevendo a história para o Partido. Sua rebelião silenciosa contra o Grande Irmão o leva a consequências que ele não pode prever.',
  'Companhia das Letras',
  2009,
  416,
  (select id from public.categories where slug = 'ficcao'),
  null,
  3, 2, true, 'NT-005'
where not exists (select 1 from public.books where slug = '1984');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Sapiens: Uma Breve História da Humanidade',
  'sapiens',
  'Yuval Noah Harari',
  'Um panorama da história do Homo sapiens, das savanas africanas à revolução tecnológica atual. Harari cruza biologia, antropologia e economia em uma narrativa provocativa.',
  'L&PM',
  2015,
  464,
  (select id from public.categories where slug = 'historia'),
  null,
  3, 3, false, 'SP-006'
where not exists (select 1 from public.books where slug = 'sapiens');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Antologia Poética',
  'antologia-poetica-drummond',
  'Carlos Drummond de Andrade',
  'Seleção de poemas do autor mineiro, cobrindo décadas de produção. Do irônico ao lírico, do social ao íntimo.',
  'Companhia das Letras',
  2012,
  296,
  (select id from public.categories where slug = 'poesia'),
  null,
  2, 2, false, 'AP-007'
where not exists (select 1 from public.books where slug = 'antologia-poetica-drummond');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'O Mundo Assombrado pelos Demônios',
  'o-mundo-assombrado',
  'Carl Sagan',
  'Um manifesto pelo pensamento cético e científico. Sagan defende a ciência como uma vela na escuridão do misticismo e da pseudociência.',
  'Companhia das Letras',
  2006,
  512,
  (select id from public.categories where slug = 'ciencias'),
  null,
  2, 2, false, 'MA-008'
where not exists (select 1 from public.books where slug = 'o-mundo-assombrado');

-- ═══════════════════════════════════════════════════════════════════
-- Como criar um admin
-- ═══════════════════════════════════════════════════════════════════
-- Depois de criar seu usuário pela interface, execute:
--
-- update public.profiles
-- set role = 'admin'
-- where email = 'seu-email@exemplo.com';
