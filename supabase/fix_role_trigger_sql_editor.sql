-- =====================================================================
-- ESTANTE LIVRE — Correção: trigger de proteção de `role` bloqueava até
-- o SQL Editor (bootstrap do primeiro admin).
--
-- Causa: `prevent_role_self_escalation()` chamava `is_admin()`, que
-- depende de `auth.uid()`. No SQL Editor / conexões via service role
-- não existe usuário autenticado no contexto — `auth.uid()` vem NULL —
-- então `is_admin()` sempre retornava falso e a troca de role era
-- barrada mesmo sendo você, o dono do projeto, rodando o comando.
--
-- Correção: só bloquear quando EXISTIR um usuário autenticado tentando
-- mudar a própria role sozinho (auth.uid() preenchido e não-admin).
-- Contextos de confiança total (SQL Editor, service role, migrations)
-- têm auth.uid() = NULL e continuam liberados — a brecha de segurança
-- original (cliente comum se autopromovendo via API) continua fechada,
-- porque nesse caso auth.uid() sempre vem preenchido com o id do
-- usuário logado.
-- =====================================================================

create or replace function public.prevent_role_self_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Você não tem permissão para alterar o campo role.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- O trigger já existe (criado em p0_security_and_rules.sql) e aponta
-- para esta função — como usamos CREATE OR REPLACE, não é preciso
-- recriar o trigger, só a função já resolve.

-- ---------------------------------------------------------------------
-- Agora rode de novo o comando que falhou:
-- ---------------------------------------------------------------------
-- update public.users set role = 'admin' where email = 'frazaoneto307@gmail.com';
