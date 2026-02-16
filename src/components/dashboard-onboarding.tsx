'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, RefreshCcw } from 'lucide-react';

type OnboardingStatus = {
  connected: boolean;
  tested: boolean;
  campaignPicked: boolean;
  hasRule: boolean;
  hasRun: boolean;
  hasLogs: boolean;
};

const defaultStatus: OnboardingStatus = {
  connected: false,
  tested: false,
  campaignPicked: false,
  hasRule: false,
  hasRun: false,
  hasLogs: false
};

type ChecklistItem = {
  key: keyof OnboardingStatus;
  label: string;
  hint: string;
  href: string;
};

const items: ChecklistItem[] = [
  { key: 'connected', label: 'เชื่อมต่อ Meta', hint: 'เพิ่มบัญชีโฆษณาและโทเค็นในการตั้งค่า', href: '/settings' },
  { key: 'tested', label: 'ทดสอบการเชื่อมต่อ', hint: 'กดปุ่มทดสอบในหน้า Settings', href: '/settings' },
  { key: 'campaignPicked', label: 'เลือกขอบเขตกฎ', hint: 'ตั้ง Scope เป็นแคมเปญหรือแอดเซ็ต', href: '/rules' },
  { key: 'hasRule', label: 'สร้างกฎอัตโนมัติ', hint: 'อย่างน้อย 1 กฎที่พร้อมใช้งาน', href: '/rules' },
  { key: 'hasRun', label: 'รัน worker', hint: 'ทดลองรันรอบแรกเพื่อสร้าง Action', href: '/logs' },
  { key: 'hasLogs', label: 'มี audit log', hint: 'ยืนยันว่าระบบมีบันทึกกิจกรรม', href: '/logs' }
];

function Dot({ done }: { done: boolean }) {
  return <span className={["h-2.5 w-2.5 rounded-full", done ? 'bg-emerald-400' : 'bg-zinc-500/50'].join(' ')} aria-hidden />;
}

export function DashboardOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/onboarding/status', { cache: 'no-store' });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      setError(data?.error || 'ไม่สามารถโหลดสถานะ onboarding ได้');
      setLoading(false);
      return;
    }

    setStatus({ ...defaultStatus, ...data });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const progress = useMemo(() => {
    const done = items.filter((item) => status[item.key]).length;
    return { done, total: items.length, percent: Math.round((done / items.length) * 100) };
  }, [status]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/70">ความพร้อมระบบ</span>
        <button onClick={load} className="inline-flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground" type="button">
          <RefreshCcw className="h-3.5 w-3.5" /> รีเฟรช
        </button>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="text-xs text-foreground/60">สำเร็จ {progress.done}/{progress.total} ขั้นตอน</p>

      {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">{error}</p>}

      <div className="space-y-2">
        {items.map((item) => {
          const done = status[item.key];
          return (
            <Link key={item.key} href={item.href} className="block rounded-xl border border-border/60 bg-background p-3 hover:bg-muted/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Dot done={done} />
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">{item.hint}</p>
                </div>
                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <CircleDashed className="h-4 w-4 text-foreground/40" />}
              </div>
            </Link>
          );
        })}
      </div>

      {loading && <p className="text-xs text-foreground/60">กำลังโหลด…</p>}
    </div>
  );
}
