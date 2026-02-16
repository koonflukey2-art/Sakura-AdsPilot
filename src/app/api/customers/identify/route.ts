import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-auth';
import { createAuditLog } from '@/lib/audit';

const identifySchema = z.object({
  provider: z.string().trim().min(1),
  value: z.string().trim().min(1),
  displayName: z.string().trim().optional()
});

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const parsed = identifySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organizationId = auth.session.user.organizationId;
  const { provider, value, displayName } = parsed.data;
  const now = new Date();

  const existingIdentity = await prisma.customerIdentity.findUnique({
    where: { provider_value: { provider, value } },
    include: { customer: true }
  });

  if (existingIdentity && existingIdentity.customer.organizationId !== organizationId) {
    return NextResponse.json({ error: 'identity already belongs to another organization' }, { status: 409 });
  }

  const customer = await prisma.$transaction(async (tx) => {
    if (existingIdentity) {
      return tx.customer.update({
        where: { id: existingIdentity.customerId },
        data: {
          lastSeenAt: now,
          ...(displayName ? { displayName } : {})
        }
      });
    }

    return tx.customer.create({
      data: {
        organizationId,
        displayName: displayName || null,
        firstSeenAt: now,
        lastSeenAt: now,
        identities: {
          create: {
            provider,
            value
          }
        }
      }
    });
  });

  await createAuditLog({
    organizationId,
    actorId: auth.session.user.id,
    actorLabel: auth.session.user.email || auth.session.user.id,
    eventType: existingIdentity ? 'CUSTOMER_IDENTIFIED_RETURNING' : 'CUSTOMER_IDENTIFIED_NEW',
    entityType: 'CUSTOMER',
    entityId: customer.id,
    details: {
      provider,
      value,
      isReturning: Boolean(existingIdentity)
    }
  });

  return NextResponse.json({
    customerId: customer.id,
    isReturning: Boolean(existingIdentity)
  });
}
