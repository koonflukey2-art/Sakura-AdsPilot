import { ActionType, Prisma, RuleType } from '@prisma/client';
import { prisma } from './prisma';

export async function evaluateRules(runAt = new Date()) {
  const rules = await prisma.rule.findMany({ where: { isEnabled: true } });
  const latest = await prisma.metric.findFirst({ orderBy: { date: 'desc' } });
  if (!latest) return [];

  const actions: Prisma.ActionCreateManyInput[] = [];

  for (const rule of rules) {
    const key = `${rule.id}:${runAt.toISOString().slice(0, 13)}:${latest.adSetId || 'global'}`;
    const exists = await prisma.action.findUnique({ where: { idempotencyKey: key } });
    if (exists) continue;

    const cfg = rule.configJson as any;
    if (rule.type === RuleType.CPA_BUDGET_REDUCTION && Number(latest.cpa) > cfg.cpaCeiling && latest.conversions >= cfg.minConversions) {
      actions.push({ ruleId: rule.id, actionType: ActionType.REDUCE_BUDGET, targetRef: latest.adSetId || 'adset_001', summary: `Reduce budget by ${cfg.reduceByPercent}%`, kpiSnapshotJson: latest as any, idempotencyKey: key, status: 'SUCCESS', executedAt: runAt });
    }

    if (rule.type === RuleType.ROAS_PAUSE_ADSET) {
      const days = await prisma.metric.findMany({ where: { date: { gte: new Date(Date.now() - cfg.consecutiveDays * 86400000) } }, orderBy: { date: 'desc' }, take: cfg.consecutiveDays });
      const worsening = days.length >= cfg.consecutiveDays && Number(days[0].roas) < Number(days.at(-1)?.roas ?? 999);
      if (days.every((d) => Number(d.roas) < cfg.roasTarget) && worsening) {
        actions.push({ ruleId: rule.id, actionType: ActionType.PAUSE_ADSET, targetRef: latest.adSetId || 'adset_001', summary: 'Pause adset due to sustained low ROAS', kpiSnapshotJson: days as any, idempotencyKey: key, status: 'SUCCESS', executedAt: runAt });
      }
    }

    if (rule.type === RuleType.CTR_FATIGUE_ALERT) {
      const prev = await prisma.metric.findMany({ orderBy: { date: 'desc' }, take: 2 });
      if (prev.length === 2) {
        const drop = ((Number(prev[1].ctr) - Number(prev[0].ctr)) / Number(prev[1].ctr)) * 100;
        if (drop >= cfg.ctrDropPercent && Number(prev[0].frequency) >= cfg.minFrequency) {
          actions.push({ ruleId: rule.id, actionType: ActionType.NOTIFY_ONLY, targetRef: latest.adSetId || 'adset_001', summary: 'Creative fatigue alert', kpiSnapshotJson: prev as any, idempotencyKey: key, status: 'SUCCESS', executedAt: runAt });
        }
      }
    }
  }

  if (actions.length) await prisma.action.createMany({ data: actions });
  return prisma.action.findMany({ where: { idempotencyKey: { in: actions.map((a) => a.idempotencyKey) } }, include: { rule: true } });
}
