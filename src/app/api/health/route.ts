import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, service: 'meta-ads-autopilot', time: new Date().toISOString() });
}
