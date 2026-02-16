import { prisma } from '../src/lib/prisma';
import { evaluateRulesForOrganization, executePendingAction } from '../src/lib/rules-engine';
import { createAuditLog } from '../src/lib/audit';
import { DEFAULT_ORGANIZATION_NAME } from '../src/lib/constants';

async function run() {
  const organization = await prisma.organization.findUnique({ where: { name: DEFAULT_ORGANIZATION_NAME } });
  if (!organization) return;

  const actions = await evaluateRulesForOrganization(organization.id);
  for (const action of actions) {
    const finalAction = await executePendingAction(action.id);
    if (!finalAction) continue;

    await createAuditLog({
      organizationId: organization.id,
      actorLabel: 'hourly-worker',
      actorType: 'SYSTEM',
      eventType: finalAction.status === 'FAILED' ? 'ACTION_FAILED' : 'ACTION_EXECUTED',
      entityType: 'ACTION',
      entityId: finalAction.id,
      details: { status: finalAction.status, message: finalAction.resultMessage }
    });
  }

  console.log(`Worker done: ${actions.length} action(s)`);
}

run().finally(async () => prisma.$disconnect());
