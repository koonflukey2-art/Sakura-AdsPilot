import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { DashboardChart } from '@/components/dashboard-chart';

export default async function DashboardPage() {
  const metrics = await prisma.metric.findMany({ orderBy: { date: 'asc' }, take: 30 });
  const latest = metrics.at(-1);

  const cards = [
    ['Spend', `$${Number(latest?.spend || 0).toFixed(2)}`],
    ['Conversions', `${latest?.conversions || 0}`],
    ['CPA', `$${Number(latest?.cpa || 0).toFixed(2)}`],
    ['ROAS', `${Number(latest?.roas || 0).toFixed(2)}x`],
    ['CTR', `${Number(latest?.ctr || 0).toFixed(2)}%`],
    ['Frequency', `${Number(latest?.frequency || 0).toFixed(2)}`]
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">KPI Dashboard</h2>
        <p className="text-sm text-foreground/60">Meta-only phase 1. Supports 7d / 14d / 30d / custom next.</p>
      </div>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-foreground/60">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>
      <Card className="p-5">
        <h3 className="mb-3 font-medium">Spend & ROAS Trend</h3>
        <DashboardChart data={metrics.map((m) => ({ date: new Date(m.date).toISOString().slice(5, 10), spend: Number(m.spend), roas: Number(m.roas) }))} />
      </Card>
    </div>
  );
}
