import { createHash } from 'crypto';
import { ActionStatus, ActionType, Rule, RuleType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchAdsets, getOrgMetaConnection, pauseAdset, updateBudget } from '@/lib/meta-client';

function hashKey(parts: string[]) {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

function getActionType(ruleType: RuleType): ActionType {
  if (ruleType === 'CPA_BUDGET_REDUCTION') return 'REDUCE_BUDGET';
  if (ruleType === 'ROAS_PAUSE_ADSET') return 'PAUSE_ADSET';
  return 'NOTIFY_ONLY';
}

function shouldTrigger(rule: Rule, metric: { cpa: number; conversions: number; roas: number; spend: number; frequency: number }) {
  const cfg = (rule.configJson || {}) as Record<string, number>;

  if (rule.type === 'CPA_BUDGET_REDUCTION') {
    const reducePercent = Math.min(Number(cfg.reducePercent || 0), rule.maxBudgetChangePerDay);
    return {
      triggered: metric.cpa > Number(cfg.cpaCeiling || 0) && metric.conversions >= Number(cfg.minConversions || 0),
      summary: `ลดงบ ${reducePercent}% จาก CPA ${metric.cpa.toFixed(2)}`,
      plannedBudgetChangePercent: reducePercent
    };
  }

  if (rule.type === 'ROAS_PAUSE_ADSET') {
    return {
      triggered: metric.roas < Number(cfg.roasFloor || 0) && metric.spend >= Number(cfg.minSpend || 0),
      summary: `หยุดแอดเซ็ตเมื่อ ROAS ต่ำกว่า ${Number(cfg.roasFloor || 0)}`,
      plannedBudgetChangePercent: 0
    };
  }

  return {
    triggered: metric.frequency >= Number(cfg.minFrequency || 0),
    summary: 'แจ้งเตือน CTR fatigue',
    plannedBudgetChangePercent: 0
  };
}

async function getRuleTargets(rule: Rule, adAccountId: string, accessToken: string) {
  if (rule.scopeType === 'ADSET') {
    if (rule.applyToAll) {
      const adsets = await fetchAdsets(adAccountId, accessToken);
      return adsets.ok ? adsets.data.map((item) => item.id) : [];
    }
    return rule.scopeIds;
  }

  if (rule.scopeType === 'CAMPAIGN') {
    if (!rule.applyToAll && !rule.scopeIds.length) return [];

    const targetCampaignIds = rule.applyToAll ? undefined : new Set(rule.scopeIds);
    const adsets = await fetchAdsets(adAccountId, accessToken);
    if (!adsets.ok) return [];
    return adsets.data.filter((item) => (targetCampaignIds ? targetCampaignIds.has(item.campaign_id || '') : true)).map((item) => item.id);
  }

  const adsets = await fetchAdsets(adAccountId, accessToken);
  return adsets.ok ? adsets.data.map((item) => item.id) : [];
}

async function exceededDailyBudgetChange(rule: Rule, targetRef: string, todayStart: Date) {
  const todayActions = await prisma.action.findMany({
    where: {
      organizationId: rule.organizationId,
      ruleId: rule.id,
      targetRef,
      actionType: 'REDUCE_BUDGET',
      status: { in: ['PENDING', 'SUCCESS'] },
      createdAt: { gte: todayStart }
    },
    select: { kpiSnapshotJson: true }
  });

  const used = todayActions.reduce((sum, action) => {
    const snapshot = action.kpiSnapshotJson as { plannedBudgetChangePercent?: number };
    return sum + Number(snapshot.plannedBudgetChangePercent || 0);
  }, 0);

  return used >= rule.maxBudgetChangePerDay;
}

export async function evaluateRulesForOrganization(organizationId: string, now = new Date()) {
  const rules = await prisma.rule.findMany({ where: { organizationId, isEnabled: true }, orderBy: { createdAt: 'asc' } });
  if (!rules.length) return [];

  const conn = await getOrgMetaConnection(organizationId);
  if (!conn.ok) return [];

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const createdActionIds: string[] = [];

  for (const rule of rules) {
    const targets = await getRuleTargets(rule, conn.adAccountId, conn.accessToken);

    for (const targetRef of targets) {
      const latestMetric = await prisma.metric.findFirst({ where: { organizationId, adSetId: targetRef }, orderBy: { date: 'desc' } });
      if (!latestMetric) continue;

      const latestAction = await prisma.action.findFirst({
        where: { organizationId, ruleId: rule.id, targetRef },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });
      const cooldownMs = rule.cooldownHours * 60 * 60 * 1000;
      if (latestAction && now.getTime() - latestAction.createdAt.getTime() < cooldownMs) continue;

      const metric = {
        cpa: Number(latestMetric.cpa),
        conversions: latestMetric.conversions,
        roas: Number(latestMetric.roas),
        spend: Number(latestMetric.spend),
        frequency: Number(latestMetric.frequency)
      };

      const evaluated = shouldTrigger(rule, metric);
      if (!evaluated.triggered) continue;

      const actionType = getActionType(rule.type);
      if (actionType === 'REDUCE_BUDGET' && (await exceededDailyBudgetChange(rule, targetRef, todayStart))) {
        continue;
      }

      const bucket = `${now.toISOString().slice(0, 13)}:${Math.floor(now.getMinutes() / 10)}`;
      const idempotencyKey = hashKey([organizationId, rule.id, targetRef, actionType, bucket]);

      const created = await prisma.action
        .create({
          data: {
            organizationId,
            ruleId: rule.id,
            actionType,
            targetRef,
            summary: evaluated.summary,
            kpiSnapshotJson: { ...metric, plannedBudgetChangePercent: evaluated.plannedBudgetChangePercent },
            idempotencyKey,
            status: ActionStatus.PENDING
          },
          select: { id: true }
        })
        .catch(() => null);

      if (created?.id) createdActionIds.push(created.id);
    }
  }

  return prisma.action.findMany({ where: { id: { in: createdActionIds } }, include: { rule: true } });
}

export async function executePendingAction(actionId: string) {
  const action = await prisma.action.findUnique({ where: { id: actionId }, include: { rule: true } });
  if (!action || action.status !== 'PENDING') return null;

  const conn = await getOrgMetaConnection(action.organizationId);
  if (!conn.ok) {
    return prisma.action.update({
      where: { id: action.id },
      data: { status: 'FAILED', resultMessage: conn.error, executedAt: new Date() }
    });
  }

  let status: ActionStatus = 'SUCCESS';
  let resultMessage = 'ดำเนินการสำเร็จ';

  if (!action.rule.autoApply && action.actionType !== 'NOTIFY_ONLY') {
    status = 'SKIPPED';
    resultMessage = 'รอการอนุมัติ เนื่องจากยังไม่เปิด autoApply';
  } else if (action.actionType === 'REDUCE_BUDGET') {
    const snapshot = action.kpiSnapshotJson as { spend?: number; plannedBudgetChangePercent?: number };
    const currentBudgetMinor = Math.max(100, Math.round(Number(snapshot.spend || 0) * 100));
    const changePercent = Number(snapshot.plannedBudgetChangePercent || 0);
    const nextBudget = currentBudgetMinor * (1 - changePercent / 100);
    const res = await updateBudget(action.targetRef, conn.accessToken, nextBudget);
    if (!res.ok) {
      status = 'FAILED';
      resultMessage = res.error;
    } else {
      resultMessage = `ปรับงบลง ${changePercent}% สำเร็จ`;
    }
  } else if (action.actionType === 'PAUSE_ADSET') {
    const res = await pauseAdset(action.targetRef, conn.accessToken);
    if (!res.ok) {
      status = 'FAILED';
      resultMessage = res.error;
    } else {
      resultMessage = 'สั่งหยุดแอดเซ็ตสำเร็จ';
    }
  } else {
    resultMessage = 'แจ้งเตือนเท่านั้น ไม่มีการเปลี่ยนแปลงบน Meta';
  }

  return prisma.action.update({
    where: { id: action.id },
    data: { status, resultMessage, executedAt: new Date() },
    include: { rule: true }
  });
}
