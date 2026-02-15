import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ruleSchema } from '@/lib/validations';
import { canManageRules } from '@/lib/rbac';
import { requireSession, forbidden } from '@/lib/server-auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const rules = await prisma.rule.findMany({
    where: { organizationId: auth.session.user.organizationId },
    orderBy: { updatedAt: 'desc' }
  });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (!canManageRules(auth.session.user.role)) return forbidden();

  const body = await req.json();
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const rule = await prisma.rule.create({
    data: {
      ...parsed.data,
      isEnabled: parsed.data.isEnabled ?? true,
      organizationId: auth.session.user.organizationId,
      createdById: auth.session.user.id
    }
  });

  await createAuditLog({
    organizationId: auth.session.user.organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: 'RULE_CREATED',
    entityType: 'RULE',
    entityId: rule.id,
    details: { name: rule.name, type: rule.type }
  });

  return NextResponse.json(rule);
}
