-- =====================================================================
-- ESTANTE LIVRE — P0: Segurança (RLS) + Regras de Negócio no Banco
-- Rode DEPOIS de schema.sql, phase4_auth_sync.sql e phase5_contracts_fees.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CORREÇÃO CRÍTICA: um usuário comum podia se autopromover a admin.
--
-- A policy "users_update_own_or_admin" permitia UPDATE na própria linha,
-- mas sem validar QUAIS colunas mudavam. Como o `id` não muda, a policy
-- continuava satisfeita mesmo trocando role='customer' para role='admin'.
--
-- Correção: trigger que bloqueia qualquer mudança de `role` feita por
-- quem não é admin.
-- ---------------------------------------------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger as $$
begin
  -- Só bloqueia quando existe um usuário autenticado (auth.uid() preenchido)
  -- tentando mudar a própria role sozinho. Contextos de confiança total
  -- (SQL Editor, service role, migrations) têm auth.uid() = NULL e
  -- continuam liberados — necessário para o bootstrap do primeiro admin.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Você não tem permissão para alterar o campo role.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_prevent_role_escalation on public.users;

create trigger trg_prevent_role_escalation
  before update on public.users
  for each row execute function public.prevent_role_self_escalation();

-- Reforça o mesmo cuidado no INSERT (perfil sempre nasce como 'customer').
drop policy if exists "users_insert_self" on public.users;

create policy "users_insert_self"
  on public.users for insert
  with check (auth.uid() = id and role = 'customer');

-- ---------------------------------------------------------------------
-- 2. CORREÇÃO CRÍTICA: leitor podia "confirmar a própria devolução".
--
-- A policy "rentals_update_own_or_admin" permitia que o dono do aluguel
-- alterasse QUALQUER coluna da própria linha — inclusive status,
-- due_date, total_price e late_fee_accumulated. Ou seja, um leitor mal
-- intencionado podia marcar o próprio aluguel como devolvido (e recuperar
-- o estoque) sem que o livro tivesse voltado fisicamente, ou zerar sua
-- própria multa.
--
-- Correção: só admin pode fazer UPDATE em rentals. Leitores só podem
-- criar (checkout) e ler os próprios registros.
-- ---------------------------------------------------------------------
drop policy if exists "rentals_update_own_or_admin" on public.rentals;

create policy "rentals_update_admin_only"
  on public.rentals for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Regra de negócio no banco: máximo de 3 aluguéis ativos por leitor.
--
-- Antes, essa regra só existia no Zustand (front-end) e podia ser
-- ignorada com uma chamada direta à API. Agora o próprio trigger que já
-- debita o estoque (Fase 1) também barra o 4º aluguel simultâneo,
-- usando `active_rentals_count` com FOR UPDATE para evitar race condition
-- em checkouts concorrentes.
-- ---------------------------------------------------------------------
create or replace function public.handle_rental_insert()
returns trigger as $$
declare
  current_active_count integer;
begin
  select active_rentals_count into current_active_count
  from public.users
  where id = new.user_id
  for update; -- trava a linha do usuário até o fim da transação

  if current_active_count is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if current_active_count >= 3 then
    raise exception 'Limite de 3 livros alugados simultaneamente atingido.';
  end if;

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

-- ---------------------------------------------------------------------
-- 4. Regra de negócio no banco: due_date e total_price NUNCA vêm do
-- cliente. Antes, o front-end calculava e enviava esses valores — um
-- request manipulado à API poderia mandar due_date no passado (fugindo
-- de multa) ou total_price = 0. Agora o banco sempre recalcula,
-- ignorando o que veio no INSERT. Também garante que terms_accepted_at
-- foi realmente enviado.
-- ---------------------------------------------------------------------
create or replace function public.set_rental_defaults()
returns trigger as $$
declare
  book_daily_price numeric(10, 2);
begin
  if new.terms_accepted_at is null then
    raise exception 'É necessário aceitar os Termos de Locação para alugar.';
  end if;

  new.due_date := current_date + 14;

  select daily_rental_price into book_daily_price
  from public.books
  where id = new.book_id;

  new.total_price := coalesce(book_daily_price, 0) * 14;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_rental_set_defaults on public.rentals;

create trigger trg_rental_set_defaults
  before insert on public.rentals
  for each row execute function public.set_rental_defaults();

-- =====================================================================
-- Resumo do que mudou:
--  - Ninguém além de admin consegue mudar `role` ou atualizar `rentals`.
--  - Limite de 3 aluguéis simultâneos é validado no banco, não só no front.
--  - due_date e total_price são sempre recalculados pelo servidor.
-- =====================================================================
