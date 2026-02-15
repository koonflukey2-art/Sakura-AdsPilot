import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageUsers } from '@/lib/rbac';
import { requireSession, forbidden } from '@/lib/server-auth';
import { usersFilterSchema } from '@/lib/validations';

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (!canManageUsers(auth.session.user.role)) return forbidden();

  const { searchParams } = new URL(req.url);
  const parsed = usersFilterSchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const where = {
    organizationId: auth.session.user.organizationId,
    ...(parsed.data.query
      ? {
          OR: [
            { email: { contains: parsed.data.query, mode: 'insensitive' as const } },
            { name: { contains: parsed.data.query, mode: 'insensitive' as const } }
          ]
        }
      : {}),
    ...(parsed.data.role ? { role: parsed.data.role } : {}),
    ...(parsed.data.status ? { isActive: parsed.data.status === 'ACTIVE' } : {})
  };

  const users = await prisma.user.findMany({
    where,
    take: parsed.data.limit + 1,
    ...(parsed.data.cursor ? { skip: 1, cursor: { id: parsed.data.cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
  });

  const nextCursor = users.length > parsed.data.limit ? users[parsed.data.limit].id : null;
  return NextResponse.json({ items: users.slice(0, parsed.data.limit), nextCursor });
}
