-- =====================================================================
-- ESTANTE LIVRE — Fase 4: Auth + Regras de Negócio
-- Rode este script no SQL Editor do Supabase DEPOIS do schema.sql da Fase 1.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Sincronização automática: auth.users -> public.users
-- Sempre que alguém se cadastra via Supabase Auth, criamos o perfil
-- correspondente em public.users (necessário pois rentals.user_id
-- referencia public.users, não auth.users diretamente).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_on_auth_user_created on auth.users;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- 2. Índice de performance para o Admin Dashboard
-- (consulta frequente: aluguéis ativos ordenados por data de devolução)
-- ---------------------------------------------------------------------
create index if not exists idx_rentals_status_due on public.rentals (status, due_date);

-- ---------------------------------------------------------------------
-- 3. Como promover um usuário a administrador (rodar manualmente):
-- ---------------------------------------------------------------------
-- update public.users set role = 'admin' where email = 'seu-email@exemplo.com';
