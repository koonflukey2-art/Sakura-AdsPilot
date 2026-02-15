import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ruleSchema } from '@/lib/validations';

export async function GET() {
  const rules = await prisma.rule.findMany();
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const rule = await prisma.rule.create({ data: { ...parsed.data, createdById: session.user.id } });
  await prisma.auditLog.create({ data: { actorType: 'USER', actorId: session.user.id, actorLabel: session.user.email || session.user.id, eventType: 'RULE_CREATED', entityType: 'RULE', entityId: rule.id, detailsJson: rule as any } });
  return NextResponse.json(rule);
}
