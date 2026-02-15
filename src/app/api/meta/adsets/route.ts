import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server-auth';
import { getMetaConnectionOrThrow } from '@/lib/meta-connection';
import { fetchMetaAdsets } from '@/lib/meta-api';

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId') || undefined;

  try {
    const conn = await getMetaConnectionOrThrow(auth.session.user.organizationId);
    const adsets = await fetchMetaAdsets(conn.adAccountId, conn.accessToken, campaignId);
    return NextResponse.json(adsets.map((a) => ({ id: a.id, name: a.name, status: a.status })));
  } catch (error) {
    return NextResponse.json({ error: 'กรุณาตั้งค่า Meta API ก่อน' }, { status: 400 });
  }
}
