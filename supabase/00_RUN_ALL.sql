-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — SCRIPT ÚNICO DE SETUP DO BANCO
-- ═══════════════════════════════════════════════════════════════════
--
-- Cole este arquivo INTEIRO no SQL Editor do Supabase e rode de uma vez.
-- Ele já contém, na ordem certa, tudo que foi construído até agora.
--
-- Seguro rodar de novo? Sim — cada trecho usa "if not exists",
-- "or replace", "on conflict do nothing", blocos DO com captura de
-- exceção para os enums, e DROP explícito antes de recriar funções/
-- views cuja assinatura mudou — então rodar este arquivo mais de uma
-- vez não deve quebrar nada nem duplicar dados.
--
-- O que NÃO está aqui (são passos manuais, fora do SQL Editor):
--   - Deploy das Edge Functions (notify-rentals, admin-create-reader)
--   - cron_setup.sql (precisa rodar DEPOIS de a Edge Function estar
--     deployada, e precisa que você troque os placeholders pelo seu
--     project ref e service role key)
--   - Configurações no painel (Site URL, SMTP, Captcha) — ver README.md
--
-- ⚠️ ATENÇÃO — migration_v6.sql semeia planos de preço com valores de
-- EXEMPLO. Revise e ajuste em /admin/planos-de-preco antes de valer
-- pra clientes de verdade.
-- ═══════════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 1) schema.sql                                                  │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Schema completo
-- Postgres/Supabase
-- ═══════════════════════════════════════════════════════════════════

-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────────────
-- Envolvido em bloco DO com captura de exceção porque o Postgres não
-- tem "CREATE TYPE IF NOT EXISTS" — sem isso, rodar o script uma segunda
-- vez quebra com "type already exists".
do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type rental_status as enum ('active', 'returned', 'damaged', 'lost');
exception when duplicate_object then null;
end $$;

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
-- ESTANTE LIVRE — Row Level Security (RLS)
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

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 4) rls-v2.sql                                                  │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — RLS v2 (novas tabelas)
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
-- ESTANTE LIVRE — Migração v3
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
-- ESTANTE LIVRE — Migração v4
-- Configurações do sistema (editáveis pelo admin, sem precisar de deploy)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.settings (
  id int primary key default 1,
  max_books_per_rental int default 3 not null,
  rental_days int default 14 not null,
  daily_fine numeric(10,2) default 2.00 not null,
  damage_fee numeric(10,2) default 50.00 not null,
  loss_fee numeric(10,2) default 150.00 not null,
  store_name text default 'Estante Livre' not null,
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
-- ESTANTE LIVRE — Migração v5
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
-- │ 8) migration_v6.sql                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v6
-- Planos de preço · Multa normal/reservada · Dano granular · Entrega
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. PLANOS DE PREÇO (por categoria de livro)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.pricing_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamptz default now() not null
);

create table if not exists public.pricing_plan_tiers (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.pricing_plans(id) on delete cascade,
  days int not null check (days > 0),
  price numeric(10,2) not null check (price >= 0),
  daily_fine_normal numeric(10,2) not null check (daily_fine_normal >= 0),
  daily_fine_reserved numeric(10,2) not null check (daily_fine_reserved >= 0),
  created_at timestamptz default now() not null,

  unique (plan_id, days)
);

comment on table public.pricing_plans is
  'Categorias de preço (ex: Padrão, Especial). Cada livro pertence a um plano.';
comment on table public.pricing_plan_tiers is
  'Opções de prazo dentro de um plano: X dias custa R$Y, multa normal e multa
   de livro reservado (aplicada quando há fila de espera ativa no atraso).';

alter table public.pricing_plans enable row level security;
alter table public.pricing_plan_tiers enable row level security;

