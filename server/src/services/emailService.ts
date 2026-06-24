import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter: Transporter | null = null;
let verified = false;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user) {
    // No SMTP configured: fall back to a JSON-to-log transport (dev-friendly).
    logger.warn('SMTP not configured — emails will be logged instead of sent.');
    transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix' });
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const transport = getTransporter();
  if (!verified && env.smtp.host) {
    try {
      await transport.verify();
      verified = true;
    } catch (err) {
      logger.error({ err }, 'SMTP verify failed; continuing with best-effort delivery');
    }
  }
  const info = await transport.sendMail({
    from: env.smtp.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  logger.info({ to: opts.to, subject: opts.subject, messageId: info.messageId }, 'email sent');
}

/** Pretty dev link mailer — always logs the verification/reset URL. */
export async function sendActionEmail(args: {
  to: string;
  name: string;
  action: 'verify-email' | 'reset-password';
  url: string;
}): Promise<void> {
  const title =
    args.action === 'verify-email' ? 'Verify your TestASK AI account' : 'Reset your TestASK AI password';
  const cta = args.action === 'verify-email' ? 'Verify Email' : 'Reset Password';

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
      <h2 style="color:#6366f1">TestASK <span style="color:#06b6d4">AI</span></h2>
      <p>Hi ${escapeHtml(args.name)},</p>
      <p>Click the button below to ${cta.toLowerCase()}:</p>
      <p>
        <a href="${args.url}" style="display:inline-block;background:#6366f1;color:#fff;
           padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${cta}</a>
      </p>
      <p style="color:#64748b;font-size:13px">Or paste this URL into your browser:<br>${args.url}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="color:#94a3b8;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
    </div>`;

  if (!env.smtp.host) {
    logger.info({ to: args.to, action: args.action, url: args.url }, '📧 action email (no SMTP, logged)');
  }

  await sendMail({ to: args.to, subject: title, html, text: `${title}: ${args.url}` });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
