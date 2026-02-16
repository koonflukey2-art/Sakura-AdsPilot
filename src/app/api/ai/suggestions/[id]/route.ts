import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-auth';
import { createAuditLog } from '@/lib/audit';

const patchSchema = z.object({
  status: z.enum(['APPLIED', 'DISMISSED'])
});

const paramsSchema = z.object({ id: z.string().trim().min(1) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: parsedParams.error.flatten() }, { status: 400 });
  }

  const parsedBody = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  const organizationId = auth.session.user.organizationId;
  const current = await prisma.aiSuggestion.findFirst({
    where: { id: parsedParams.data.id, organizationId },
    select: { id: true, status: true }
  });

  if (!current) {
    return NextResponse.json({ error: 'ไม่พบ suggestion ที่ต้องการ' }, { status: 404 });
  }

  const updated = await prisma.aiSuggestion.update({
    where: { id: current.id },
    data: {
      status: parsedBody.data.status,
      appliedAt: parsedBody.data.status === 'APPLIED' ? new Date() : null
    }
  });

  await createAuditLog({
    organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: 'AI_SUGGESTION_STATUS_UPDATED',
    entityType: 'AI_SUGGESTION',
    entityId: updated.id,
    details: { fromStatus: current.status, toStatus: updated.status }
  });

  return NextResponse.json(updated);
}
