import { ActionStatus, ActionType, RuleScopeType, RuleType } from '@prisma/client';
import { prisma } from './prisma';
import { createAuditLog } from './audit';
import { fetchMetaAdsets, fetchMetaCampaigns, pauseAdset, updateAdsetDailyBudget } from './meta-api';
import { getMetaConnectionOrThrow } from './meta-connection';

function hourKey(date: Date) {
  return date.toISOString().slice(0, 13);
}

async function resolveAdsetTargets(rule: { scopeType: RuleScopeType; scopeIds: string[]; applyToAll: boolean }, adAccountId: string, token: string) {
  if (rule.scopeType === 'ACCOUNT') {
    const all = await fetchMetaAdsets(adAccountId, token);
    return all.map((a) => a.id);
  }

  if (rule.scopeType === 'CAMPAIGN') {
    const campaignIds = rule.applyToAll ? (await fetchMetaCampaigns(adAccountId, token)).map((c) => c.id) : rule.scopeIds;
    const byCampaign = await Promise.all(campaignIds.map((id) => fetchMetaAdsets(adAccountId, token, id)));
    return [...new Set(byCampaign.flat().map((a) => a.id))];
  }

  if (rule.applyToAll) {
    const all = await fetchMetaAdsets(adAccountId, token);
    return all.map((a) => a.id);
  }

  return rule.scopeIds;
}

export async function evaluateRules(organizationId: string, runAt = new Date()) {
  const rules = await prisma.rule.findMany({ where: { organizationId, isEnabled: true } });
  if (!rules.length) return [];

  const conn = await getMetaConnectionOrThrow(organizationId);
  const createdActionIds: string[] = [];

  for (const rule of rules) {
    const cfg = rule.configJson as Record<string, number>;
    const targetAdsets = await resolveAdsetTargets(rule, conn.adAccountId, conn.accessToken);

    for (const adsetId of targetAdsets) {
      const metric = await prisma.metric.findFirst({ where: { organizationId, adSetId: adsetId }, orderBy: { date: 'desc' } });
      if (!metric) continue;

      const idempotencyKey = `${organizationId}:${rule.id}:${adsetId}:${hourKey(runAt)}`;
      const exists = await prisma.action.findUnique({ where: { idempotencyKey } });
      if (exists) continue;

      let actionType: ActionType | null = null;
      let summary = '';
      if (rule.type === RuleType.CPA_BUDGET_REDUCTION && Number(metric.cpa) > Number(cfg.cpaCeiling) && metric.conversions >= Number(cfg.minConversions)) {
        actionType = ActionType.REDUCE_BUDGET;
        summary = `ลดงบ ${cfg.reducePercent}% จาก CPA ${Number(metric.cpa).toFixed(2)}`;
      }
      if (rule.type === RuleType.ROAS_PAUSE_ADSET && Number(metric.roas) < Number(cfg.roasFloor) && Number(metric.spend) >= Number(cfg.minSpend)) {
        actionType = ActionType.PAUSE_ADSET;
        summary = `หยุดแอดเซ็ตเมื่อ ROAS ต่ำกว่า ${cfg.roasFloor}`;
      }
      if (rule.type === RuleType.CTR_FATIGUE_ALERT && Number(metric.ctr) > 0 && Number(metric.frequency) >= Number(cfg.minFrequency)) {
        actionType = ActionType.NOTIFY_ONLY;
        summary = `แจ้งเตือน CTR fatigue ที่ adset ${adsetId}`;
      }
      if (!actionType) continue;

      const action = await prisma.action.create({
        data: {
          organizationId,
          ruleId: rule.id,
          actionType,
          targetRef: adsetId,
          summary,
          kpiSnapshotJson: metric,
          idempotencyKey,
          status: ActionStatus.PENDING,
          executedAt: runAt
        }
      });

      let status: ActionStatus = ActionStatus.SUCCESS;
      let resultMessage = 'บันทึกการดำเนินการแล้ว';
      try {
        if (rule.autoApply && actionType === ActionType.REDUCE_BUDGET) {
          const currentBudgetMinor = Math.max(100, Math.round(Number(metric.spend) * 100));
          const reducePct = Math.min(Number(cfg.reducePercent), rule.maxBudgetChangePerDay);
          const nextBudget = currentBudgetMinor * (1 - reducePct / 100);
          await updateAdsetDailyBudget(adsetId, conn.accessToken, nextBudget);
          resultMessage = `ปรับงบลง ${reducePct}% สำเร็จ`;
        } else if (rule.autoApply && actionType === ActionType.PAUSE_ADSET) {
          await pauseAdset(adsetId, conn.accessToken);
          resultMessage = 'สั่งหยุดแอดเซ็ตสำเร็จ';
        } else if (!rule.autoApply && actionType !== ActionType.NOTIFY_ONLY) {
          status = ActionStatus.SKIPPED;
          resultMessage = 'รอการอนุมัติ เนื่องจากยังไม่เปิด autoApply';
        } else {
          resultMessage = 'แจ้งเตือนเท่านั้น ไม่มีการเปลี่ยนแปลงบน Meta';
        }
      } catch (error) {
        status = ActionStatus.FAILED;
        resultMessage = error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ';
      }

      await prisma.action.update({ where: { id: action.id }, data: { status, resultMessage } });
      await prisma.notificationLog.create({
        data: {
          organizationId,
          channel: 'SYSTEM',
          recipient: 'RULE_ENGINE',
          payloadJson: { ruleId: rule.id, actionId: action.id, adsetId, summary },
          status
        }
      });
      await createAuditLog({
        organizationId,
        actorType: 'SYSTEM',
        actorLabel: 'rules-worker',
        eventType: 'RULE_ACTION_CREATED',
        entityType: 'ACTION',
        entityId: action.id,
        details: { ruleId: rule.id, adsetId, status, resultMessage }
      });

      createdActionIds.push(action.id);
    }
  }

  return prisma.action.findMany({ where: { id: { in: createdActionIds } }, include: { rule: true } });
}
