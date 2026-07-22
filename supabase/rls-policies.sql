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
