import nodemailer from "nodemailer";

export function getMailer() {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function appBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}


export async function sendMail(options: { to: string; subject: string; text?: string; html?: string }) {
  const mailer = getMailer();
  if (!mailer) throw new Error("Email server is not configured");
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;
  if (!from) throw new Error("Email sender is not configured");
  return mailer.sendMail({ from, ...options });
}
