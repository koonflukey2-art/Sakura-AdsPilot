import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server-auth';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  return NextResponse.json({
    success: true,
    message: 'ทดสอบการเชื่อมต่อสำเร็จ',
    account: { id: 'act_123456', name: 'บัญชีตัวอย่าง', timezone: 'Asia/Bangkok' }
  });
}
