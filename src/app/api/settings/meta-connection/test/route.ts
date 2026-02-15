import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server-auth';
import { getMetaConnectionOrThrow } from '@/lib/meta-connection';
import { fetchMetaCampaigns } from '@/lib/meta-api';

export async function POST() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  try {
    const conn = await getMetaConnectionOrThrow(auth.session.user.organizationId);
    const campaigns = await fetchMetaCampaigns(conn.adAccountId, conn.accessToken);
    return NextResponse.json({ ok: true, messageThai: 'ทดสอบการเชื่อมต่อสำเร็จ', details: { campaignsCount: campaigns.length } });
  } catch {
    return NextResponse.json({ ok: false, messageThai: 'ทดสอบการเชื่อมต่อไม่ผ่าน กรุณาตรวจสอบ Token หรือบัญชีโฆษณาอีกครั้ง' }, { status: 400 });
  }
}