drop policy if exists "pricing_plans_read_all" on public.pricing_plans;
create policy "pricing_plans_read_all" on public.pricing_plans for select using (true);
drop policy if exists "pricing_plans_admin_write" on public.pricing_plans;
create policy "pricing_plans_admin_write" on public.pricing_plans for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pricing_plan_tiers_read_all" on public.pricing_plan_tiers;
create policy "pricing_plan_tiers_read_all" on public.pricing_plan_tiers for select using (true);
drop policy if exists "pricing_plan_tiers_admin_write" on public.pricing_plan_tiers;
create policy "pricing_plan_tiers_admin_write" on public.pricing_plan_tiers for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Livros ganham plano de preço e valor de reposição ──────────────
alter table public.books
  add column if not exists pricing_plan_id uuid references public.pricing_plans(id) on delete set null,
  add column if not exists replacement_value numeric(10,2) default 0 not null;

comment on column public.books.replacement_value is
  'Valor de um exemplar novo — cobrado em caso de perda ou capa arrancada.';

-- ═══════════════════════════════════════════════════════════════════
-- 2. PLANOS COMBO (ex: 3 livros por 30 dias por R$50)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.combo_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  book_count int not null check (book_count > 0),
  days int not null check (days > 0),
  price numeric(10,2) not null check (price >= 0),
  active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table public.combo_plans enable row level security;
drop policy if exists "combo_plans_read_all" on public.combo_plans;
create policy "combo_plans_read_all" on public.combo_plans for select using (true);
drop policy if exists "combo_plans_admin_write" on public.combo_plans;
create policy "combo_plans_admin_write" on public.combo_plans for all
  using (public.is_admin()) with check (public.is_admin());

-- Um checkout de combo é UM pagamento (o preço não deve ser somado várias
-- vezes, uma por livro) — por isso vive numa tabela própria, e cada
-- locação do combo aponta pra ela.
create table if not exists public.combo_checkouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  combo_plan_id uuid not null references public.combo_plans(id) on delete restrict,
  price numeric(10,2) not null,
  paid boolean default false not null,
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz default now() not null
);

alter table public.combo_checkouts enable row level security;
drop policy if exists "combo_checkouts_select_own" on public.combo_checkouts;
create policy "combo_checkouts_select_own" on public.combo_checkouts for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "combo_checkouts_admin_write" on public.combo_checkouts;
create policy "combo_checkouts_admin_write" on public.combo_checkouts for update
  using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- 3. CONFIGURAÇÕES NOVAS (taxas de dano e multa padrão do combo)
-- ═══════════════════════════════════════════════════════════════════

alter table public.settings
  add column if not exists minor_damage_fee numeric(10,2) default 20.00 not null,
  add column if not exists lost_admin_fee numeric(10,2) default 15.00 not null,
  add column if not exists combo_daily_fine_normal numeric(10,2) default 1.75 not null,
  add column if not exists combo_daily_fine_reserved numeric(10,2) default 2.65 not null;

comment on column public.settings.minor_damage_fee is
  'Cobrança fixa para dano leve na capa (amassado/rasgo pequeno)';
comment on column public.settings.lost_admin_fee is
  'Taxa administrativa somada ao valor de reposição, em caso de perda ou capa arrancada';

-- ═══════════════════════════════════════════════════════════════════
-- 4. AMPLIAR RENTALS
-- ═══════════════════════════════════════════════════════════════════

alter table public.rentals
  add column if not exists pricing_tier_id uuid references public.pricing_plan_tiers(id) on delete set null,
  add column if not exists combo_checkout_id uuid references public.combo_checkouts(id) on delete set null,
  add column if not exists price numeric(10,2) default 0 not null,
  add column if not exists rental_paid boolean default false not null,
  add column if not exists rental_paid_at timestamptz,
  add column if not exists rental_payment_method text,
  add column if not exists renewal_days int,
  add column if not exists daily_fine_normal numeric(10,2),
  add column if not exists daily_fine_reserved numeric(10,2),
  add column if not exists fine_used_reserved_rate boolean default false not null,
  add column if not exists damage_type text, -- 'minor_cover' | 'torn_cover' | 'lost'
  add column if not exists resolved_at timestamptz,
  add column if not exists delivery_method text default 'pickup' not null, -- 'pickup' | 'delivery'
  add column if not exists delivery_address text;

