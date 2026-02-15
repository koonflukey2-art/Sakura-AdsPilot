import { ActionType, Prisma, RuleType } from '@prisma/client';
import { prisma } from './prisma';

export async function evaluateRules(organizationId: string, runAt = new Date()) {
  const rules = await prisma.rule.findMany({ where: { organizationId, isEnabled: true } });
  const latest = await prisma.metric.findFirst({ where: { organizationId }, orderBy: { date: 'desc' } });
  if (!latest) return [];

  const actions: Prisma.ActionCreateManyInput[] = [];

  for (const rule of rules) {
    const key = `${organizationId}:${rule.id}:${runAt.toISOString().slice(0, 13)}:${latest.adSetId || 'global'}`;
    const exists = await prisma.action.findUnique({ where: { idempotencyKey: key } });
    if (exists) continue;

    const cfg = rule.configJson as Record<string, number>;
    if (rule.type === RuleType.CPA_BUDGET_REDUCTION && Number(latest.cpa) > Number(cfg.cpaCeiling) && latest.conversions >= Number(cfg.minConversions)) {
      actions.push({ organizationId, ruleId: rule.id, actionType: ActionType.REDUCE_BUDGET, targetRef: latest.adSetId || 'adset_001', summary: `ลดงบ ${cfg.reduceByPercent}%`, kpiSnapshotJson: latest, idempotencyKey: key, status: 'SUCCESS', executedAt: runAt });
    }

    if (rule.type === RuleType.ROAS_PAUSE_ADSET) {
      const days = await prisma.metric.findMany({ where: { organizationId, date: { gte: new Date(Date.now() - Number(cfg.consecutiveDays || 0) * 86400000) } }, orderBy: { date: 'desc' }, take: Number(cfg.consecutiveDays || 0) });
      const worsening = days.length >= Number(cfg.consecutiveDays || 0) && Number(days[0].roas) < Number(days.at(-1)?.roas ?? 999);
      if (days.length > 0 && days.every((d) => Number(d.roas) < Number(cfg.roasTarget)) && worsening) {
        actions.push({ organizationId, ruleId: rule.id, actionType: ActionType.PAUSE_ADSET, targetRef: latest.adSetId || 'adset_001', summary: 'หยุดแอดเซ็ตจาก ROAS ต่ำต่อเนื่อง', kpiSnapshotJson: days, idempotencyKey: key, status: 'SUCCESS', executedAt: runAt });
      }
    }

    if (rule.type === RuleType.CTR_FATIGUE_ALERT) {
      const prev = await prisma.metric.findMany({ where: { organizationId }, orderBy: { date: 'desc' }, take: 2 });
      if (prev.length === 2) {
        const drop = ((Number(prev[1].ctr) - Number(prev[0].ctr)) / Number(prev[1].ctr)) * 100;
        if (drop >= Number(cfg.ctrDropPercent) && Number(prev[0].frequency) >= Number(cfg.minFrequency)) {
          actions.push({ organizationId, ruleId: rule.id, actionType: ActionType.NOTIFY_ONLY, targetRef: latest.adSetId || 'adset_001', summary: 'แจ้งเตือนครีเอทีฟล้า', kpiSnapshotJson: prev, idempotencyKey: key, status: 'SUCCESS', executedAt: runAt });
        }
      }
    }
  }

  if (actions.length) await prisma.action.createMany({ data: actions, skipDuplicates: true });
  return prisma.action.findMany({ where: { idempotencyKey: { in: actions.map((a) => a.idempotencyKey) } }, include: { rule: true } });
}
