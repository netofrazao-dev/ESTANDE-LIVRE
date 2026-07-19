// supabase/functions/send-rental-confirmation/index.ts
//
// Disparada por um Database Webhook (Database → Webhooks no painel do
// Supabase) configurado para rodar em: INSERT em `rentals` → HTTP Request
// → URL desta função. O Supabase já envia o "record" completo da linha
// inserida no corpo da requisição nesse formato de webhook.
//
// Deploy: supabase functions deploy send-rental-confirmation
// Secrets:  supabase secrets set RESEND_API_KEY=... FROM_EMAIL="Estante Livre <...>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderEmailShell, formatDateBR, sendEmail } from '../_shared/email.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Database Webhook do Supabase envia { type: 'INSERT', table: 'rentals', record: {...} }
    const rental = payload.record ?? payload;

    if (!rental?.id) {
      return new Response(JSON.stringify({ error: 'rental inválido' }), { status: 400 });
    }

    const { data: fullRental, error } = await supabaseAdmin
      .from('rentals')
      .select('due_date, books(title), users(full_name, email)')
      .eq('id', rental.id)
      .single();

    if (error || !fullRental?.users?.email) {
      throw error ?? new Error('Não foi possível carregar os dados do aluguel/usuário.');
    }

    const html = renderEmailShell({
      title: `Seu aluguel foi confirmado, ${fullRental.users.full_name?.split(' ')[0] ?? 'leitor'}!`,
      bodyHtml: `
        <p>Você reservou <strong>${fullRental.books?.title ?? 'um livro'}</strong>.</p>
        <p>Data de devolução: <strong>${formatDateBR(fullRental.due_date)}</strong>.</p>
        <p>💳 <strong>Pagamento na retirada:</strong> a reserva é online, mas o pagamento é feito
        presencialmente no balcão, quando você vier buscar o livro. Aceitamos dinheiro, débito e crédito.</p>
        <p>Boa leitura! 📖</p>
      `,
    });

    await sendEmail({
      to: fullRental.users.email,
      subject: 'Aluguel confirmado — Estante Livre',
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
