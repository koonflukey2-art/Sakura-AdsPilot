import { prisma } from '../src/lib/prisma';
import { evaluateRules } from '../src/lib/rules-engine';
import { sendEmail, sendLine } from '../src/lib/notifications';
import { createAuditLog } from '../src/lib/audit';
import { DEFAULT_ORGANIZATION_NAME } from '../src/lib/constants';

const LOCK_KEY = 'WORKER_RULE_RUN';

async function acquireLock(organizationId: string) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);

  const updated = await prisma.workerLock.updateMany({
    where: {
      organizationId,
      lockKey: LOCK_KEY,
      OR: [{ lockedUntil: { lte: now } }]
    },
    data: { lockedUntil }
  });

  if (!updated.count) {
    await prisma.workerLock.create({ data: { organizationId, lockKey: LOCK_KEY, lockedUntil } }).catch(() => undefined);
  }

  const lock = await prisma.workerLock.findUnique({ where: { organizationId_lockKey: { organizationId, lockKey: LOCK_KEY } } });
  return Boolean(lock && lock.lockedUntil > now && lock.lockedUntil <= lockedUntil);
}

async function run() {
  const organization = await prisma.organization.findUnique({ where: { name: DEFAULT_ORGANIZATION_NAME } });
  if (!organization) return;

  const gotLock = await acquireLock(organization.id);
  if (!gotLock) {
    console.log('มี worker อื่นกำลังทำงานอยู่');
    return;
  }

  const actions = await evaluateRules(organization.id);
  for (const action of actions) {
    const message = `[${action.rule.name}] ${action.summary} | target ${action.targetRef}`;
    await sendEmail(organization.id, `Sakura AdsPilot: ${action.rule.name}`, `<p>${message}</p>`);
    await sendLine(organization.id, message);
    await createAuditLog({
      organizationId: organization.id,
      actorLabel: 'hourly-worker',
      actorType: 'SYSTEM',
      eventType: 'ACTION_EXECUTED',
      entityType: 'ACTION',
      entityId: action.id,
      details: { message, status: action.status }
    });
  }

  await prisma.workerLock.update({
    where: { organizationId_lockKey: { organizationId: organization.id, lockKey: LOCK_KEY } },
    data: { lockedUntil: new Date() }
  });

  console.log(`Worker done: ${actions.length} action(s)`);
}

run().finally(async () => prisma.$disconnect());
