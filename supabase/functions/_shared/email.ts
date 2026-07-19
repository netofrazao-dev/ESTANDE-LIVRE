// Template de e-mail compartilhado — visual consistente com o tema
// rústico/pergaminho da Estante Livre, em HTML simples (compatível com
// a maioria dos clientes de e-mail).

export function renderEmailShell({ title, bodyHtml }: { title: string; bodyHtml: string }) {
  return `
  <div style="background-color:#F9F6F0; padding:32px 16px; font-family: Georgia, 'Times New Roman', serif;">
    <div style="max-width:480px; margin:0 auto; background-color:#FFFDF9; border:1px solid #E8DBC5; border-radius:6px; overflow:hidden;">
      <div style="background-color:#4F6B39; padding:20px 28px;">
        <span style="color:#F9F6F0; font-size:20px; font-weight:bold;">📚 Estante Livre</span>
      </div>
      <div style="padding:28px;">
        <h1 style="font-size:20px; color:#2C1D11; margin:0 0 16px;">${title}</h1>
        <div style="font-size:14px; line-height:1.6; color:#3E2A1A;">
          ${bodyHtml}
        </div>
      </div>
      <div style="padding:16px 28px; background-color:#F5EFE6; font-size:11px; color:#8B6239;">
        Estante Livre — sua biblioteca de aluguel. Este é um e-mail automático, não responda.
      </div>
    </div>
  </div>`;
}

export function formatCurrencyBRL(value: number) {
  return `R$ ${Number(value ?? 0).toFixed(2).replace('.', ',')}`;
}

export function formatDateBR(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Envia um e-mail via Resend. Requer o secret RESEND_API_KEY configurado na função. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Estante Livre <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY não configurada nos secrets da função.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao enviar e-mail via Resend: ${response.status} ${errorBody}`);
  }

  return response.json();
}