comment on column public.rentals.price is
  'Preço da locação (congelado no checkout). Fica 0 se fizer parte de um
   combo — nesse caso o valor vive em combo_checkouts, pra não contar
   3x o preço de um pacote de 3 livros.';
comment on column public.rentals.renewal_days is
  'Dias de renovação escolhidos pelo leitor no momento do checkout —
   usado como padrão quando ele renovar de fato.';
comment on column public.rentals.fine_used_reserved_rate is
  'Qual taxa de multa foi aplicada (normal ou reservada) — travada no
   momento da devolução/classificação, junto com resolved_at.';
comment on column public.rentals.resolved_at is
  'Quando a pendência (multa + reposição/dano) foi totalmente quitada.
   Enquanto for nulo em locações danificadas/perdidas, a multa de atraso
   continua sendo calculada dinamicamente até hoje.';

-- ═══════════════════════════════════════════════════════════════════
-- 5. RPCs DE CHECKOUT (substituem as da migration_v5)
-- ═══════════════════════════════════════════════════════════════════

-- Checkout normal — cada livro com seu próprio prazo/tier escolhido
-- items: [{"book_id": "...", "pricing_tier_id": "...", "renewal_days": 7}, ...]
-- A assinatura mudou (agora recebe um jsonb com prazo por livro, em vez de
-- um prazo único pra todos) — sem o DROP explícito, o Postgres criaria uma
-- SEGUNDA função com esse nome ao lado da antiga, em vez de substituir, e
-- isso confundiria o Supabase na hora de decidir qual chamar.
drop function if exists public.create_checkout(uuid[], int, numeric, numeric, numeric);

