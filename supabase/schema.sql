-- =====================================================================
-- ESTANTE LIVRE — Schema inicial (Fase 1)
-- Plataforma de aluguel de livros
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensões necessárias
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. USERS
-- Estende auth.users do Supabase com dados de perfil da locadora.
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  active_rentals_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Perfis de usuários (clientes e administradores) da Estante Livre';

-- ---------------------------------------------------------------------
-- 2. CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.categories is 'Categorias/gêneros literários dos livros';

-- ---------------------------------------------------------------------
-- 3. BOOKS
-- Controle de acervo com cópias totais x disponíveis.
-- ---------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  isbn text unique,
  synopsis text,
  cover_url text,
  category_id uuid references public.categories (id) on delete set null,
  publisher text,
  published_year integer,
  language text default 'pt-BR',
  total_copies integer not null default 1 check (total_copies >= 0),
  available_copies integer not null default 1 check (available_copies >= 0),
  daily_rental_price numeric(10, 2) not null default 0 check (daily_rental_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint available_lte_total check (available_copies <= total_copies)
);

comment on table public.books is 'Acervo de livros disponíveis para aluguel';
create index if not exists idx_books_category on public.books (category_id);
create index if not exists idx_books_title on public.books using gin (to_tsvector('portuguese', title));

-- ---------------------------------------------------------------------
-- 4. RENTALS
-- Empréstimos com data prevista de devolução e devolução efetiva.
-- ---------------------------------------------------------------------
create table if not exists public.rentals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete restrict,
  rented_at timestamptz not null default now(),
  due_date date not null,
  returned_at timestamptz,
  status text not null default 'active' check (status in ('active', 'returned', 'overdue', 'cancelled')),
  total_price numeric(10, 2) not null default 0 check (total_price >= 0),
  late_fee numeric(10, 2) not null default 0 check (late_fee >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rentals is 'Histórico e controle de empréstimos de livros';
create index if not exists idx_rentals_user on public.rentals (user_id);
create index if not exists idx_rentals_book on public.rentals (book_id);
create index if not exists idx_rentals_status on public.rentals (status);

-- ---------------------------------------------------------------------
-- TRIGGERS: updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

create trigger trg_rentals_updated_at before update on public.rentals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- TRIGGER: ajustar available_copies ao criar/devolver aluguel
-- ---------------------------------------------------------------------
create or replace function public.handle_rental_insert()
returns trigger as $$
begin
  update public.books
    set available_copies = available_copies - 1
    where id = new.book_id and available_copies > 0;

  if not found then
    raise exception 'Não há cópias disponíveis para este livro';
  end if;

  update public.users
    set active_rentals_count = active_rentals_count + 1
    where id = new.user_id;

  return new;
end;
$$ language plpgsql;

create trigger trg_rental_insert
  after insert on public.rentals
  for each row execute function public.handle_rental_insert();

create or replace function public.handle_rental_return()
returns trigger as $$
begin
  if old.status = 'active' and new.status = 'returned' then
    update public.books
      set available_copies = available_copies + 1
      where id = new.book_id;

    update public.users
      set active_rentals_count = greatest(active_rentals_count - 1, 0)
      where id = new.user_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_rental_return
  after update on public.rentals
  for each row execute function public.handle_rental_return();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.rentals enable row level security;

-- Função helper: verifica se o usuário logado é admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- USERS: usuário vê/edita o próprio perfil; admin vê/edita tudo
-- ---------------------------------------------------------------------
create policy "users_select_own_or_admin"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "users_update_own_or_admin"
  on public.users for update
  using (auth.uid() = id or public.is_admin());

create policy "users_insert_self"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_delete_admin_only"
  on public.users for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- CATEGORIES: leitura pública, escrita apenas admin
-- ---------------------------------------------------------------------
create policy "categories_select_public"
  on public.categories for select
  using (true);

create policy "categories_write_admin_only"
  on public.categories for insert
  with check (public.is_admin());

create policy "categories_update_admin_only"
  on public.categories for update
  using (public.is_admin());

create policy "categories_delete_admin_only"
  on public.categories for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- BOOKS: leitura pública, escrita apenas admin
-- ---------------------------------------------------------------------
create policy "books_select_public"
  on public.books for select
  using (true);

create policy "books_insert_admin_only"
  on public.books for insert
  with check (public.is_admin());

create policy "books_update_admin_only"
  on public.books for update
  using (public.is_admin());

create policy "books_delete_admin_only"
  on public.books for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- RENTALS: usuário vê/cria os próprios aluguéis; admin vê/gerencia tudo
-- ---------------------------------------------------------------------
create policy "rentals_select_own_or_admin"
  on public.rentals for select
  using (auth.uid() = user_id or public.is_admin());

create policy "rentals_insert_own_or_admin"
  on public.rentals for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "rentals_update_own_or_admin"
  on public.rentals for update
  using (auth.uid() = user_id or public.is_admin());

create policy "rentals_delete_admin_only"
  on public.rentals for delete
  using (public.is_admin());

-- =====================================================================
-- SEED básico de categorias (opcional, útil para desenvolvimento)
-- =====================================================================
insert into public.categories (name, slug, description) values
  ('Romance', 'romance', 'Histórias de amor e relações humanas'),
  ('Ficção Científica', 'ficcao-cientifica', 'Futuro, tecnologia e especulação'),
  ('Clássicos', 'classicos', 'Obras consagradas da literatura'),
  ('Fantasia', 'fantasia', 'Mundos e criaturas imaginárias'),
  ('Biografias', 'biografias', 'Histórias de vidas reais'),
  ('História', 'historia', 'Fatos e narrativas históricas')
on conflict (slug) do nothing;
