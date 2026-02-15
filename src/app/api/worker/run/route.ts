import { NextResponse } from 'next/server';
import { evaluateRules } from '@/lib/rules-engine';
import { sendEmail, sendLine } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const actions = await evaluateRules();
  for (const action of actions) {
    const text = `[${action.rule.name}] ${action.summary}`;
    await Promise.all([sendEmail(`Autopilot action: ${action.rule.name}`, `<p>${text}</p>`), sendLine(text)]);
    await prisma.auditLog.create({ data: { actorType: 'SYSTEM', actorLabel: 'worker', eventType: 'RULE_TRIGGERED', entityType: 'ACTION', entityId: action.id, detailsJson: { summary: action.summary, actionType: action.actionType, kpi: action.kpiSnapshotJson } } });
  }
  return NextResponse.json({ ok: true, count: actions.length });
}
