import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, forbidden } from '@/lib/server-auth';
import { metaConnectionSchema } from '@/lib/validations';
import { decrypt, encrypt } from '@/lib/crypto';
import { maskMiddle, maskSecret } from '@/lib/mask';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const conn = await prisma.metaConnection.findFirst({
    where: { organizationId: auth.session.user.organizationId },
    orderBy: { updatedAt: 'desc' }
  });

  return NextResponse.json({
    hasToken: Boolean(conn?.accessTokenEnc),
    tokenPreview: conn?.accessTokenEnc ? maskSecret(decrypt(conn.accessTokenEnc)) : '',
    adAccountId: conn?.adAccountId ?? '',
    adAccountIdPreview: conn?.adAccountId ? maskMiddle(conn.adAccountId) : '',
    updatedAt: conn?.updatedAt ?? null,
    status: conn?.status ?? 'DISCONNECTED',
    testedAt: conn?.testedAt ?? null,
    connected: conn?.status === 'CONNECTED'
  });
}

export async function PUT(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (auth.session.user.role !== 'ADMIN') return forbidden();

  const parsed = metaConnectionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const shouldClear = !parsed.data.adAccountId && !parsed.data.accessToken;
  const existing = await prisma.metaConnection.findFirst({ where: { organizationId: auth.session.user.organizationId }, orderBy: { updatedAt: 'desc' } });

  const conn = existing
    ? await prisma.metaConnection.update({
        where: { id: existing.id },
        data: {
          adAccountId: parsed.data.adAccountId || '',
          ...(parsed.data.accessToken ? { accessTokenEnc: encrypt(parsed.data.accessToken) } : {}),
          status: shouldClear ? 'DISCONNECTED' : parsed.data.status,
          testedAt: shouldClear ? null : existing.testedAt
        }
      })
    : await prisma.metaConnection.create({
        data: {
          organizationId: auth.session.user.organizationId,
          userId: auth.session.user.id,
          adAccountId: parsed.data.adAccountId || '',
          accessTokenEnc: parsed.data.accessToken ? encrypt(parsed.data.accessToken) : '',
          tokenExpiresAt: parsed.data.tokenExpiresAt ? new Date(parsed.data.tokenExpiresAt) : null,
          status: shouldClear ? 'DISCONNECTED' : parsed.data.status,
          testedAt: null
        }
      });

  await createAuditLog({
    organizationId: auth.session.user.organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: 'SETTINGS_META_UPDATED',
    entityType: 'META_CONNECTION',
    entityId: conn.id,
    details: { hasToken: !shouldClear, adAccountId: conn.adAccountId || null, status: conn.status }
  });

  return NextResponse.json({ success: true, messageThai: shouldClear ? 'ล้างค่าการเชื่อมต่อ Meta แล้ว' : 'บันทึกการเชื่อมต่อ Meta สำเร็จ' });
}
