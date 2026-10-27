/* Envio de e-mail pela API da Resend (https://resend.com).
   Sem RESEND_API_KEY, o e-mail é só impresso no terminal (útil para desenvolver). */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const mailMode = () => (process.env.RESEND_API_KEY ? 'resend' : 'console');

function html(text, link, linkLabel) {
  return `<div style="font-family:Montserrat,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1d1d1f;max-width:520px">
<p style="font-size:20px;font-weight:700;margin:0 0 16px">MIP</p>
${text.split('\n').map(l => `<p style="margin:0 0 12px">${esc(l)}</p>`).join('')}
${link ? `<p style="margin:24px 0"><a href="${esc(link)}" style="background:#1d1d1f;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">${esc(linkLabel || 'Abrir a MIP')}</a></p><p style="font-size:13px;color:#5c5c63">Se o botão não abrir, copie este endereço no navegador:<br>${esc(link)}</p>` : ''}
<p style="font-size:13px;color:#5c5c63;margin-top:24px">Você recebeu este e-mail porque alguém usou seu endereço na MIP. Se não foi você, ignore esta mensagem.</p>
</div>`;
}

export async function sendMail({ to, subject, text, link, linkLabel }) {
  const plain = text + (link ? '\n\n' + link : '');
  if (mailMode() === 'console') {
    console.log(`\n[e-mail não enviado: falta RESEND_API_KEY no .env]\nPara: ${to}\nAssunto: ${subject}\n${plain}\n`);
    return { sent: false };
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'MIP <onboarding@resend.dev>', to, subject, text: plain, html: html(text, link, linkLabel) })
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    return { sent: true };
  } catch (e) {
    console.error('Falha ao enviar e-mail para', to, '-', e.message);
    return { sent: false, error: e.message };
  }
}
