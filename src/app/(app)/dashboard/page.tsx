import { Card } from '@/components/ui/card';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DEFAULT_ORGANIZATION_NAME } from '@/lib/constants';
import { DashboardOnboarding } from '@/components/dashboard-onboarding';
import { DashboardChart } from '@/components/dashboard-chart';
import { prisma } from '@/lib/prisma';

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
      return acc;
    },
    { spend: 0, conversions: 0, roas: 0 }
  );
  const c = metrics.length || 1;

  const welcomeName = session?.user.name || session?.user.email || 'ผู้ใช้งาน';
  const roleLabel = session?.user.role === 'ADMIN' ? 'แอดมิน' : 'พนักงาน';

  return (
    <div className="space-y-6">
      {session?.user && (
        <Card className="space-y-2 border border-primary/20 bg-gradient-to-r from-primary/20 to-transparent p-5">
          <p className="text-xl font-semibold">ยินดีต้อนรับ, {welcomeName}</p>
          <p className="text-sm text-foreground/70">บทบาท: {roleLabel} • องค์กร: {DEFAULT_ORGANIZATION_NAME}</p>
        </Card>
      )}

      <DashboardOnboarding />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-foreground/60">งบรวม</p><p className="mt-1 text-2xl font-semibold">฿{summary.spend.toFixed(2)}</p></Card>
        <Card className="p-5"><p className="text-sm text-foreground/60">คอนเวอร์ชัน</p><p className="mt-1 text-2xl font-semibold">{summary.conversions}</p></Card>
        <Card className="p-5"><p className="text-sm text-foreground/60">ROAS เฉลี่ย</p><p className="mt-1 text-2xl font-semibold">{(summary.roas / c).toFixed(2)}x</p></Card>
      </section>

      <Card className="p-5">
        <h3 className="mb-3 font-medium">แนวโน้มงบและ ROAS</h3>
        <DashboardChart data={metrics.map((m) => ({ date: new Date(m.date).toISOString().slice(5, 10), spend: Number(m.spend), roas: Number(m.roas) }))} />
      </Card>
    </div>
  );
}
