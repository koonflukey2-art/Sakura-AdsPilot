'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';

type LogItem = {
  id: string;
  createdAt: string;
  eventType: string;
  actorLabel: string;
  entityType: string;
  entityId: string;
  detailsJson: unknown;
};

function safeStringify(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function truncateMiddle(text: string, head = 10, tail = 8) {
  if (!text) return '';
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

const TH_RULE_TYPE: Record<string, string> = {
  CPA_BUDGET_REDUCTION: 'ลดงบเมื่อ CPA สูง',
  ROAS_PAUSE_ADSET: 'หยุด Ad Set เมื่อ ROAS ต่ำ',
  CTR_FATIGUE_ALERT: 'แจ้งเตือนเมื่อ CTR เริ่มล้า (Fatigue)',
};

const TH_ACTION_TYPE: Record<string, string> = {
  REDUCE_BUDGET: 'ลดงบ',
  PAUSE_ADSET: 'หยุด Ad Set',
  NOTIFY_ONLY: 'แจ้งเตือนอย่างเดียว',
};

const TH_META_STATUS: Record<string, string> = {
  CONNECTED: 'เชื่อมต่อแล้ว',
  DISCONNECTED: 'ยังไม่ได้เชื่อมต่อ',
  ERROR: 'เชื่อมต่อมีปัญหา',
};

function ruleTypeTh(v: any) {
  const key = String(v ?? '').toUpperCase();
  return (TH_RULE_TYPE[key] ?? key) || '-';
}
function actionTypeTh(v: any) {
  const key = String(v ?? '').toUpperCase();
  return (TH_ACTION_TYPE[key] ?? key) || '-';
}
function metaStatusTh(v: any) {
  const key = String(v ?? '').toUpperCase();
  return (TH_META_STATUS[key] ?? key) || 'ไม่ทราบสถานะ';
}

function pickDetails(details: unknown) {
  const d = (details ?? {}) as Record<string, any>;
  return {
    status: d?.status ?? d?.meta?.status,
    hasToken: d?.hasToken ?? d?.meta?.hasToken,
    adAccountId: d?.adAccountId ?? d?.meta?.adAccountId,
    ruleName: d?.name,
    ruleType: d?.type,
    email: d?.email,
    actionType: d?.actionType ?? d?.action?.type,
    targetRef: d?.targetRef ?? d?.target,
    message: d?.message ?? d?.errorMessage,
  };
}

function summarizeDetails(eventType: string, details: unknown): string {
  const p = pickDetails(details);

  switch (eventType) {
    case 'SETTINGS_META_UPDATED': {
      const parts: string[] = [];
      parts.push(`Meta: ${metaStatusTh(p.status)}`);
      parts.push(`โทเคน: ${p.hasToken ? 'มี' : 'ไม่มี'}`);
      if (p.adAccountId) parts.push(`บัญชีโฆษณา: ${truncateMiddle(String(p.adAccountId))}`);
      return parts.join(' • ');
    }
    case 'RULE_CREATED':
      return `สร้างกฎ: “${p.ruleName ?? 'ไม่ระบุชื่อ'}” • ${ruleTypeTh(p.ruleType)}`;
    case 'RULE_UPDATED':
      return `อัปเดตกฎ: “${p.ruleName ?? 'ไม่ระบุชื่อ'}” • ${ruleTypeTh(p.ruleType)}`;
    case 'USER_REGISTERED':
      return `สมัครผู้ใช้ใหม่: ${p.email ?? '-'}`;
    case 'ACTION_CREATED': {
      const t = p.actionType ? actionTypeTh(p.actionType) : 'ดำเนินการ';
      const target = p.targetRef ? truncateMiddle(String(p.targetRef)) : '-';
      return `สร้างรายการดำเนินการ: ${t} • เป้าหมาย: ${target}`;
    }
    case 'ACTION_FAILED': {
      const t = p.actionType ? actionTypeTh(p.actionType) : 'ดำเนินการ';
      return `ดำเนินการไม่สำเร็จ: ${t}${p.message ? ` • ${String(p.message)}` : ''}`;
    }
    default: {
      const d = (details ?? {}) as Record<string, any>;
      const keys = Object.keys(d || {});
      if (!keys.length) return 'ไม่มีรายละเอียดเพิ่มเติม';
      const picked = keys.slice(0, 3).map((k) => `${k}: ${String(d[k])}`);
      return picked.join(' • ');
    }
  }
}

function humanizeLog(eventType: string, details: unknown) {
  const p = pickDetails(details);

  switch (eventType) {
    case 'SETTINGS_META_UPDATED': {
      const parts: string[] = [];
      parts.push(`สถานะการเชื่อมต่อ Meta: ${metaStatusTh(p.status)}`);
      parts.push(`โทเคน: ${p.hasToken ? 'พร้อมใช้งาน' : 'ยังไม่มี/ไม่พร้อมใช้งาน'}`);
      if (p.adAccountId) parts.push(`บัญชีโฆษณา: ${String(p.adAccountId)}`);
      return {
        title: 'อัปเดตการเชื่อมต่อ Meta',
        message: parts.join(' • '),
        hint:
          String(p.status || '').toUpperCase() === 'DISCONNECTED'
            ? 'ไปที่เมนู “ตั้งค่า” เพื่อกรอกข้อมูล Meta และกด “ทดสอบการเชื่อมต่อ”'
            : undefined,
      };
    }
    case 'RULE_CREATED':
      return {
        title: 'สร้างกฎอัตโนมัติ',
        message: `สร้างกฎ “${p.ruleName ?? 'ไม่ระบุชื่อ'}” สำเร็จ • ประเภท: ${ruleTypeTh(p.ruleType)}`,
      };
    case 'RULE_UPDATED':
      return {
        title: 'อัปเดตกฎอัตโนมัติ',
        message: `อัปเดตกฎ “${p.ruleName ?? 'ไม่ระบุชื่อ'}” สำเร็จ • ประเภท: ${ruleTypeTh(p.ruleType)}`,
      };
    case 'USER_REGISTERED':
      return { title: 'สมัครผู้ใช้งาน', message: `มีการสมัครผู้ใช้งานใหม่: ${p.email ?? '-'}` };
    case 'ACTION_FAILED':
      return {
        title: 'ดำเนินการไม่สำเร็จ',
        message: `การดำเนินการ: ${p.actionType ? actionTypeTh(p.actionType) : 'ดำเนินการ'} ไม่สำเร็จ${
          p.message ? ` • สาเหตุ: ${String(p.message)}` : ''
        }`,
      };
    default: {
      const d = (details ?? {}) as Record<string, any>;
      const keys = Object.keys(d || {});
      if (!keys.length) return { title: 'กิจกรรม', message: 'ไม่มีรายละเอียดเพิ่มเติม' };
      const picked = keys.slice(0, 5).map((k) => `${k}: ${String(d[k])}`);
      return { title: 'กิจกรรม', message: picked.join(' • ') };
    }
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [eventType, setEventType] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<LogItem | null>(null);
  const [showTech, setShowTech] = useState(false);

  const loadLogs = async (next?: string | null) => {
    const params = new URLSearchParams();
    if (eventType) params.set('eventType', eventType);
    if (next) params.set('cursor', next);

    const res = await fetch(`/api/audit-logs?${params.toString()}`);
    const data = await res.json();
    setLogs(data.items || []);
    setCursor(data.nextCursor);
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType]);

  const rows = useMemo(() => {
    return logs.map((l) => ({
      ...l,
      timeText: new Date(l.createdAt).toLocaleString('th-TH'),
      entityText: `${l.entityType}:${truncateMiddle(l.entityId, 8, 6)}`,
      detailSummary: summarizeDetails(l.eventType, l.detailsJson),
    }));
  }, [logs]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">บันทึกกิจกรรม</h2>

      <div className="flex flex-wrap gap-2">
        <input
          className="w-full max-w-sm rounded-xl border border-border bg-background px-3 py-2"
          placeholder="กรองตาม eventType เช่น RULE_CREATED"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-3">เวลา</th>
                <th className="p-3">เหตุการณ์</th>
                <th className="p-3">ผู้กระทำ</th>
                <th className="p-3">รายการ</th>
                <th className="p-3">รายละเอียด (สรุป)</th>
                <th className="p-3 text-right">ดู</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-border/50 align-top">
                  <td className="p-3 whitespace-nowrap">{l.timeText}</td>
                  <td className="p-3 whitespace-nowrap font-medium">{l.eventType}</td>
                  <td className="p-3 whitespace-nowrap">{l.actorLabel}</td>
                  <td className="p-3 whitespace-nowrap">{l.entityText}</td>
                  <td className="p-3">
                    <div className="max-w-[520px] truncate text-foreground/90" title={l.detailSummary}>
                      {l.detailSummary}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="rounded-xl bg-muted px-3 py-2 text-xs hover:bg-muted/80"
                      onClick={() => {
                        setActive(l);
                        setShowTech(false);
                        setOpen(true);
                      }}
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td className="p-6 text-center text-foreground/60" colSpan={6}>
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {cursor && (
        <button className="rounded-xl bg-muted px-3 py-2 text-sm hover:bg-muted/80" onClick={() => loadLogs(cursor)}>
          หน้าถัดไป
        </button>
      )}

      {open && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-4">
              <div>
                <p className="text-sm text-foreground/60">รายละเอียดกิจกรรม</p>
                <p className="text-lg font-semibold">{active.eventType}</p>
                <p className="mt-1 text-sm text-foreground/70">
                  {new Date(active.createdAt).toLocaleString('th-TH')} • {active.actorLabel} • {active.entityType}:{truncateMiddle(active.entityId, 10, 8)}
                </p>
              </div>
              <button className="rounded-xl bg-muted px-3 py-2 text-sm hover:bg-muted/80" onClick={() => setOpen(false)}>
                ปิด
              </button>
            </div>

            <div className="space-y-3 p-4">
              {(() => {
                const h = humanizeLog(active.eventType, active.detailsJson);
                return (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <p className="text-sm text-foreground/60">{h.title}</p>
                    <p className="mt-1 text-base font-medium">{h.message}</p>
                    {h.hint && <p className="mt-2 text-sm text-foreground/70">คำแนะนำ: {h.hint}</p>}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/60">สำหรับผู้ใช้ทั่วไปให้ดูข้อความด้านบน</p>
                <button
                  className="rounded-xl bg-muted px-3 py-2 text-sm hover:bg-muted/80"
                  onClick={() => setShowTech((s) => !s)}
                >
                  {showTech ? 'ซ่อนข้อมูลเทคนิค' : 'ดูข้อมูลเทคนิค'}
                </button>
              </div>

              {showTech && (
                <pre className="max-h-[55vh] overflow-auto rounded-xl bg-muted p-4 text-xs leading-relaxed">
{safeStringify(active.detailsJson)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
