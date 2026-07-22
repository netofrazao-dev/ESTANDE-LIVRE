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
