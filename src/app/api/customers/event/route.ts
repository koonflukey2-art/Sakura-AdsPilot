import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-auth';

const eventSchema = z.object({
  customerId: z.string().trim().min(1),
  eventType: z.enum(['IDENTIFIED', 'PAGE_VIEW', 'MESSAGE', 'ORDER', 'CUSTOM']).default('CUSTOM'),
  occurredAt: z.string().datetime().optional(),
  payload: z.record(z.any()).optional()
});

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const parsed = eventSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organizationId = auth.session.user.organizationId;
  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, organizationId },
    select: { id: true }
  });

  if (!customer) {
    return NextResponse.json({ error: 'customer not found' }, { status: 404 });
  }

  const occurredAt = parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date();

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.customerEvent.create({
      data: {
        organizationId,
        customerId: customer.id,
        eventType: parsed.data.eventType,
        occurredAt,
        payloadJson: parsed.data.payload ?? {}
      }
    });

    await tx.customer.update({ where: { id: customer.id }, data: { lastSeenAt: occurredAt } });
    return created;
  });

  return NextResponse.json(event);
}
