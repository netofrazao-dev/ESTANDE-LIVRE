-- ═══════════════════════════════════════════════════════════════════
-- ESTANDE LIVRE — Agendamento da notificação diária (pg_cron)
-- ═══════════════════════════════════════════════════════════════════
--
-- Pré-requisitos:
--   1. A Edge Function 'notify-rentals' já precisa estar deployada
--      (supabase functions deploy notify-rentals — veja
--      supabase/functions/notify-rentals/README.md)
--   2. Habilite as extensões pg_cron e pg_net em:
--      Supabase Dashboard → Database → Extensions
--
-- Antes de rodar, substitua:
--   SEU_PROJECT_REF     → o ref do seu projeto (aparece na URL do painel
--                          e em Project Settings → General)
--   SEU_SERVICE_ROLE_KEY → em Project Settings → API → service_role key
--                          (NUNCA exponha essa chave no front-end; aqui
--                          ela fica guardada no banco, lado servidor,
--                          o que é seguro)
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'notify-rentals-daily',
  '0 9 * * *',  -- todo dia às 09h (horário do servidor Postgres, UTC por padrão)
  $$
  select net.http_post(
    url := 'https://fftsvcbcpbwqdfrnkxux.supabase.co/functions/v1/notify-rentals',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdHN2Y2JjcGJ3cWRmcm5reHV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU5NzMwMCwiZXhwIjoyMTAwMTczMzAwfQ.xFB_B6eFd06dB5wO4EZNCKie5KV1n-hpGqkPrJWhe1I", "Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- ── Conferir se o job foi criado ──────────────────────────────────
-- select * from cron.job;

-- ── Ver histórico de execuções (últimas 20) ───────────────────────
-- select * from cron.job_run_details order by start_time desc limit 20;

-- ── Cancelar o agendamento, se precisar ───────────────────────────
-- select cron.unschedule('notify-rentals-daily');

-- ── Nota sobre horário ─────────────────────────────────────────────
-- O cron do Postgres roda em UTC. 09h em Brasília (UTC-3) = 12h UTC.
-- Se quiser que o e-mail saia às 9h no horário de Brasília, troque
-- '0 9 * * *' por '0 12 * * *'.
