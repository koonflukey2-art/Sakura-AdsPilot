import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server-auth';
import { getMetaConnectionOrThrow } from '@/lib/meta-connection';
import { fetchMetaCampaigns } from '@/lib/meta-api';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  try {
    const conn = await getMetaConnectionOrThrow(auth.session.user.organizationId);
    const campaigns = await fetchMetaCampaigns(conn.adAccountId, conn.accessToken);
    return NextResponse.json(campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status })));
  } catch (error) {
    return NextResponse.json({ error: 'กรุณาตั้งค่า Meta API ก่อน' }, { status: 400 });
  }
}
