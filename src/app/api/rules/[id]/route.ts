import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ruleUpdateSchema } from '@/lib/validations';
import { canManageRules } from '@/lib/rbac';
import { requireSession, forbidden } from '@/lib/server-auth';
import { createAuditLog } from '@/lib/audit';

function jsonError(message: unknown, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const rule = await prisma.rule.findFirst({
    where: { id: params.id, organizationId: auth.session.user.organizationId }
  });

  if (!rule) return jsonError('ไม่พบกฎที่ต้องการ', 404);
  return NextResponse.json(rule);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (!canManageRules(auth.session.user.role)) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return jsonError('ข้อมูลไม่ถูกต้อง');

  const parsed = ruleUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.flatten(), 400);

  // EMPLOYEE ไม่ให้เปิดยิงจริงอัตโนมัติ
  if (auth.session.user.role === 'EMPLOYEE' && parsed.data.autoApply === true) {
    return jsonError('พนักงานไม่สามารถเปิดยิงจริงอัตโนมัติได้', 403);
  }

  const current = await prisma.rule.findFirst({
    where: { id: params.id, organizationId: auth.session.user.organizationId }
  });
  if (!current) return jsonError('ไม่พบกฎที่ต้องการ', 404);

  // ✅ Guard เพิ่มเติม: ถ้ามีการส่ง scopeType และ applyToAll=false แล้ว scopeIds ว่าง -> ไม่ผ่าน
  if (
    (parsed.data.scopeType === 'CAMPAIGN' || parsed.data.scopeType === 'ADSET') &&
    parsed.data.applyToAll === false &&
    Array.isArray(parsed.data.scopeIds) &&
    parsed.data.scopeIds.length === 0
  ) {
    return jsonError({ formErrors: ['กรุณาเลือกเป้าหมายอย่างน้อย 1 รายการ'] }, 400);
  }

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

  const deleted = await prisma.rule.deleteMany({
    where: { id: params.id, organizationId: auth.session.user.organizationId }
  });

  if (!deleted.count) return jsonError('ไม่พบกฎที่ต้องการ', 404);

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
