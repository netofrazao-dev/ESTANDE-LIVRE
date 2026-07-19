-- =====================================================================
-- ESTANTE LIVRE — Automação: disparo diário de e-mails de lembrete
-- Rode DEPOIS de fazer o deploy da função `send-due-reminders`
-- (supabase functions deploy send-due-reminders --no-verify-jwt).
--
-- Requer as extensões pg_cron e pg_net habilitadas
-- (Database → Extensions no painel do Supabase).
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- 1. Guarda a Service Role Key no Vault (NUNCA em texto puro no SQL).
-- Troque 'COLE_SUA_SERVICE_ROLE_KEY_AQUI' pela chave do seu projeto
-- (Project Settings → API → service_role) e rode isso UMA VEZ.
-- ---------------------------------------------------------------------
select vault.create_secret(
  'COLE_SUA_SERVICE_ROLE_KEY_AQUI',
  'estante_livre_service_role_key',
  'Service role key usada pelo pg_cron para chamar Edge Functions'
);

-- ---------------------------------------------------------------------
-- 2. Função que chama a Edge Function `send-due-reminders` via HTTP,
-- lendo a chave do Vault (nunca fica exposta em texto no schema).
-- Troque <PROJECT_REF> pela referência do seu projeto Supabase.
-- ---------------------------------------------------------------------
create or replace function public.trigger_due_reminders()
returns void as $$
declare
  service_key text;
begin
  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'estante_livre_service_role_key';

  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
end;
$$ language plpgsql security definer set search_path = public, vault, net;

-- ---------------------------------------------------------------------
-- 3. Agenda para rodar todo dia às 12:00 UTC (~09:00 em Brasília).
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-due-reminders-daily') then
    perform cron.unschedule('send-due-reminders-daily');
  end if;
end $$;

select cron.schedule(
  'send-due-reminders-daily',
  '0 12 * * *',
  $$ select public.trigger_due_reminders(); $$
);

-- =====================================================================
-- E-mail de CONFIRMAÇÃO DE ALUGUEL (ao criar) não usa cron — é mais
-- simples e mais confiável configurar como Database Webhook pelo painel:
--
--   Painel do Supabase → Database → Webhooks → Create a new hook
--     Table: rentals
--     Events: Insert
--     Type: Supabase Edge Functions
--     Function: send-rental-confirmation
--
-- O próprio painel cuida da autenticação com a função, sem precisar
-- guardar chave nenhuma no SQL para esse caso.
-- =====================================================================
