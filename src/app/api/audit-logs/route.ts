import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-auth';
import { logsFilterSchema } from '@/lib/validations';

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const parsed = logsFilterSchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const where = {
    organizationId: auth.session.user.organizationId,
    ...(parsed.data.eventType ? { eventType: parsed.data.eventType } : {}),
    ...(parsed.data.entityType ? { entityType: parsed.data.entityType } : {}),
    ...(parsed.data.actor ? { actorLabel: { contains: parsed.data.actor, mode: 'insensitive' as const } } : {}),
    ...(parsed.data.startDate || parsed.data.endDate
      ? {
          createdAt: {
            ...(parsed.data.startDate ? { gte: new Date(parsed.data.startDate) } : {}),
            ...(parsed.data.endDate ? { lte: new Date(parsed.data.endDate) } : {})
          }
        }
      : {})
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parsed.data.limit + 1,
    ...(parsed.data.cursor ? { skip: 1, cursor: { id: parsed.data.cursor } } : {})
  });

  const nextCursor = logs.length > parsed.data.limit ? logs[parsed.data.limit].id : null;
  return NextResponse.json({ items: logs.slice(0, parsed.data.limit), nextCursor });
}
