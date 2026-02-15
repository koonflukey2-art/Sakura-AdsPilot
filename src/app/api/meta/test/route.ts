import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Meta connection stub OK',
    account: { id: 'act_123456', name: 'Mock Account', timezone: 'Asia/Bangkok' }
  });
}
