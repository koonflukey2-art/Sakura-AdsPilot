import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/server-auth';

const suggestionCreateSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  payload: z.record(z.any()).optional(),
  status: z.enum(['PENDING', 'APPLIED', 'DISMISSED']).optional()
});

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 20) || 20, 1), 100);

  const items = await prisma.aiSuggestion.findMany({
    where: { organizationId: auth.session.user.organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const parsed = suggestionCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.aiSuggestion.create({
    data: {
      organizationId: auth.session.user.organizationId,
      title: parsed.data.title,
      summary: parsed.data.summary,
      payloadJson: parsed.data.payload ?? {},
      status: parsed.data.status ?? 'PENDING',
      createdBy: auth.session.user.id
    }
  });

  return NextResponse.json(item, { status: 201 });
}
