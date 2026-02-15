import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { decrypt } from './crypto';

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

export async function sendEmail(organizationId: string, subject: string, html: string) {
  const setting = await prisma.notificationSetting.findUnique({ where: { organizationId } });
  if (!setting?.emailEnabled || !setting.smtpHost || !setting.notifyEmailTo || !setting.smtpUser || !setting.smtpPassEnc) return;

  await retry(async () => {
    const transporter = nodemailer.createTransport({
      host: setting.smtpHost,
      port: Number(setting.smtpPort || 587),
      secure: false,
      auth: { user: setting.smtpUser, pass: decrypt(setting.smtpPassEnc) }
    });
    await transporter.sendMail({
      from: setting.smtpFrom || setting.smtpUser,
      to: setting.notifyEmailTo,
      subject,
      html
    });
    await prisma.notificationLog.create({
      data: {
        organizationId,
        channel: 'EMAIL',
        recipient: setting.notifyEmailTo,
        status: 'SENT',
        payloadJson: { subject }
      }
    });
  });
}

export async function sendLine(organizationId: string, message: string) {
  const setting = await prisma.notificationSetting.findUnique({ where: { organizationId } });
  if (!setting?.lineEnabled || !setting.lineTokenEnc) return;

  await retry(async () => {
    const token = decrypt(setting.lineTokenEnc);
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message })
    });
    if (!res.ok) throw new Error('LINE notify failed');
    await prisma.notificationLog.create({
      data: { organizationId, channel: 'LINE', recipient: 'LINE_NOTIFY', status: 'SENT', payloadJson: { message } }
    });
  });
}
