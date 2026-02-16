import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-auth';

const listSchema = z.object({
  query: z.string().trim().optional(),
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const parsed = listSchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organizationId = auth.session.user.organizationId;
  const query = parsed.data.query;

  const customers = await prisma.customer.findMany({
    where: {
      organizationId,
      ...(query
        ? {
            OR: [
              { displayName: { contains: query, mode: 'insensitive' } },
              {
                identities: {
                  some: {
                    OR: [
                      { provider: { contains: query, mode: 'insensitive' } },
                      { value: { contains: query, mode: 'insensitive' } }
                    ]
                  }
                }
              }
            ]
          }
        : {})
    },
    orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
    include: {
      identities: {
        select: { provider: true, value: true }
      },
      _count: {
        select: { events: true, orders: true }
      }
    },
    take: parsed.data.limit + 1,
    ...(parsed.data.cursor ? { skip: 1, cursor: { id: parsed.data.cursor } } : {})
  });

  const hasMore = customers.length > parsed.data.limit;
  const items = hasMore ? customers.slice(0, parsed.data.limit) : customers;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return NextResponse.json({ items, nextCursor });
}
