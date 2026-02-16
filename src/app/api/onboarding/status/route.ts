import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

<<<<<<< HEAD
const TESTED_WINDOW_DAYS = 7;
=======
const DAYS = 7;
>>>>>>> 85fffad1 (Update dashboard/logs/rules UI + onboarding + validations)

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const organizationId = auth.session.user.organizationId;

<<<<<<< HEAD
  const [meta, rulesCount, actionsCount, logsCount, campaignScopedRulesCount] = await Promise.all([
=======
  const [meta, rulesCount, actionsCount, logsCount, scopedRuleCount] = await Promise.all([
>>>>>>> 85fffad1 (Update dashboard/logs/rules UI + onboarding + validations)
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

<<<<<<< HEAD
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
=======
  const now = Date.now();
  const tokenOk =
    Boolean(meta?.accessTokenEnc) &&
    (meta?.tokenExpiresAt ? meta.tokenExpiresAt.getTime() > now : true);

  const connected = meta?.status === 'CONNECTED' && tokenOk;

  const testedFresh =
    meta?.testedAt
      ? meta.testedAt.getTime() > now - DAYS * 24 * 60 * 60 * 1000
      : false;

  return NextResponse.json({
    connected,
    tested: Boolean(meta?.testedAt) && testedFresh,
    campaignPicked: scopedRuleCount > 0,
>>>>>>> 85fffad1 (Update dashboard/logs/rules UI + onboarding + validations)
    hasRule: rulesCount > 0,
    hasRun: actionsCount > 0,
    hasLogs: logsCount > 0
  });
}
