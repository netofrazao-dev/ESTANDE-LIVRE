-- =====================================================================
-- ESTANTE LIVRE — Storage: capas de livros
-- Rode DEPOIS de todos os scripts anteriores (schema, auth_sync,
-- contracts_fees, p0_security_and_rules).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bucket público para capas de livros.
-- `public = true` porque a capa precisa aparecer no catálogo sem exigir
-- login — mas a ESCRITA (upload/edição/remoção) fica restrita a admin
-- pelas policies abaixo.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Policies em storage.objects (RLS já vem habilitado por padrão
-- nessa tabela do Supabase).
-- ---------------------------------------------------------------------
drop policy if exists "book_covers_public_read" on storage.objects;
create policy "book_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'book-covers');

drop policy if exists "book_covers_admin_insert" on storage.objects;
create policy "book_covers_admin_insert"
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

-- =====================================================================
-- Resultado: qualquer visitante pode VER as capas (necessário pro
-- catálogo público), mas só admin pode enviar, substituir ou apagar
-- arquivos do bucket "book-covers".
-- =====================================================================
