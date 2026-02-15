import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { DashboardChart } from '@/components/dashboard-chart';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ranges: Record<string, number> = { '7d': 7, '14d': 14, '30d': 30 };

export default async function DashboardPage({ searchParams }: { searchParams: { range?: string } }) {
  const range = searchParams.range || '30d';
  const days = ranges[range] ?? 30;
  const from = new Date();
  from.setDate(from.getDate() - days + 1);

  const session = await getServerSession(authOptions);
  const organizationId = session?.user.organizationId || '';
  const metrics = await prisma.metric.findMany({ where: { organizationId, date: { gte: from } }, orderBy: { date: 'asc' }, take: 120 });
  const summary = metrics.reduce(
    (acc, cur) => {
      acc.spend += Number(cur.spend);
      acc.conversions += cur.conversions;
      acc.roas += Number(cur.roas);
      acc.ctr += Number(cur.ctr);
      acc.frequency += Number(cur.frequency);
      return acc;
    },
    { spend: 0, conversions: 0, roas: 0, ctr: 0, frequency: 0 }
  );
  const c = metrics.length || 1;

  const cards = [
    ['งบรวม', `฿${summary.spend.toFixed(2)}`],
    ['คอนเวอร์ชัน', `${summary.conversions}`],
    ['CPA เฉลี่ย', `฿${(summary.conversions ? summary.spend / summary.conversions : 0).toFixed(2)}`],
    ['ROAS เฉลี่ย', `${(summary.roas / c).toFixed(2)}x`],
    ['CTR เฉลี่ย', `${(summary.ctr / c).toFixed(2)}%`],
    ['Frequency เฉลี่ย', `${(summary.frequency / c).toFixed(2)}`]
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">แดชบอร์ด KPI</h2>
          <p className="text-sm text-foreground/60">คำนวณจากข้อมูลจริงในฐานข้อมูล</p>
        </div>
        <div className="flex gap-2 text-sm">
          {['7d', '14d', '30d'].map((r) => (
            <a key={r} href={`/dashboard?range=${r}`} className={`rounded-xl px-3 py-1 ${range === r ? 'bg-primary text-background' : 'bg-muted'}`}>
              {r}
            </a>
          ))}
        </div>
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
        <h3 className="mb-3 font-medium">แนวโน้มงบและ ROAS</h3>
        <DashboardChart data={metrics.map((m) => ({ date: new Date(m.date).toISOString().slice(5, 10), spend: Number(m.spend), roas: Number(m.roas) }))} />
      </Card>
    </div>
  );
}
