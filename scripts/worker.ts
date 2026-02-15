import { evaluateRules } from '../src/lib/rules-engine';
import { sendEmail, sendLine } from '../src/lib/notifications';
import { prisma } from '../src/lib/prisma';

async function run() {
  const actions = await evaluateRules();
  for (const action of actions) {
    const message = `[${action.rule.name}] ${action.summary} | target ${action.targetRef}`;
    await sendEmail(`Meta Ads Autopilot: ${action.rule.name}`, `<p>${message}</p>`);
    await sendLine(message);
    await prisma.auditLog.create({ data: { actorType: 'SYSTEM', actorLabel: 'hourly-worker', eventType: 'ACTION_EXECUTED', entityType: 'ACTION', entityId: action.id, detailsJson: { message } } });
  }
  console.log(`Worker done: ${actions.length} action(s)`);
}

run().finally(async () => prisma.$disconnect());
