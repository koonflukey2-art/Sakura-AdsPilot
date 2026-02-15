import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

export default async function RulesPage() {
  const rules = await prisma.rule.findMany({ orderBy: { updatedAt: 'desc' } });
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Rule Engine</h2>
      {rules.map((rule) => (
        <Card key={rule.id} className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{rule.name}</p>
              <p className="text-sm text-foreground/60">{rule.description}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs">{rule.isEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <p className="text-sm text-foreground/70">Guardrails: Max change {rule.maxBudgetChangePerDay}%/day, Cooldown {rule.cooldownHours}h, {rule.autoApply ? 'Auto-apply' : 'Suggest-only'}</p>
          <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(rule.configJson, null, 2)}</pre>
        </Card>
      ))}
      {rules.length === 0 && <Card className="p-6 text-sm text-foreground/60">No rules yet.</Card>}
    </div>
  );
}
