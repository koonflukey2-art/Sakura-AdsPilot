import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return { error: NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 }) };
  }
  if (!session.user.isActive) {
    return { error: NextResponse.json({ error: 'บัญชีผู้ใช้ถูกปิดการใช้งาน' }, { status: 403 }) };
  }
  return { session };
}

export function forbidden(message = 'คุณไม่มีสิทธิ์ทำรายการนี้') {
  return NextResponse.json({ error: message }, { status: 403 });
}
