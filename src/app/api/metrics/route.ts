import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-auth';

const ranges: Record<string, number> = { '7d': 7, '14d': 14, '30d': 30 };

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '30d';
  const days = ranges[range] ?? 30;
  const from = new Date();
  from.setDate(from.getDate() - days + 1);

  const metrics = await prisma.metric.findMany({
    where: { organizationId: auth.session.user.organizationId, date: { gte: from } },
    orderBy: { date: 'asc' }
  });

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

  const count = metrics.length || 1;
  return NextResponse.json({
    summary: {
      spend: summary.spend,
      conversions: summary.conversions,
      cpa: summary.conversions ? summary.spend / summary.conversions : 0,
      roas: summary.roas / count,
      ctr: summary.ctr / count,
      frequency: summary.frequency / count
    },
    series: metrics.map((m) => ({
      date: m.date,
      spend: Number(m.spend),
      roas: Number(m.roas),
      conversions: m.conversions
    }))
  });
}
