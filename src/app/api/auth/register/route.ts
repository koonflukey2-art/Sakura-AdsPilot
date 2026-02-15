import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ORGANIZATION_NAME } from '@/lib/constants';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 409 });
  }

  const organization = await prisma.organization.upsert({
    where: { name: DEFAULT_ORGANIZATION_NAME },
    update: {},
    create: { name: DEFAULT_ORGANIZATION_NAME }
  });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: 'EMPLOYEE'
    },
    select: { id: true, email: true, name: true, role: true }
  });

  await createAuditLog({
    organizationId: organization.id,
    actorId: user.id,
    actorLabel: user.email,
    eventType: 'USER_REGISTERED',
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email }
  });

  return NextResponse.json({ success: true, user });
}
