import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageUsers } from '@/lib/rbac';
import { requireSession, forbidden } from '@/lib/server-auth';
import { userUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (!canManageUsers(auth.session.user.role)) return forbidden();

  const parsed = userUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await prisma.user.findFirst({ where: { id: params.id, organizationId: auth.session.user.organizationId } });
  if (!target) return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });

  const adminCount = await prisma.user.count({ where: { organizationId: auth.session.user.organizationId, role: 'ADMIN', isActive: true } });
  if (target.id === auth.session.user.id && parsed.data.role === 'EMPLOYEE' && adminCount <= 1) {
    return NextResponse.json({ error: 'ไม่สามารถลดสิทธิ์แอดมินคนสุดท้ายได้' }, { status: 400 });
  }
  if (target.role === 'ADMIN' && parsed.data.isActive === false && adminCount <= 1) {
    return NextResponse.json({ error: 'ไม่สามารถปิดใช้งานแอดมินคนสุดท้ายได้' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: parsed.data,
    select: { id: true, email: true, role: true, isActive: true }
  });

  const eventType = parsed.data.role
    ? 'USER_ROLE_CHANGED'
    : parsed.data.isActive === false
      ? 'USER_DISABLED'
      : 'USER_ENABLED';

  await createAuditLog({
    organizationId: auth.session.user.organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType,
    entityType: 'USER',
    entityId: updated.id,
    details: parsed.data as Record<string, unknown>
  });

  return NextResponse.json({ success: true, user: updated });
}