create or replace function public.create_checkout(
  items jsonb,
  delivery_method text default 'pickup',
  delivery_address text default null
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  item jsonb;
  bid uuid;
  tier_id uuid;
  ren_days int;
  avail int;
  book_title text;
  book_plan_id uuid;
  tier public.pricing_plan_tiers;
  now_ts timestamptz := now();
  new_rental public.rentals;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Sacola vazia';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    bid := (item->>'book_id')::uuid;
    tier_id := (item->>'pricing_tier_id')::uuid;
    ren_days := coalesce((item->>'renewal_days')::int, 0);

    select available_copies, title, pricing_plan_id into avail, book_title, book_plan_id
    from public.books where id = bid for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;
    if avail <= 0 then
      raise exception 'O livro "%" acabou de ficar indisponível.', book_title;
    end if;

    select * into tier from public.pricing_plan_tiers
    where id = tier_id and plan_id = book_plan_id;
    if tier.id is null then
      raise exception 'Período inválido para o livro "%".', book_title;
    end if;

    update public.books set available_copies = available_copies - 1 where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      pricing_tier_id, price, rental_days, renewal_days,
      daily_fine_normal, daily_fine_reserved,
      damage_fee_rate, loss_fee_rate,
      delivery_method, delivery_address
    ) values (
      auth.uid(), bid, now_ts, now_ts + (tier.days || ' days')::interval, 'active', now_ts,
      tier.id, tier.price, tier.days, ren_days,
      tier.daily_fine_normal, tier.daily_fine_reserved,
      0, 0, -- valor de dano agora é calculado na devolução (replacement_value do livro + taxas)
      delivery_method, delivery_address
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- Checkout combo — N livros por um preço fixo total (não soma por livro)
create or replace function public.create_combo_checkout(
  combo_plan_id_input uuid,
  book_ids uuid[],
  renewal_days_input int default 0,
  delivery_method text default 'pickup',
  delivery_address text default null
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  combo public.combo_plans;
  bid uuid;
  avail int;
  book_title text;
  checkout_id uuid;
  now_ts timestamptz := now();
  due timestamptz;
  new_rental public.rentals;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  select * into combo from public.combo_plans where id = combo_plan_id_input and active;
  if combo.id is null then
    raise exception 'Combo não encontrado ou inativo';
  end if;

  if array_length(book_ids, 1) is distinct from combo.book_count then
    raise exception 'Este combo exige exatamente % livro(s).', combo.book_count;
  end if;

  due := now_ts + (combo.days || ' days')::interval;

  insert into public.combo_checkouts (user_id, combo_plan_id, price)
  values (auth.uid(), combo.id, combo.price)
  returning id into checkout_id;

  foreach bid in array book_ids loop
    select available_copies, title into avail, book_title
    from public.books where id = bid for update;

    if avail is null then
      raise exception 'Livro não encontrado';
    end if;
    if avail <= 0 then
      raise exception 'O livro "%" acabou de ficar indisponível.', book_title;
    end if;

    update public.books set available_copies = available_copies - 1 where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      combo_checkout_id, price, rental_days, renewal_days,
      daily_fine_normal, daily_fine_reserved,
      damage_fee_rate, loss_fee_rate,
      delivery_method, delivery_address
    )
    select
      auth.uid(), bid, now_ts, due, 'active', now_ts,
      checkout_id, 0, combo.days, renewal_days_input,
      s.combo_daily_fine_normal, s.combo_daily_fine_reserved,
      0, 0,
      delivery_method, delivery_address
    from public.settings s where s.id = 1
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- ── Versões "no balcão" (admin registra em nome de outro leitor) ───
-- Mesmo motivo do create_checkout acima: assinatura mudou, precisa dropar
-- a versão antiga explicitamente pra não sobrar duas funções com esse nome.
drop function if exists public.admin_checkout(uuid, uuid[], int, numeric, numeric, numeric);

create or replace function public.admin_checkout(
  target_user_id uuid,
  items jsonb,
  delivery_method text default 'pickup',
  delivery_address text default null
)
returns setof public.rentals
language plpgsql
security definer
as $$
declare
  item jsonb;
  bid uuid;
  tier_id uuid;
  ren_days int;
  avail int;
  book_title text;
  book_plan_id uuid;
  tier public.pricing_plan_tiers;
  now_ts timestamptz := now();
  new_rental public.rentals;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar locação no balcão';
  end if;

  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Selecione ao menos um livro';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    bid := (item->>'book_id')::uuid;
    tier_id := (item->>'pricing_tier_id')::uuid;
    ren_days := coalesce((item->>'renewal_days')::int, 0);

    select available_copies, title, pricing_plan_id into avail, book_title, book_plan_id
    from public.books where id = bid for update;

    if avail is null then raise exception 'Livro não encontrado'; end if;
    if avail <= 0 then raise exception 'O livro "%" não está mais disponível.', book_title; end if;

    select * into tier from public.pricing_plan_tiers
    where id = tier_id and plan_id = book_plan_id;
    if tier.id is null then
      raise exception 'Período inválido para o livro "%".', book_title;
    end if;

    update public.books set available_copies = available_copies - 1 where id = bid;

    insert into public.rentals (
      user_id, book_id, rented_at, due_date, status, terms_accepted_at,
      pricing_tier_id, price, rental_days, renewal_days,
      daily_fine_normal, daily_fine_reserved,
      damage_fee_rate, loss_fee_rate,
      delivery_method, delivery_address, notes
    ) values (
      target_user_id, bid, now_ts, now_ts + (tier.days || ' days')::interval, 'active', now_ts,
      tier.id, tier.price, tier.days, ren_days,
      tier.daily_fine_normal, tier.daily_fine_reserved,
      0, 0,
      delivery_method, delivery_address, 'Registrado no balcão pelo admin'
    )
    returning * into new_rental;

    return next new_rental;
  end loop;

  return;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. RENOVAÇÃO — usa os dias escolhidos no checkout, não mais um padrão
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.renew_rental(rental_id_input uuid, extension_days int default null)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  days_to_add int;
begin
  select * into r from public.rentals where id = rental_id_input for update;

  if r.id is null then
    raise exception 'Empréstimo não encontrado';
  end if;
  if r.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissão para renovar este empréstimo';
  end if;
  if r.status <> 'active' then
    raise exception 'Só é possível renovar empréstimos em curso';
  end if;
  if r.due_date < now() then
    raise exception 'Empréstimo em atraso não pode ser renovado — regularize primeiro';
  end if;
  if r.renewals_count >= r.max_renewals then
    raise exception 'Limite de renovações já utilizado';
  end if;
  if exists (
    select 1 from public.reservations
    where book_id = r.book_id and status in ('waiting', 'notified')
  ) then
    raise exception 'Há leitores na fila de espera — não é possível renovar';
  end if;

  -- Usa os dias de renovação escolhidos no checkout, a não ser que um
  -- valor explícito seja passado (ex.: ajuste manual do admin).
  days_to_add := coalesce(extension_days, nullif(r.renewal_days, 0), r.rental_days, 14);

  update public.rentals
  set due_date = due_date + (days_to_add || ' days')::interval,
      renewals_count = renewals_count + 1
  where id = rental_id_input
  returning * into r;

  return r;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. DEVOLUÇÃO COM DANO GRANULAR
-- ═══════════════════════════════════════════════════════════════════

-- Substitui o fluxo antigo de devolução: agora recebe uma "condição"
-- granular e calcula as cobranças de acordo com as regras de negócio.
-- condition: 'ok' | 'minor_cover' | 'torn_cover' | 'lost'
create or replace function public.process_return(
  rental_id_input uuid,
  condition text,
  admin_notes text default null
)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  b public.books;
  s public.settings;
  applicable_rate numeric;
  has_reservation boolean;
  computed_late_fee numeric;
  new_status public.rental_status;
  new_damage_fee numeric := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar devoluções';
  end if;

  select * into r from public.rentals where id = rental_id_input for update;
  if r.id is null then raise exception 'Empréstimo não encontrado'; end if;

  select * into b from public.books where id = r.book_id;
  select * into s from public.settings where id = 1;

  -- Verifica se há fila de espera ativa AGORA para decidir a taxa de multa
  select exists(
    select 1 from public.reservations
    where book_id = r.book_id and status in ('waiting', 'notified')
  ) into has_reservation;

  applicable_rate := case
    when has_reservation then coalesce(r.daily_fine_reserved, r.daily_fine_rate)
    else coalesce(r.daily_fine_normal, r.daily_fine_rate)
  end;

  computed_late_fee := greatest(0, extract(day from (now() - r.due_date)))::numeric * coalesce(applicable_rate, 0);

  case condition
    when 'ok' then
      new_status := 'returned';
      new_damage_fee := 0;
      update public.books set available_copies = least(total_copies, available_copies + 1) where id = r.book_id;
    when 'minor_cover' then
      new_status := 'damaged';
      new_damage_fee := coalesce(s.minor_damage_fee, 20);
      update public.books set available_copies = least(total_copies, available_copies + 1) where id = r.book_id;
    when 'torn_cover' then
      new_status := 'lost'; -- capa arrancada = livro sai do acervo, mesma regra de perda
      new_damage_fee := coalesce(b.replacement_value, 0) + coalesce(s.lost_admin_fee, 15);
      -- não volta ao estoque
    when 'lost' then
      new_status := 'lost';
      new_damage_fee := coalesce(b.replacement_value, 0) + coalesce(s.lost_admin_fee, 15);
      -- não volta ao estoque
    else
      raise exception 'Condição inválida: %', condition;
  end case;

  update public.rentals
  set status = new_status,
      returned_at = now(),
      damage_type = case when condition = 'ok' then null else condition end,
      damage_fee = new_damage_fee,
      late_fee = computed_late_fee,
      fine_used_reserved_rate = has_reservation,
      -- Devolução limpa (sem dano/perda) resolve tudo na hora, já que não
      -- há pendência de reposição — só falta cobrar a multa, se houver.
      resolved_at = case when condition = 'ok' then now() else null end,
      notes = coalesce(admin_notes, notes)
  where id = rental_id_input
  returning * into r;

  return r;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 8. PAGAMENTO — recalcula a multa em aberto na hora de quitar,
--    e marca "resolvido" quando não sobra mais pendência
-- ═══════════════════════════════════════════════════════════════════

-- Assinatura mudou (ganhou o parâmetro pay_rental) — drop explícito da
-- versão antiga pelo mesmo motivo das funções de checkout acima.
drop function if exists public.register_payment(uuid, boolean, boolean, text, text);

create or replace function public.register_payment(
  rental_id_input uuid,
  pay_late boolean default true,
  pay_damage boolean default true,
  pay_rental boolean default false,
  method text default 'cash',
  notes_input text default null
)
returns public.rentals
language plpgsql
security definer
as $$
declare
  r public.rentals;
  applicable_rate numeric;
  computed_late_fee numeric;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar pagamentos';
  end if;

  select * into r from public.rentals where id = rental_id_input for update;
  if r.id is null then raise exception 'Empréstimo não encontrado'; end if;

  -- Locações danificadas/perdidas ainda não resolvidas: a multa continua
  -- crescendo dia a dia. Ao dar baixa agora, trava o valor no que está
  -- devido hoje — é isso que "resolve" a pendência.
  if pay_late and not r.late_fee_paid then
    if r.status in ('damaged', 'lost') and r.resolved_at is null then
      applicable_rate := case
        when r.fine_used_reserved_rate then coalesce(r.daily_fine_reserved, r.daily_fine_rate)
        else coalesce(r.daily_fine_normal, r.daily_fine_rate)
      end;
      computed_late_fee := greatest(0, extract(day from (now() - r.due_date)))::numeric * coalesce(applicable_rate, 0);
      update public.rentals set late_fee = computed_late_fee where id = rental_id_input;
    end if;
    update public.rentals set late_fee_paid = true where id = rental_id_input;
  end if;

  if pay_damage and not r.damage_fee_paid then
    update public.rentals set damage_fee_paid = true where id = rental_id_input;
  end if;

  if pay_rental and not r.rental_paid then
    update public.rentals set rental_paid = true, rental_paid_at = now() where id = rental_id_input;
  end if;

  update public.rentals
  set paid_at = now(),
      payment_method = method,
      payment_notes = coalesce(notes_input, payment_notes),
      updated_at = now()
  where id = rental_id_input
  returning * into r;

  -- Fecha a pendência definitivamente quando multa e dano (se houver)
  -- já estiverem quitados.
  if r.status in ('damaged', 'lost') and r.resolved_at is null
     and r.late_fee_paid
     and (r.damage_fee = 0 or r.damage_fee_paid) then
    update public.rentals set resolved_at = now() where id = rental_id_input
    returning * into r;
  end if;

  return r;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 9. reader_stats — agora considera também o preço do aluguel em aberto
-- ═══════════════════════════════════════════════════════════════════

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
      coalesce(sum(case when rental_paid then price else 0 end), 0) +
      coalesce(sum(case when late_fee_paid then late_fee else 0 end), 0) +
      coalesce(sum(case when damage_fee_paid then damage_fee else 0 end), 0) as paid,
      coalesce(sum(case when not rental_paid then price else 0 end), 0) +
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

-- ═══════════════════════════════════════════════════════════════════
-- 10. Ajustar view financeira pra incluir o preço do aluguel em aberto
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 11. Seed dos planos de preço (valores de exemplo — REVISE no admin!)
-- ═══════════════════════════════════════════════════════════════════
-- O documento de regras deu "exemplos" de valores, não um mapeamento
-- exato de qual multa cai em qual prazo. Os números abaixo são um
-- pareamento razoável pra você já sair testando — mas confira e ajuste
-- em /admin/planos-de-preco, porque foi uma interpretação, não uma
-- transcrição literal do que você pediu.

insert into public.pricing_plans (name, description)
values
  ('Padrão', 'Livros mais em conta'),
  ('Especial — Tolkien & C. S. Lewis', 'Livros mais caros')
on conflict (name) do nothing;

insert into public.pricing_plan_tiers (plan_id, days, price, daily_fine_normal, daily_fine_reserved)
select id, 7, 5.00, 0.75, 1.50 from public.pricing_plans where name = 'Padrão'
union all
select id, 14, 10.00, 1.00, 1.75 from public.pricing_plans where name = 'Padrão'
union all
select id, 21, 15.00, 1.50, 2.00 from public.pricing_plans where name = 'Padrão'
union all
select id, 30, 20.00, 1.75, 2.20 from public.pricing_plans where name = 'Padrão'
on conflict (plan_id, days) do nothing;

insert into public.pricing_plan_tiers (plan_id, days, price, daily_fine_normal, daily_fine_reserved)
select id, 10, 10.00, 1.00, 2.00 from public.pricing_plans where name = 'Especial — Tolkien & C. S. Lewis'
union all
select id, 20, 20.00, 1.50, 2.40 from public.pricing_plans where name = 'Especial — Tolkien & C. S. Lewis'
union all
select id, 30, 26.00, 1.75, 2.65 from public.pricing_plans where name = 'Especial — Tolkien & C. S. Lewis'
on conflict (plan_id, days) do nothing;

insert into public.combo_plans (name, book_count, days, price)
select '3 livros por 30 dias', 3, 30, 50.00
where not exists (select 1 from public.combo_plans where name = '3 livros por 30 dias');

-- Livros já cadastrados sem plano de preço ganham o plano "Padrão", pra
-- não travar o checkout enquanto você distribui os planos certos.
update public.books
set pricing_plan_id = (select id from public.pricing_plans where name = 'Padrão')
where pricing_plan_id is null;

-- DROP + CREATE em vez de "or replace": o Postgres não permite mudar a
-- ordem/nome de colunas de uma view existente com "or replace" — só
-- adicionar colunas no final. Como aqui a ordem muda (price entra no
-- meio), precisa recriar a view do zero.
drop view if exists public.financial_pending_view;

create view public.financial_pending_view as
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
  r.price,
  r.rental_paid,
  r.late_fee,
  r.late_fee_paid,
  r.damage_fee,
  r.damage_fee_paid,
  r.resolved_at,
  case when not r.rental_paid then r.price else 0 end +
  case when not r.late_fee_paid then r.late_fee else 0 end +
  case when not r.damage_fee_paid then r.damage_fee else 0 end as pending_amount
from public.rentals r
join public.profiles p on p.id = r.user_id
join public.books b on b.id = r.book_id
where (
    (r.price > 0 and not r.rental_paid) or
    (r.late_fee > 0 and not r.late_fee_paid) or
    (r.damage_fee > 0 and not r.damage_fee_paid)
  );

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 9) migration_v7.sql                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Migração v7
-- WhatsApp e Instagram da loja
-- ═══════════════════════════════════════════════════════════════════

alter table public.settings
  add column if not exists whatsapp_number text,
  add column if not exists instagram_url text;

comment on column public.settings.whatsapp_number is
  'Número de WhatsApp da loja, com DDI e DDD, só dígitos ou com formatação
   — a formatação é limpa automaticamente no front-end ao montar o link
   de contato (wa.me).';
comment on column public.settings.instagram_url is
  'Link completo do perfil do Instagram da loja.';

-- Preenche a linha já existente com os valores atuais — "alter ... add
-- column ... default" só vale pra linhas novas, não afeta a linha
-- singleton (id=1) que você já tem.
update public.settings
set
  whatsapp_number = coalesce(nullif(whatsapp_number, ''), '+55 91 9153-4970'),
  instagram_url = coalesce(nullif(instagram_url, ''), 'https://www.instagram.com/estantelivre.locadora/')
where id = 1;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 10) seed.sql (opcional — categorias e livros de exemplo)       │
-- └─────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Seed data
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
