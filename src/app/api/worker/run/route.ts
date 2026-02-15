import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateRules } from '@/lib/rules-engine';
import { sendEmail, sendLine } from '@/lib/notifications';
import { createAuditLog } from '@/lib/audit';
import { requireSession, forbidden } from '@/lib/server-auth';

const LOCK_KEY = 'WORKER_RULE_RUN';

async function acquireLock(organizationId: string) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
  const existing = await prisma.workerLock.findUnique({ where: { organizationId_lockKey: { organizationId, lockKey: LOCK_KEY } } });

  if (!existing) {
    await prisma.workerLock.create({ data: { organizationId, lockKey: LOCK_KEY, lockedUntil } });
    return true;
  }

  if (existing.lockedUntil > now) return false;

  await prisma.workerLock.update({ where: { organizationId_lockKey: { organizationId, lockKey: LOCK_KEY } }, data: { lockedUntil } });
  return true;
}

export async function POST() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (auth.session.user.role !== 'ADMIN') return forbidden();

  const organizationId = auth.session.user.organizationId;
  const locked = await acquireLock(organizationId);
  if (!locked) return NextResponse.json({ error: 'มีงานกำลังทำงานอยู่แล้ว' }, { status: 409 });

  const actions = await evaluateRules(organizationId);
  for (const action of actions) {
    const text = `[${action.rule.name}] ${action.summary}`;
    await Promise.all([sendEmail(organizationId, `ระบบกฎทำงาน: ${action.rule.name}`, `<p>${text}</p>`), sendLine(organizationId, text)]);
    await createAuditLog({
      organizationId,
      actorId: auth.session.user.id,
      actorLabel: auth.session.user.email || auth.session.user.id,
      eventType: 'RULE_TRIGGERED',
      entityType: 'ACTION',
      entityId: action.id,
      details: { summary: action.summary, actionType: action.actionType }
    });
  }

  await prisma.workerLock.update({
    where: { organizationId_lockKey: { organizationId, lockKey: LOCK_KEY } },
    data: { lockedUntil: new Date() }
  });

  return NextResponse.json({ ok: true, count: actions.length });
}
