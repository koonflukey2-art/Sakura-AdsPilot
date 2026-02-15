import nodemailer from 'nodemailer';
import { prisma } from './prisma';

async function retry<T>(fn: () => Promise<T>, retries = 2) {
  let err: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw err;
}

export async function sendEmail(subject: string, html: string) {
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!process.env.SMTP_HOST || !to) return;

  await retry(async () => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
    await prisma.notificationLog.create({ data: { channel: 'EMAIL', recipient: to, status: 'SENT', payloadJson: { subject } } });
  });
}

export async function sendLine(message: string) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) return;

  await retry(async () => {
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message })
    });
    if (!res.ok) throw new Error('LINE notify failed');
    await prisma.notificationLog.create({ data: { channel: 'LINE', recipient: 'LINE_NOTIFY', status: 'SENT', payloadJson: { message } } });
  });
}
