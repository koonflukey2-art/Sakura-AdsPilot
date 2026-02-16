'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, RefreshCcw } from 'lucide-react';
import {
  CheckCircle2,
  CircleDashed,
  FileText,
  PlayCircle,
  RefreshCcw,
  Settings2,
  TriangleAlert
} from 'lucide-react';
import { Card } from '@/components/ui/card';

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
const fallbackStatus: DashboardStatus = {
  meta: { state: 'DISCONNECTED', lastCheckedAt: null, details: 'ยังไม่ทราบสถานะ' },
  rules: { configured: false, count: 0 },
  run: { hasRun: false, lastRunAt: null, lastRunStatus: 'UNKNOWN' },
  logs: { hasLogs: false, lastLogAt: null, lastEventType: null },
  progress: { done: 0, total: 5 }
};

function formatDate(value: string | null) {
  if (!value) return 'ยังไม่มีข้อมูล';
  return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function metaStateBadge(state: MetaState) {
  if (state === 'CONNECTED')
    return { label: 'Connected', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  if (state === 'EXPIRED')
    return { label: 'Expired', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
  if (state === 'ERROR')
    return { label: 'Error', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
  return { label: 'Disconnected', className: 'bg-muted text-foreground/70' };
}

function runStatusBadge(status: RunStatus) {
  if (status === 'SUCCESS')
    return { label: 'สำเร็จ', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  if (status === 'FAILED')
    return { label: 'ล้มเหลว', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
  if (status === 'PENDING')
    return { label: 'กำลังประมวลผล', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' };
  if (status === 'SKIPPED')
    return { label: 'ข้ามการทำงาน', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
  return { label: 'Unknown', className: 'bg-muted text-foreground/70' };
}

function StatusChip({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs">
      <span className="text-foreground/60">{label}</span>
      <span className={`rounded-full px-2 py-0.5 font-medium ${className || 'bg-muted text-foreground/70'}`}>
        {value}
      </span>
    </div>
  );
}

function Dot({ done }: { done: boolean }) {
  return (
    <span
      className={[
        'h-3 w-3 rounded-full border',
        done ? 'border-emerald-400 bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]' : 'border-border bg-transparent'
      ].join(' ')}
      aria-label={done ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'}
    />
  );
}

type SimpleItem = { key: string; label: string; hint: string; href: string; done: boolean };

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
    // ถ้าคุณมี endpoint จริงเป็น /api/onboarding/status ก็เปลี่ยนกลับได้
    fetch('/api/onboarding/status', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('โหลดสถานะไม่สำเร็จ');
        return response.json();
      })
      .then((data) => {
        // รองรับทั้งโครงแบบใหม่ (DashboardStatus) และโครงเดิม (connected/tested/hasRule...)
        if (data?.meta && data?.rules && data?.run && data?.logs && data?.progress) {
          setStatus(data as DashboardStatus);
        } else {
          // mapping จาก status แบบเดิม → DashboardStatus แบบใหม่
          const legacy = data as {
            connected?: boolean;
            tested?: boolean;
            campaignPicked?: boolean;
            hasRule?: boolean;
            hasRun?: boolean;
            hasLogs?: boolean;
          };

          const connected = Boolean(legacy.connected);
          const tested = Boolean(legacy.tested);
          const hasRule = Boolean(legacy.hasRule);
          const hasRun = Boolean(legacy.hasRun);
          const hasLogs = Boolean(legacy.hasLogs);

          const done = [connected, tested, hasRule, hasRun, hasLogs].filter(Boolean).length;

          setStatus({
            meta: {
              state: connected ? 'CONNECTED' : 'DISCONNECTED',
              lastCheckedAt: tested ? new Date().toISOString() : null,
              details: connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'
            },
            rules: { configured: hasRule, count: hasRule ? 1 : 0 },
            run: { hasRun, lastRunAt: hasRun ? new Date().toISOString() : null, lastRunStatus: hasRun ? 'SUCCESS' : 'UNKNOWN' },
            logs: { hasLogs, lastLogAt: hasLogs ? new Date().toISOString() : null, lastEventType: null },
            progress: { done, total: 5 }
          });
        }

        setErrorMessage(null);
      })
      .catch(() => {
        setStatus(fallbackStatus);
        setErrorMessage('ไม่สามารถดึงสถานะล่าสุดได้ แสดงผลแบบ Unknown ชั่วคราว');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const completionPercent = Math.min(100, Math.round((status.progress.done / Math.max(status.progress.total, 1)) * 100));
  const metaBadge = metaStateBadge(status.meta.state);
  const runBadge = runStatusBadge(status.run.lastRunStatus);

  const items: SimpleItem[] = useMemo(() => {
    const metaConnected = status.meta.state === 'CONNECTED';
    const testedOk = Boolean(status.meta.lastCheckedAt);

    return [
      { key: 'connected', label: 'เชื่อมต่อ Meta', hint: 'ใส่ Ad Account + Token', href: '/settings', done: metaConnected },
      { key: 'tested', label: 'ทดสอบการเชื่อมต่อ', hint: 'กด Test ให้ผ่าน', href: '/settings', done: testedOk },
      { key: 'hasRule', label: 'สร้างกฎอย่างน้อย 1 ข้อ', hint: 'ตั้งกฎให้อ่านง่าย', href: '/rules', done: status.rules.configured },
      { key: 'hasRun', label: 'ลองรันกฎ', hint: 'Dry-run/Run now', href: '/rules', done: status.run.hasRun },
      { key: 'hasLogs', label: 'ดูบันทึกกิจกรรม', hint: 'ตรวจผลการทำงาน', href: '/logs', done: status.logs.hasLogs }
    ];
  }, [status]);

  const doneCount = items.reduce((acc, it) => acc + (it.done ? 1 : 0), 0);
  const nextItem = items.find((it) => !it.done) ?? items[items.length - 1];

  if (isLoading) {
    return (
      <Card className="space-y-3 p-4">
        <div className="h-6 w-56 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-2 w-full animate-pulse rounded bg-muted" />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold md:text-lg">เช็คลิสต์เริ่มใช้งาน</p>
          <p className="text-xs text-foreground/70 md:text-sm">
            ทำแล้ว {doneCount}/{items.length} ขั้นตอน • {status.meta.details}
          </p>
        </div>

        <details className="group">
          <summary className="list-none">
            <span className="inline-flex h-8 cursor-pointer items-center rounded-2xl bg-muted px-3 text-xs font-medium">
              ดูรายละเอียด
            </span>
          </summary>
          <div className="mt-2 w-full min-w-60 rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground/70 shadow-sm md:absolute md:right-6 md:z-10 md:max-w-sm">
            {errorMessage || 'สถานะนี้อัปเดตจากระบบจริง'}
          </div>
        </details>
      </div>

      {/* dots progress */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {items.map((it) => (
            <Dot key={it.key} done={it.done} />
          ))}
        </div>

        <div className="text-xs text-foreground/60">
          ความพร้อม: <span className="font-medium text-foreground">{completionPercent}%</span>
        </div>
      </div>

      {/* next step compact */}
      {nextItem && (
        <Link
          href={nextItem.href}
          className="group block rounded-xl border border-border bg-muted/30 p-3 transition hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Dot done={nextItem.done} />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug truncate">{nextItem.label}</p>
              <p className="text-xs text-foreground/60 truncate">{nextItem.hint} • คลิกเพื่อไปหน้า {nextItem.href}</p>
            </div>
            <span className="ml-auto rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground/70 group-hover:text-foreground">
              ไปหน้า
            </span>
          </div>
        </Link>
      )}

      {/* list */}
      <div className="space-y-2">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className={[
              'block rounded-xl border p-3 transition',
              it.done ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' : 'border-border bg-background hover:bg-muted/40'
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <Dot done={it.done} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug truncate">{it.label}</p>
                <p className="text-xs text-foreground/60 truncate">{it.done ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'} • {it.hint}</p>
              </div>
              <span className="ml-auto text-xs text-foreground/60">ไปหน้า</span>
            </div>
          </Link>
        ))}
      </div>

      {/* chips */}
      <div className="flex flex-wrap gap-2">
        <StatusChip label="Meta" value={metaBadge.label} className={metaBadge.className} />
        <StatusChip
          label="Rules"
          value={status.rules.configured ? `Configured (${status.rules.count})` : 'Not set'}
          className={status.rules.configured ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-foreground/70'}
        />
        <StatusChip
          label="Run"
          value={status.run.hasRun ? 'Has run' : 'No run'}
          className={status.run.hasRun ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-foreground/70'}
        />
        <StatusChip
          label="Logs"
          value={status.logs.hasLogs ? 'Available' : 'No logs'}
          className={status.logs.hasLogs ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-foreground/70'}
        />
      </div>

      {/* progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
          <span>ความพร้อมของระบบ</span>
          <span>{completionPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
        </div>
      </div>

      {/* expand full details */}
      <details className="rounded-xl border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">ข้อมูลเพิ่มเติม</summary>

        <div className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground/70 md:grid-cols-2">
          <p className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5" />
            ตรวจล่าสุด Meta: {formatDate(status.meta.lastCheckedAt)}
          </p>
          <p className="flex items-center gap-2">
            <RefreshCcw className="h-3.5 w-3.5" />
            รันล่าสุด: {formatDate(status.run.lastRunAt)}
          </p>
          <p className="flex items-center gap-2">
            <PlayCircle className="h-3.5 w-3.5" />
            สถานะรันล่าสุด: <span className={`rounded-full px-2 py-0.5 ${runBadge.className}`}>{runBadge.label}</span>
          </p>
          <p className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            บันทึกล่าสุด: {formatDate(status.logs.lastLogAt)}
          </p>
        </div>

        {errorMessage && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
            <TriangleAlert className="h-3.5 w-3.5" />
            {errorMessage}
          </p>
        )}
      </details>
    </Card>
  );
}
