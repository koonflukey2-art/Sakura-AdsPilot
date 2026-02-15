'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Status = {
  connected: boolean;
  tested: boolean;
  campaignPicked: boolean;
  hasRule: boolean;
  hasRun: boolean;
  hasLogs: boolean;
};

const defaultStatus: Status = { connected: false, tested: false, campaignPicked: false, hasRule: false, hasRun: false, hasLogs: false };

export function DashboardOnboarding() {
  const [status, setStatus] = useState<Status>(defaultStatus);

  useEffect(() => {
    fetch('/api/onboarding/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setStatus({ ...defaultStatus, ...d }))
      .catch(() => setStatus(defaultStatus));
  }, []);

  const items = useMemo(() => ([
    { label: 'เชื่อมต่อ Meta API', done: status.connected, href: '/settings' },
    { label: 'ทดสอบการเชื่อมต่อ', done: status.tested, href: '/settings' },
    { label: 'เลือกแคมเปญที่จะควบคุม', done: status.campaignPicked, href: '/rules' },
    { label: 'สร้างกฎอัตโนมัติอย่างน้อย 1 ข้อ', done: status.hasRule, href: '/rules' },
    { label: 'ทดลองรันกฎ (Dry-run/Run now)', done: status.hasRun, href: '/rules' },
    { label: 'ตรวจสอบบันทึกกิจกรรม', done: status.hasLogs, href: '/logs' }
  ]), [status]);

  return (
    <Card className="space-y-3 p-5">
      <p className="text-lg font-semibold">เช็กลิสต์เริ่มใช้งานจริง</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl border border-border p-3">
            <p className="text-sm">{item.done ? '✅' : '⬜'} {item.label}</p>
            <Link href={item.href}><Button size="sm">ไปที่หน้านี้</Button></Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
