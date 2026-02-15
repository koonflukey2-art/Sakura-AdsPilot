import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, forbidden } from '@/lib/server-auth';
import { metaConnectionSchema } from '@/lib/validations';
import { encrypt } from '@/lib/crypto';
import { maskSecret } from '@/lib/mask';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (auth.session.user.role !== 'ADMIN') return forbidden();

  const conn = await prisma.metaConnection.findFirst({
    where: { organizationId: auth.session.user.organizationId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    adAccountId: conn?.adAccountId ?? '',
    tokenMasked: conn ? maskSecret('encrypted-token') : '',
    tokenExpiresAt: conn?.tokenExpiresAt ?? null,
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
  if (!parsed.data.accessToken) return NextResponse.json({ error: 'กรุณากรอก Access Token' }, { status: 400 });

  const conn = await prisma.metaConnection.create({
    data: {
      organizationId: auth.session.user.organizationId,
      userId: auth.session.user.id,
      adAccountId: parsed.data.adAccountId,
      accessTokenEnc: encrypt(parsed.data.accessToken),
      tokenExpiresAt: parsed.data.tokenExpiresAt ? new Date(parsed.data.tokenExpiresAt) : null,
      status: parsed.data.status,
      testedAt: new Date()
    }
  });

  await createAuditLog({
    organizationId: auth.session.user.organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: 'META_CONNECTION_UPDATED',
    entityType: 'META_CONNECTION',
    entityId: conn.id,
    details: { adAccountId: conn.adAccountId, status: conn.status }
  });

  return NextResponse.json({ success: true, tokenMasked: maskSecret(parsed.data.accessToken) });
}
