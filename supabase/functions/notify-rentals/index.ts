// ═══════════════════════════════════════════════════════════════════
// notify-rentals — Edge Function
// Roda diariamente e:
//  - Notifica leitores com empréstimos vencendo em 2 dias
//  - Notifica leitores com empréstimos atrasados (uma vez por dia)
//  - Envia notificação para reservas que ficaram disponíveis
//  - Expira reservas notificadas que passaram das 48h
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY') // opcional
const fromEmail = Deno.env.get('EMAIL_FROM') || 'Estante Livre <onboarding@resend.dev>'
const siteUrl = Deno.env.get('SITE_URL') || 'https://estantelivre.com.br'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ── E-mail via Resend (opcional — se RESEND_API_KEY não estiver setada, apenas loga) ──
async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey) {
    console.log(`[MOCK EMAIL] to=${to} subject="${subject}"`)
    return { ok: true, mock: true }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend erro: ${err}`)
  }
  return { ok: true, mock: false }
}

// ── Templates de e-mail ──
const emailShell = (title: string, body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family: Georgia, serif; background: #F9F6F0; color: #3E2723; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid rgba(139, 111, 71, 0.2); padding: 40px;">
    <div style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #8B6F47; margin-bottom: 8px;">
      Estante Livre · locadora de livros
    </div>
    <h1 style="font-family: Georgia, serif; font-size: 28px; margin: 0 0 24px; line-height: 1.2;">${title}</h1>
    ${body}
    <hr style="border: none; border-top: 1px solid rgba(139, 111, 71, 0.2); margin: 32px 0;" />
    <p style="font-size: 12px; color: #8B6F47; margin: 0;">
      Você recebeu este e-mail porque possui cadastro na Estante Livre.
      <br>
      <a href="${siteUrl}" style="color: #5A6E4A;">${siteUrl}</a>
    </p>
  </div>
</body>
</html>`

const templateDueSoon = (name: string, bookTitle: string, dueDate: string, daysLeft: number) =>
  emailShell(
    `Lembrete: ${daysLeft === 1 ? 'faltam 1 dia' : `faltam ${daysLeft} dias`}`,
    `<p>Olá, <strong>${name}</strong>.</p>
     <p>Este é um lembrete de que "<em>${bookTitle}</em>" precisa ser devolvido até <strong>${dueDate}</strong>.</p>
     <p>Passado o prazo, será cobrada multa diária de R$ 2,00.</p>
     <p style="margin-top: 32px;">
       <a href="${siteUrl}/minha-estante" style="display:inline-block; background:#5A6E4A; color:#F9F6F0; padding:12px 24px; text-decoration:none; font-size:14px;">Ver minha estante</a>
     </p>`,
  )

const templateOverdue = (name: string, bookTitle: string, dueDate: string, daysLate: number, fine: string) =>
  emailShell(
    `"${bookTitle}" está atrasado`,
    `<p>Olá, <strong>${name}</strong>.</p>
     <p>O livro "<em>${bookTitle}</em>" venceu em <strong>${dueDate}</strong> e está com <strong>${daysLate} dia(s) de atraso</strong>.</p>
     <p style="background:#B85C3E; color:#F9F6F0; padding:16px; font-family: monospace; text-align:center; font-size:16px;">
       Multa acumulada: <strong>R$ ${fine}</strong>
     </p>
     <p>A cada dia adicional, R$ 2,00 são somados. Por favor, agende a devolução com urgência.</p>
     <p style="margin-top: 32px;">
       <a href="${siteUrl}/minha-estante" style="display:inline-block; background:#3E2723; color:#F9F6F0; padding:12px 24px; text-decoration:none; font-size:14px;">Ver minha estante</a>
     </p>`,
  )

const templateReservationAvailable = (name: string, bookTitle: string, expiresAt: string) =>
  emailShell(
    `"${bookTitle}" está disponível!`,
    `<p>Olá, <strong>${name}</strong>.</p>
     <p>Boa notícia: o livro "<em>${bookTitle}</em>" que você reservou acabou de voltar ao acervo.</p>
     <p>Passe na locadora para retirar até <strong>${expiresAt}</strong>. Após esse prazo, a reserva expira e o próximo da fila é chamado.</p>
     <p style="margin-top: 32px;">
       <a href="${siteUrl}/minha-estante" style="display:inline-block; background:#5A6E4A; color:#F9F6F0; padding:12px 24px; text-decoration:none; font-size:14px;">Ver reserva</a>
     </p>`,
  )

// ── Datas em pt-BR ──
const fmtDatador = (iso: string) => {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
  return `${day} · ${months[d.getMonth()]} · ${d.getFullYear()}`
}

// ── Handler principal ──
serve(async () => {
  const results = {
    due_soon: 0,
    overdue: 0,
    reservation_available: 0,
    reservations_expired: 0,
    errors: [] as string[],
  }

  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

  try {
    // ── 1. Empréstimos vencendo em até 2 dias ──
    const { data: dueSoon } = await supabase
      .from('rentals')
      .select('*, book:books(title), user:profiles(id, full_name, email)')
      .eq('status', 'active')
      .gte('due_date', now.toISOString())
      .lte('due_date', twoDaysFromNow.toISOString())

    for (const r of dueSoon || []) {
      // Evita duplicar no mesmo dia
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id')
        .eq('rental_id', r.id)
        .eq('type', 'due_soon')
        .gte('created_at', new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (existing) continue

      const daysLeft = Math.ceil(
        (new Date(r.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )

      try {
        await sendEmail(
          r.user.email,
          `Lembrete: "${r.book.title}" precisa voltar em breve`,
          templateDueSoon(r.user.full_name, r.book.title, fmtDatador(r.due_date), daysLeft),
        )

        await supabase.from('notification_log').insert({
          user_id: r.user.id,
          rental_id: r.id,
          type: 'due_soon',
          status: 'sent',
          sent_at: new Date().toISOString(),
          payload: { book_title: r.book.title, due_date: r.due_date },
        })
        results.due_soon++
      } catch (e) {
        results.errors.push(`due_soon rental=${r.id}: ${e.message}`)
      }
    }

    // ── 2. Empréstimos atrasados (uma vez por dia) ──
    const { data: overdue } = await supabase
      .from('rentals')
      .select('*, book:books(title), user:profiles(id, full_name, email)')
      .eq('status', 'active')
      .lt('due_date', now.toISOString())

    for (const r of overdue || []) {
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id')
        .eq('rental_id', r.id)
        .eq('type', 'overdue')
        .gte('created_at', new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (existing) continue

      const daysLate = Math.floor(
        (now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24),
      )
      const fine = (daysLate * (r.daily_fine_rate || 2)).toFixed(2).replace('.', ',')

      try {
        await sendEmail(
          r.user.email,
          `Atenção: "${r.book.title}" está atrasado`,
          templateOverdue(r.user.full_name, r.book.title, fmtDatador(r.due_date), daysLate, fine),
        )

        await supabase.from('notification_log').insert({
          user_id: r.user.id,
          rental_id: r.id,
          type: 'overdue',
          status: 'sent',
          sent_at: new Date().toISOString(),
          payload: { book_title: r.book.title, days_late: daysLate, fine },
        })
        results.overdue++
      } catch (e) {
        results.errors.push(`overdue rental=${r.id}: ${e.message}`)
      }
    }

    // ── 3. Reservas que ficaram disponíveis (log criado pelo trigger, sem e-mail ainda) ──
    const { data: pendingReservations } = await supabase
      .from('notification_log')
      .select('*, user:profiles(email, full_name), reservation:reservations(id, book_id, expires_at)')
      .eq('type', 'reservation_available')
      .eq('status', 'pending')

    for (const n of pendingReservations || []) {
      try {
        const bookTitle = n.payload?.book_title || 'livro reservado'
        const expiresAt = n.payload?.expires_at || n.reservation?.expires_at
        await sendEmail(
          n.user.email,
          `Sua reserva de "${bookTitle}" chegou!`,
          templateReservationAvailable(n.user.full_name, bookTitle, fmtDatador(expiresAt)),
        )

        await supabase
          .from('notification_log')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', n.id)
        results.reservation_available++
      } catch (e) {
        await supabase
          .from('notification_log')
          .update({ status: 'failed', error: String(e.message) })
          .eq('id', n.id)
        results.errors.push(`reservation notify=${n.id}: ${e.message}`)
      }
    }

    // ── 4. Expirar reservas com prazo estourado; libera fila ──
    const { data: expired } = await supabase
      .from('reservations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'notified')
      .lt('expires_at', now.toISOString())
      .select('id, book_id')

    // Para cada reserva expirada, forçar re-notificação do próximo da fila
    for (const r of expired || []) {
      // A trigger notify_next_in_waitlist só dispara em UPDATE de available_copies.
      // Aqui a gente força manualmente: pega o próximo da fila e "notifica".
      const { data: nextInLine } = await supabase
        .from('reservations')
        .select('id, user_id, book:books(id, title)')
        .eq('book_id', r.book_id)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (nextInLine) {
        const newExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
        await supabase
          .from('reservations')
          .update({
            status: 'notified',
            notified_at: now.toISOString(),
            expires_at: newExpiresAt.toISOString(),
          })
          .eq('id', nextInLine.id)

        await supabase.from('notification_log').insert({
          user_id: nextInLine.user_id,
          reservation_id: nextInLine.id,
          type: 'reservation_available',
          status: 'pending',
          payload: {
            book_id: nextInLine.book?.id,
            book_title: nextInLine.book?.title,
            expires_at: newExpiresAt.toISOString(),
          },
        })
      }
      results.reservations_expired++
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
