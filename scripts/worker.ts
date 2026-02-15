import { prisma } from '../src/lib/prisma';
import { evaluateRules } from '../src/lib/rules-engine';
import { sendEmail, sendLine } from '../src/lib/notifications';
import { createAuditLog } from '../src/lib/audit';
import { DEFAULT_ORGANIZATION_NAME } from '../src/lib/constants';

const LOCK_KEY = 'WORKER_RULE_RUN';

async function run() {
  const organization = await prisma.organization.findUnique({ where: { name: DEFAULT_ORGANIZATION_NAME } });
  if (!organization) {
    console.log('ไม่พบองค์กรหลัก ข้ามการทำงาน worker');
    return;
  }

  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
  const existing = await prisma.workerLock.findUnique({ where: { organizationId_lockKey: { organizationId: organization.id, lockKey: LOCK_KEY } } });
  if (existing && existing.lockedUntil > now) {
    console.log('มี worker อื่นกำลังทำงานอยู่');
    return;
  }

  await prisma.workerLock.upsert({
    where: { organizationId_lockKey: { organizationId: organization.id, lockKey: LOCK_KEY } },
    update: { lockedUntil },
    create: { organizationId: organization.id, lockKey: LOCK_KEY, lockedUntil }
  });

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
      details: { message }
    });
  }

  await prisma.workerLock.update({
    where: { organizationId_lockKey: { organizationId: organization.id, lockKey: LOCK_KEY } },
    data: { lockedUntil: new Date() }
  });

  console.log(`Worker done: ${actions.length} action(s)`);
}

run().finally(async () => prisma.$disconnect());
