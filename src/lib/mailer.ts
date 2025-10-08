import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY!;
export const resend = apiKey ? new Resend(apiKey) : null;

export async function sendMail(to: string[], subject: string, html: string) {
  if (!resend) {
    console.log('[MAIL DISABLED]', subject, to.join(', '));
    return { ok: true, disabled: true };
  }
  await resend.emails.send({
    from: 'Porra <noreply@your-domain.dev>',
    to,
    subject,
    html,
  });
  return { ok: true };
}
