import { NextResponse } from 'next/server';
import { ActionStatus } from '@prisma/client';
import { requireSession } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

type MetaState = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';

// ใช้ event เหล่านี้เป็นตัวแทนว่าระบบเคยมีการ run worker/dry-run แล้ว
const RUN_EVENT_TYPES = ['RULE_ACTION_CREATED', 'RULE_TRIGGERED'];

function resolveMetaState(input: { status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR'; tokenExpiresAt: Date | null } | null): MetaState {
  if (!input) return 'DISCONNECTED';
  if (input.status === 'ERROR') return 'ERROR';
  if (input.tokenExpiresAt && input.tokenExpiresAt.getTime() <= Date.now()) return 'EXPIRED';
  if (input.status === 'CONNECTED') return 'CONNECTED';
  return 'DISCONNECTED';
}

function resolveMetaDetails(state: MetaState) {
  if (state === 'CONNECTED') return 'เชื่อมต่อสำเร็จและพร้อมใช้งาน';
  if (state === 'EXPIRED') return 'โทเค็นหมดอายุ กรุณาเชื่อมต่อใหม่';
  if (state === 'ERROR') return 'การเชื่อมต่อมีปัญหา กรุณาทดสอบอีกครั้ง';
  return 'ยังไม่ได้เชื่อมต่อบัญชี Meta';
}

function resolveRunStatus(actionStatus: ActionStatus | null, hasRunAuditEvent: boolean): ActionStatus | 'UNKNOWN' {
  if (actionStatus) return actionStatus;
  if (hasRunAuditEvent) return 'SUCCESS';
  return 'UNKNOWN';
}

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const organizationId = auth.session.user.organizationId;

  const [meta, rulesCount, actionsCount, latestAction, latestRunAudit, latestLog] = await Promise.all([
    prisma.metaConnection.findFirst({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      select: { status: true, tokenExpiresAt: true, testedAt: true, updatedAt: true }
    }),
    prisma.rule.count({ where: { organizationId } }),
    prisma.action.count({ where: { organizationId } }),
    prisma.action.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, status: true }
    }),
    prisma.auditLog.findFirst({
      where: { organizationId, eventType: { in: RUN_EVENT_TYPES } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, eventType: true }
    }),
    prisma.auditLog.findFirst({ where: { organizationId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true, eventType: true } })
  ]);

  const metaState = resolveMetaState(meta);
  const rulesConfigured = rulesCount > 0;
  const hasRun = actionsCount > 0 || Boolean(latestRunAudit);
  const hasLogs = Boolean(latestLog);

  const runTimestamps = [latestAction?.createdAt, latestRunAudit?.createdAt].filter(Boolean) as Date[];
  const lastRunAt = runTimestamps.length ? new Date(Math.max(...runTimestamps.map((date) => date.getTime()))) : null;

  // progress bar สรุปจาก checklist หลัก 5 ข้อบน dashboard
  const done = [metaState === 'CONNECTED', Boolean(meta?.testedAt), rulesConfigured, hasRun, hasLogs].filter(Boolean).length;

  return NextResponse.json({
    meta: {
      state: metaState,
      lastCheckedAt: meta?.testedAt ?? meta?.updatedAt ?? null,
      details: resolveMetaDetails(metaState)
    },
    rules: {
      configured: rulesConfigured,
      count: rulesCount
    },
    run: {
      hasRun,
      lastRunAt,
      lastRunStatus: resolveRunStatus(latestAction?.status ?? null, Boolean(latestRunAudit))
    },
    logs: {
      hasLogs,
      lastLogAt: latestLog?.createdAt ?? null,
      lastEventType: latestLog?.eventType ?? null
    },
    progress: {
      done,
      total: 5
    }
  });
}
