import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ruleSchema } from '@/lib/validations';
import { canManageRules } from '@/lib/rbac';
import { requireSession, forbidden } from '@/lib/server-auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const rule = await prisma.rule.findFirst({ where: { id: params.id, organizationId: auth.session.user.organizationId } });
  if (!rule) return NextResponse.json({ error: 'ไม่พบกฎที่ต้องการ' }, { status: 404 });
  return NextResponse.json(rule);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (!canManageRules(auth.session.user.role)) return forbidden();

  const body = await req.json();
  const parsed = ruleSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (auth.session.user.role === 'EMPLOYEE' && parsed.data.autoApply === true) {
    return NextResponse.json({ error: 'พนักงานไม่สามารถเปิดยิงจริงอัตโนมัติได้' }, { status: 403 });
  }

  const current = await prisma.rule.findFirst({ where: { id: params.id, organizationId: auth.session.user.organizationId } });
  if (!current) return NextResponse.json({ error: 'ไม่พบกฎที่ต้องการ' }, { status: 404 });

  const updated = await prisma.rule.update({
    where: { id: current.id },
    data: parsed.data
  });

  await createAuditLog({
    organizationId: auth.session.user.organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: 'RULE_UPDATED',
    entityType: 'RULE',
    entityId: params.id,
    details: parsed.data as Record<string, unknown>
  });

  if (typeof parsed.data.isEnabled === 'boolean') {
    await createAuditLog({
      organizationId: auth.session.user.organizationId,
      actorId: auth.session.user.id,
      actorLabel: auth.session.user.email || auth.session.user.id,
      eventType: parsed.data.isEnabled ? 'RULE_ENABLED' : 'RULE_DISABLED',
      entityType: 'RULE',
      entityId: params.id
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (!canManageRules(auth.session.user.role)) return forbidden();

  const deleted = await prisma.rule.deleteMany({ where: { id: params.id, organizationId: auth.session.user.organizationId } });
  if (!deleted.count) return NextResponse.json({ error: 'ไม่พบกฎที่ต้องการ' }, { status: 404 });

  await createAuditLog({
    organizationId: auth.session.user.organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: 'RULE_DELETED',
    entityType: 'RULE',
    entityId: params.id
  });

  return NextResponse.json({ success: true });
}
