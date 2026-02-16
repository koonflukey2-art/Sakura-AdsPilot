import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { evaluateRulesForOrganization, executePendingAction } from '@/lib/rules-engine';
import { createAuditLog } from '@/lib/audit';
import { requireSession, forbidden } from '@/lib/server-auth';

const LOCK_KEY = 'WORKER_RULE_RUN';
const runSchema = z.object({ dryRun: z.boolean().optional().default(false) });

async function acquireLock(organizationId: string) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);

  const updated = await prisma.workerLock.updateMany({
    where: { organizationId, lockKey: LOCK_KEY, lockedUntil: { lte: now } },
    data: { lockedUntil }
  });

  if (!updated.count) {
    await prisma.workerLock
      .create({ data: { organizationId, lockKey: LOCK_KEY, lockedUntil } })
      .catch(() => undefined);
  }

  const lock = await prisma.workerLock.findUnique({ where: { organizationId_lockKey: { organizationId, lockKey: LOCK_KEY } } });
  return Boolean(lock && lock.lockedUntil > now && lock.lockedUntil <= lockedUntil);
}

async function releaseLock(organizationId: string) {
  await prisma.workerLock
    .update({
      where: { organizationId_lockKey: { organizationId, lockKey: LOCK_KEY } },
      data: { lockedUntil: new Date() }
    })
    .catch(() => undefined);
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (auth.session.user.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => ({}));
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organizationId = auth.session.user.organizationId;
  const locked = await acquireLock(organizationId);
  if (!locked) return NextResponse.json({ error: 'มีงานกำลังทำงานอยู่แล้ว' }, { status: 409 });

  try {
    const actions = await evaluateRulesForOrganization(organizationId);
    const executed = [];

    for (const action of actions) {
      const finalAction = parsed.data.dryRun ? action : await executePendingAction(action.id);
      if (!finalAction) continue;
      executed.push(finalAction);

      await createAuditLog({
        organizationId,
        actorId: auth.session.user.id,
        actorLabel: auth.session.user.email || auth.session.user.id,
        eventType: finalAction.status === 'FAILED' ? 'ACTION_FAILED' : 'ACTION_EXECUTED',
        entityType: 'ACTION',
        entityId: finalAction.id,
        details: {
          ruleId: finalAction.ruleId,
          actionType: finalAction.actionType,
          status: finalAction.status,
          message: finalAction.resultMessage
        }
      });
    }

    return NextResponse.json({ ok: true, created: actions.length, executed: executed.length, items: executed });
  } finally {
    await releaseLock(organizationId);
  }
}
