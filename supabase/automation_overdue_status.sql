-- =====================================================================
-- ESTANTE LIVRE — Automação: status "atrasado"
-- Rode DEPOIS de todos os scripts anteriores.
--
-- Requer a extensão pg_cron habilitada no projeto (Database → Extensions
-- → pg_cron, no painel do Supabase). Em projetos Supabase ela já vem
-- disponível para ativação com um clique — não precisa instalar nada.
-- =====================================================================

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- 1. Função que varre os aluguéis ativos e marca como 'overdue' os que
-- passaram da due_date. Idempotente: rodar várias vezes não tem efeito
-- colateral.
-- ---------------------------------------------------------------------
create or replace function public.mark_overdue_rentals()
returns void as $$
begin
  update public.rentals
  set status = 'overdue'
  where status = 'active'
    and due_date < current_date;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- 2. Agenda a função para rodar todo dia às 03:00 UTC (~00:00 em
-- horário de Brasília). Remove o agendamento anterior antes de recriar,
-- para o script poder ser rodado de novo com segurança.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'mark-overdue-rentals-daily') then
    perform cron.unschedule('mark-overdue-rentals-daily');
  end if;
end $$;

select cron.schedule(
  'mark-overdue-rentals-daily',
  '0 3 * * *',
  $$ select public.mark_overdue_rentals(); $$
);

-- Conferir se o job foi agendado corretamente:
-- select * from cron.job where jobname = 'mark-overdue-rentals-daily';

-- Rodar manualmente uma vez para testar agora mesmo (opcional):
-- select public.mark_overdue_rentals();
