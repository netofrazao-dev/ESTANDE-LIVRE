// supabase/functions/send-due-reminders/index.ts
//
// Disparada uma vez por dia por um cron job (ver automation_email_cron.sql
// — usa pg_cron + pg_net para chamar esta função). Varre os aluguéis
// ativos e envia:
//   - lembrete para quem vence em 2 dias
//   - aviso para quem acabou de ficar atrasado (venceu ontem)
//
// Deploy: supabase functions deploy send-due-reminders --no-verify-jwt
// Secrets:  supabase secrets set RESEND_API_KEY=... FROM_EMAIL="Estante Livre <...>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderEmailShell, formatDateBR, formatCurrencyBRL, sendEmail } from '../_shared/email.ts';

const DAILY_LATE_FEE = 2.0;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function isoDateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (_req) => {
  try {
    const inTwoDays = isoDateOffset(2);
    const yesterday = isoDateOffset(-1);

    const [{ data: dueSoon, error: dueSoonError }, { data: justOverdue, error: overdueError }] =
      await Promise.all([
        supabaseAdmin
          .from('rentals')
          .select('id, due_date, books(title), users(full_name, email)')
          .eq('status', 'active')
          .eq('due_date', inTwoDays),
        supabaseAdmin
          .from('rentals')
          .select('id, due_date, books(title), users(full_name, email)')
          .in('status', ['active', 'overdue'])
          .eq('due_date', yesterday),
      ]);

    if (dueSoonError) throw dueSoonError;
    if (overdueError) throw overdueError;

    let sent = 0;

    for (const rental of dueSoon ?? []) {
      if (!rental.users?.email) continue;
      const html = renderEmailShell({
        title: `Faltam 2 dias para devolver "${rental.books?.title ?? 'seu livro'}"`,
        bodyHtml: `
          <p>Olá, ${rental.users.full_name?.split(' ')[0] ?? 'leitor'}!</p>
          <p>Seu prazo de devolução vence em <strong>${formatDateBR(rental.due_date)}</strong>.</p>
          <p>Devolva a tempo para não pagar multa por atraso.</p>
        `,
      });
      await sendEmail({
        to: rental.users.email,
        subject: `Lembrete: devolução em 2 dias — Estante Livre`,
        html,
      });
      sent++;
    }

    for (const rental of justOverdue ?? []) {
      if (!rental.users?.email) continue;
      const html = renderEmailShell({
        title: `"${rental.books?.title ?? 'Seu livro'}" está atrasado`,
        bodyHtml: `
          <p>Olá, ${rental.users.full_name?.split(' ')[0] ?? 'leitor'}!</p>
          <p>A devolução venceu em <strong>${formatDateBR(rental.due_date)}</strong> e ainda não recebemos o livro.</p>
          <p>A multa é de <strong>${formatCurrencyBRL(DAILY_LATE_FEE)}/dia</strong> de atraso. Devolva o quanto antes para não acumular mais.</p>
        `,
      });
      await sendEmail({
        to: rental.users.email,
        subject: `Seu aluguel está atrasado — Estante Livre`,
        html,
      });
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, emailsSent: sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
