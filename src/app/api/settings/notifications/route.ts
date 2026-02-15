import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, forbidden } from '@/lib/server-auth';
import { notificationsSchema } from '@/lib/validations';
import { encrypt } from '@/lib/crypto';
import { maskSecret } from '@/lib/mask';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (auth.session.user.role !== 'ADMIN') return forbidden();

  const setting = await prisma.notificationSetting.findUnique({ where: { organizationId: auth.session.user.organizationId } });
  return NextResponse.json({
    emailEnabled: setting?.emailEnabled ?? false,
    smtpHost: setting?.smtpHost ?? '',
    smtpPort: setting?.smtpPort ?? 587,
    smtpUser: setting?.smtpUser ?? '',
    smtpFrom: setting?.smtpFrom ?? '',
    notifyEmailTo: setting?.notifyEmailTo ?? '',
    lineEnabled: setting?.lineEnabled ?? false,
    lineMode: setting?.lineMode ?? 'NOTIFY',
    smtpPasswordMasked: maskSecret(setting?.smtpPassEnc ? 'encrypted' : ''),
    lineTokenMasked: maskSecret(setting?.lineTokenEnc ? 'encrypted' : '')
  });
}

export async function PUT(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (auth.session.user.role !== 'ADMIN') return forbidden();

  const parsed = notificationsSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.notificationSetting.upsert({
    where: { organizationId: auth.session.user.organizationId },
    update: {
      emailEnabled: parsed.data.emailEnabled,
      smtpHost: parsed.data.smtpHost,
      smtpPort: parsed.data.smtpPort,
      smtpUser: parsed.data.smtpUser,
      smtpFrom: parsed.data.smtpFrom,
      notifyEmailTo: parsed.data.notifyEmailTo,
      lineEnabled: parsed.data.lineEnabled,
      lineMode: parsed.data.lineMode,
      ...(parsed.data.smtpPassword ? { smtpPassEnc: encrypt(parsed.data.smtpPassword) } : {}),
      ...(parsed.data.lineToken ? { lineTokenEnc: encrypt(parsed.data.lineToken) } : {})
    },
    create: {
      organizationId: auth.session.user.organizationId,
      emailEnabled: parsed.data.emailEnabled,
      smtpHost: parsed.data.smtpHost,
      smtpPort: parsed.data.smtpPort,
      smtpUser: parsed.data.smtpUser,
      smtpFrom: parsed.data.smtpFrom,
      notifyEmailTo: parsed.data.notifyEmailTo,
      lineEnabled: parsed.data.lineEnabled,
      lineMode: parsed.data.lineMode,
      smtpPassEnc: parsed.data.smtpPassword ? encrypt(parsed.data.smtpPassword) : null,
      lineTokenEnc: parsed.data.lineToken ? encrypt(parsed.data.lineToken) : null
    }
  });

  await createAuditLog({
    organizationId: auth.session.user.organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: 'SETTINGS_UPDATED',
    entityType: 'NOTIFICATION_SETTING',
    entityId: auth.session.user.organizationId
  });

  return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่าการแจ้งเตือนเรียบร้อยแล้ว' });
}
