import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

const TESTED_WINDOW_DAYS = 7;

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const organizationId = auth.session.user.organizationId;

  const [meta, rulesCount, actionsCount, logsCount, campaignScopedRulesCount] = await Promise.all([
    prisma.metaConnection.findFirst({ where: { organizationId }, orderBy: { updatedAt: 'desc' } }),
    prisma.rule.count({ where: { organizationId } }),
    prisma.action.count({ where: { organizationId } }),
    prisma.auditLog.count({ where: { organizationId } }),
    prisma.rule.count({
      where: {
        organizationId,
        scopeType: { in: ['CAMPAIGN', 'ADSET'] },
        OR: [{ applyToAll: true }, { scopeIds: { isEmpty: false } }]
      }
    })
  ]);

  const now = new Date();
  const testedThreshold = new Date(now.getTime() - TESTED_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const connected =
    meta?.status === 'CONNECTED' &&
    Boolean(meta.accessTokenEnc?.trim()) &&
    (!meta.tokenExpiresAt || meta.tokenExpiresAt > now);

  const tested = Boolean(meta?.testedAt && meta.testedAt > testedThreshold);

  return NextResponse.json({
    connected,
    tested,
    campaignPicked: campaignScopedRulesCount > 0,
    hasRule: rulesCount > 0,
    hasRun: actionsCount > 0,
    hasLogs: logsCount > 0
  });
}
