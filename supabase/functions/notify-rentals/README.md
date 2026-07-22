# Edge Function: notify-rentals

Roda diariamente e cuida de todo o fluxo de notificações:

- Empréstimos vencendo em até 2 dias
- Empréstimos atrasados (1 vez por dia, não spamma)
- Reservas que ficaram disponíveis (livro voltou para leitor na fila)
- Expirar reservas notificadas que passaram do prazo de 48h, e chamar o próximo

## Deploy

```bash
# Instale o Supabase CLI se ainda não tiver
brew install supabase/tap/supabase   # macOS
# ou: npm install -g supabase

# Faça login
supabase login

# Link com seu projeto (uma vez só)
supabase link --project-ref SEU_PROJECT_REF

# Configure os secrets
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set EMAIL_FROM="Estante Livre <contato@seu-dominio.com>"
supabase secrets set SITE_URL="https://estantelivre.com.br"

# Deploy
supabase functions deploy notify-rentals
```

## Envio de e-mail

A função usa [Resend](https://resend.com) por padrão. Se `RESEND_API_KEY` não estiver setada, ela apenas loga no console (útil pra testar sem custo).

Para trocar por SendGrid, Postmark, etc., edite a função `sendEmail` em `index.ts`.

## Agendamento (cron)

No painel do Supabase, vá em **Database → Cron Jobs** e crie um job:

```sql
select cron.schedule(
  'notify-rentals-daily',
  '0 9 * * *',   -- todo dia às 9h
  $$
  select net.http_post(
    url:='https://SEU_PROJECT_REF.supabase.co/functions/v1/notify-rentals',
    headers:='{"Authorization": "Bearer SEU_ANON_KEY"}'::jsonb
  );
  $$
);
```

Substitua `SEU_PROJECT_REF` e `SEU_ANON_KEY` (use a service_role key para maior segurança).

## Teste manual

```bash
curl -X POST https://SEU_PROJECT_REF.supabase.co/functions/v1/notify-rentals \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

Retorna JSON com os contadores de cada tipo de notificação enviada.
