'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, FileText, PlayCircle, RefreshCcw, Settings2, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';

type MetaState = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';
type RunStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'UNKNOWN';

type DashboardStatus = {
  meta: { state: MetaState; lastCheckedAt: string | null; details: string };
  rules: { configured: boolean; count: number };
  run: { hasRun: boolean; lastRunAt: string | null; lastRunStatus: RunStatus };
  logs: { hasLogs: boolean; lastLogAt: string | null; lastEventType: string | null };
  progress: { done: number; total: number };
};

<<<<<<< HEAD
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
  if (state === 'CONNECTED') return { label: 'Connected', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  if (state === 'EXPIRED') return { label: 'Expired', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
  if (state === 'ERROR') return { label: 'Error', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
  return { label: 'Disconnected', className: 'bg-muted text-foreground/70' };
}

function runStatusBadge(status: RunStatus) {
  if (status === 'SUCCESS') return { label: 'สำเร็จ', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  if (status === 'FAILED') return { label: 'ล้มเหลว', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
  if (status === 'PENDING') return { label: 'กำลังประมวลผล', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' };
  if (status === 'SKIPPED') return { label: 'ข้ามการทำงาน', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
  return { label: 'Unknown', className: 'bg-muted text-foreground/70' };
}

function StatusChip({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs">
      <span className="text-foreground/60">{label}</span>
      <span className={`rounded-full px-2 py-0.5 font-medium ${className || 'bg-muted text-foreground/70'}`}>{value}</span>
    </div>
=======
const defaultStatus: Status = {
  connected: false,
  tested: false,
  campaignPicked: false,
  hasRule: false,
  hasRun: false,
  hasLogs: false
};

type Item = { key: keyof Status; label: string; hint: string; href: string };

function Dot({ done }: { done: boolean }) {
  return (
    <span
      className={[
        'h-3 w-3 rounded-full border',
        done ? 'border-emerald-400 bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]' : 'border-border bg-transparent'
      ].join(' ')}
      aria-label={done ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'}
    />
>>>>>>> 85fffad1 (Update dashboard/logs/rules UI + onboarding + validations)
  );
}

export function DashboardOnboarding() {
  const [status, setStatus] = useState<DashboardStatus>(fallbackStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/status', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('โหลดสถานะไม่สำเร็จ');
        return response.json();
      })
      .then((data: DashboardStatus) => {
        setStatus(data);
        setErrorMessage(null);
      })
      .catch(() => {
        setStatus(fallbackStatus);
        setErrorMessage('ไม่สามารถดึงสถานะล่าสุดได้ แสดงผลแบบ Unknown ชั่วคราว');
      })
      .finally(() => setIsLoading(false));
  }, []);

<<<<<<< HEAD
  const completionPercent = Math.min(100, Math.round((status.progress.done / Math.max(status.progress.total, 1)) * 100));
  const metaBadge = metaStateBadge(status.meta.state);
  const runBadge = runStatusBadge(status.run.lastRunStatus);

  const checklistItems = useMemo(
    () => [
      { label: 'เชื่อมต่อ Meta API', done: status.meta.state === 'CONNECTED', href: '/settings' },
      { label: 'ทดสอบการเชื่อมต่อสำเร็จ', done: Boolean(status.meta.lastCheckedAt), href: '/settings' },
      { label: 'มีกฎอัตโนมัติอย่างน้อย 1 ข้อ', done: status.rules.configured, href: '/rules' },
      { label: 'เคยรันกฎอย่างน้อย 1 ครั้ง', done: status.run.hasRun, href: '/rules' },
      { label: 'มีบันทึกกิจกรรมในระบบ', done: status.logs.hasLogs, href: '/logs' }
    ],
    [status]
  );

  // skeleton แบบย่อเพื่อลด layout shift ระหว่างโหลด
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
    <Card className="relative space-y-4 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold md:text-lg">Connection Summary</p>
          <p className="text-xs text-foreground/70 md:text-sm">
            สำเร็จ {status.progress.done}/{status.progress.total} ขั้นตอน • {status.meta.details}
          </p>
        </div>
        <details className="group">
          <summary className="list-none">
            <span className="inline-flex h-8 cursor-pointer items-center rounded-2xl bg-muted px-3 text-xs font-medium">ดูรายละเอียด</span>
          </summary>
          <div className="mt-2 w-full min-w-60 rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground/70 shadow-sm md:absolute md:right-6 md:z-10 md:max-w-sm">
            {errorMessage || 'ข้อมูลนี้อัปเดตจากสถานะจริงในระบบ'}
          </div>
        </details>
=======
  const items: Item[] = useMemo(
    () => [
      { key: 'connected', label: 'เชื่อมต่อ Meta', hint: 'ใส่ Ad Account + Token', href: '/settings' },
      { key: 'tested', label: 'ทดสอบการเชื่อมต่อ', hint: 'กด Test ให้ผ่าน', href: '/settings' },
      { key: 'campaignPicked', label: 'เลือกแคมเปญ/แอดเซ็ต', hint: 'กำหนดเป้าหมายที่จะควบคุม', href: '/rules' },
      { key: 'hasRule', label: 'สร้างกฎอย่างน้อย 1 ข้อ', hint: 'ตั้งกฎให้อ่านง่าย', href: '/rules' },
      { key: 'hasRun', label: 'ลองรันกฎ', hint: 'Dry-run/Run now', href: '/rules' },
      { key: 'hasLogs', label: 'ดูบันทึกกิจกรรม', hint: 'ตรวจผลการทำงาน', href: '/logs' }
    ],
    []
  );

  const doneCount = items.reduce((acc, it) => acc + (status[it.key] ? 1 : 0), 0);
  const nextItem = items.find((it) => !status[it.key]) ?? items[items.length - 1];

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">เช็คลิสต์เริ่มใช้งาน</p>
          <p className="text-xs text-foreground/60">
            ทำแล้ว {doneCount}/{items.length} • เหลือ {Math.max(items.length - doneCount, 0)} ขั้นตอน
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.map((it) => (
            <Dot key={it.key} done={Boolean(status[it.key])} />
          ))}
        </div>
      </div>

      {/* “ขั้นตอนถัดไป” แบบย่อ ไม่กินพื้นที่ */}
      {nextItem && (
        <Link
          href={nextItem.href}
          className="group block rounded-xl border border-border bg-muted/30 p-3 transition hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Dot done={Boolean(status[nextItem.key])} />
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

      {/* รายการทั้งหมดแบบ “คลิกทั้งแถวได้” */}
      <div className="space-y-2">
        {items.map((it) => {
          const done = Boolean(status[it.key]);
          return (
            <Link
              key={it.key}
              href={it.href}
              className={[
                'block rounded-xl border p-3 transition',
                done ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' : 'border-border bg-background hover:bg-muted/40'
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <Dot done={done} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug truncate">{it.label}</p>
                  <p className="text-xs text-foreground/60 truncate">{done ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'} • {it.hint}</p>
                </div>
                <span className="ml-auto text-xs text-foreground/60">ไปหน้า</span>
              </div>
            </Link>
          );
        })}
>>>>>>> 85fffad1 (Update dashboard/logs/rules UI + onboarding + validations)
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusChip label="Meta" value={metaBadge.label} className={metaBadge.className} />
        <StatusChip label="Rules" value={status.rules.configured ? `Configured (${status.rules.count})` : 'Not set'} className={status.rules.configured ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-foreground/70'} />
        <StatusChip label="Run" value={status.run.hasRun ? 'Has run' : 'No run'} className={status.run.hasRun ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-foreground/70'} />
        <StatusChip label="Logs" value={status.logs.hasLogs ? 'Available' : 'No logs'} className={status.logs.hasLogs ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-foreground/70'} />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
          <span>ความพร้อมของระบบ</span>
          <span>{completionPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
        </div>
      </div>

      {/* checklist ฉบับเต็มถูกยุบไว้เป็นค่าเริ่มต้นเพื่อไม่ดัน KPI/กราฟ */}
      <details className="rounded-xl border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Checklist แบบเต็ม</summary>
        <div className="mt-3 space-y-2">
          {checklistItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
              <p className="flex items-center gap-2 text-sm">
                {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4 text-foreground/40" />}
                {item.label}
              </p>
              <Link href={item.href} className="inline-flex h-8 items-center rounded-2xl bg-muted px-3 text-xs font-medium hover:opacity-90">เปิดหน้า</Link>
            </div>
          ))}

          <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground/70 md:grid-cols-2">
            <p className="flex items-center gap-2"><Settings2 className="h-3.5 w-3.5" />ตรวจล่าสุด Meta: {formatDate(status.meta.lastCheckedAt)}</p>
            <p className="flex items-center gap-2"><RefreshCcw className="h-3.5 w-3.5" />รันล่าสุด: {formatDate(status.run.lastRunAt)}</p>
            <p className="flex items-center gap-2"><PlayCircle className="h-3.5 w-3.5" />สถานะรันล่าสุด: <span className={`rounded-full px-2 py-0.5 ${runBadge.className}`}>{runBadge.label}</span></p>
            <p className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />บันทึกล่าสุด: {formatDate(status.logs.lastLogAt)}</p>
          </div>

          {errorMessage && (
            <p className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
              <TriangleAlert className="h-3.5 w-3.5" />
              {errorMessage}
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}
