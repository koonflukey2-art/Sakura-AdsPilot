import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const organizationId = auth.session.user.organizationId;

  const [meta, rulesCount, actionsCount, logsCount] = await Promise.all([
    prisma.metaConnection.findFirst({ where: { organizationId }, orderBy: { updatedAt: 'desc' } }),
    prisma.rule.count({ where: { organizationId } }),
    prisma.action.count({ where: { organizationId } }),
    prisma.auditLog.count({ where: { organizationId } })
  ]);

  const connected = meta?.status === 'CONNECTED';
  const tested = Boolean(meta?.testedAt);

  return NextResponse.json({
    connected,
    tested,
    campaignPicked: rulesCount > 0,
    hasRule: rulesCount > 0,
    hasRun: actionsCount > 0,
    hasLogs: logsCount > 0
  });
}
