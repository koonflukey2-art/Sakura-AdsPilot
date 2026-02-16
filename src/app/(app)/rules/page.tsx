'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ruleSchema } from '@/lib/validations';

type RuleType = 'CPA_BUDGET_REDUCTION' | 'ROAS_PAUSE_ADSET' | 'CTR_FATIGUE_ALERT';
type ScopeType = 'ACCOUNT' | 'CAMPAIGN' | 'ADSET';
type MetaItem = { id: string; name: string; status: string };

type Rule = {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  isEnabled: boolean;
  autoApply: boolean;
  maxBudgetChangePerDay: number;
  cooldownHours: number;
  configJson: Record<string, unknown>;
  scopeType: ScopeType;
  scopeIds: string[];
  applyToAll: boolean;
  createdAt: string;
  updatedAt: string;
};

type RuleFormState = {
  name: string;
  description: string;
  type: RuleType;
  autoApply: boolean;
  isEnabled: boolean;
  maxBudgetChangePerDay: number;
  cooldownHours: number;
  scopeType: ScopeType;
  scopeIds: string[];
  applyToAll: boolean;
  configJson: {
    cpaCeiling: number;
    reducePercent: number;
    minConversions: number;
    roasFloor: number;
    minSpend: number;
    ctrDropPercent: number;
    minFrequency: number;
  };
};

type FieldErrors = Partial<Record<string, string>>;

type PlatformKey = 'META' | 'TIKTOK' | 'SHOPEE';

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  CPA_BUDGET_REDUCTION: 'ลดงบเมื่อ CPA สูงเกินกำหนด',
  ROAS_PAUSE_ADSET: 'หยุดแอดเซ็ตเมื่อ ROAS ต่ำ',
  CTR_FATIGUE_ALERT: 'แจ้งเตือนเมื่อ CTR เริ่มล้า'
};

const RULE_TYPE_BADGE: Record<RuleType, { label: string; className: string }> = {
  CPA_BUDGET_REDUCTION: { label: 'CPA', className: 'bg-sky-500/15 text-sky-200 border-sky-500/20' },
  ROAS_PAUSE_ADSET: { label: 'ROAS', className: 'bg-violet-500/15 text-violet-200 border-violet-500/20' },
  CTR_FATIGUE_ALERT: { label: 'CTR', className: 'bg-amber-500/15 text-amber-200 border-amber-500/20' }
};

const SCOPE_LABELS: Record<ScopeType, string> = {
  ACCOUNT: 'ทั้งบัญชี',
  CAMPAIGN: 'เลือกแคมเปญ',
  ADSET: 'เลือกแอดเซ็ต'
};

const initialForm: RuleFormState = {
  name: '',
  description: '',
  type: 'CPA_BUDGET_REDUCTION',
  autoApply: false,
  isEnabled: true,
  maxBudgetChangePerDay: 20,
  cooldownHours: 24,
  scopeType: 'ACCOUNT',
  scopeIds: [],
  applyToAll: true,
  configJson: {
    cpaCeiling: 50,
    reducePercent: 10,
    minConversions: 5,
    roasFloor: 1.2,
    minSpend: 500,
    ctrDropPercent: 20,
    minFrequency: 2
  }
};

function getRuleConfigPayload(form: RuleFormState): Record<string, number> {
  if (form.type === 'CPA_BUDGET_REDUCTION') {
    return {
      cpaCeiling: Number(form.configJson.cpaCeiling),
      reducePercent: Number(form.configJson.reducePercent),
      minConversions: Number(form.configJson.minConversions)
    };
  }
  if (form.type === 'ROAS_PAUSE_ADSET') {
    return {
      roasFloor: Number(form.configJson.roasFloor),
      minSpend: Number(form.configJson.minSpend)
    };
  }
  return {
    ctrDropPercent: Number(form.configJson.ctrDropPercent),
    minFrequency: Number(form.configJson.minFrequency)
  };
}

function parseRuleToForm(rule: Rule): RuleFormState {
  const config = (rule.configJson || {}) as Record<string, number>;
  return {
    ...initialForm,
    name: rule.name,
    description: rule.description,
    type: rule.type,
    autoApply: rule.autoApply,
    isEnabled: rule.isEnabled,
    maxBudgetChangePerDay: rule.maxBudgetChangePerDay,
    cooldownHours: rule.cooldownHours,
    scopeType: rule.scopeType,
    scopeIds: rule.scopeIds ?? [],
    applyToAll: rule.applyToAll,
    configJson: {
      ...initialForm.configJson,
      cpaCeiling: Number(config.cpaCeiling ?? initialForm.configJson.cpaCeiling),
      reducePercent: Number(config.reducePercent ?? initialForm.configJson.reducePercent),
      minConversions: Number(config.minConversions ?? initialForm.configJson.minConversions),
      roasFloor: Number(config.roasFloor ?? initialForm.configJson.roasFloor),
      minSpend: Number(config.minSpend ?? initialForm.configJson.minSpend),
      ctrDropPercent: Number(config.ctrDropPercent ?? initialForm.configJson.ctrDropPercent),
      minFrequency: Number(config.minFrequency ?? initialForm.configJson.minFrequency)
    }
  };
}

function extractErrorMap(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
}

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={[
        'inline-block h-2.5 w-2.5 rounded-full',
        on ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'bg-zinc-500/50'
      ].join(' ')}
      aria-label={on ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
      title={on ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
    />
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs', className || 'border-border/40 bg-muted/30 text-foreground/80'].join(' ')}>
      {children}
    </span>
  );
}

export default function RulesPage() {
  const { toast } = useToast();

  const [rules, setRules] = useState<Rule[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [form, setForm] = useState<RuleFormState>(initialForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<MetaItem[]>([]);
  const [queryTarget, setQueryTarget] = useState('');
  const [connected, setConnected] = useState(false);

  // list filters
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | RuleType>('ALL');
  const [enabledFilter, setEnabledFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');

  // future-ready platform selector (UI only)
  const [platform, setPlatform] = useState<PlatformKey>('META');

  const formTitle = useMemo(() => (editingRuleId ? 'แก้ไขกฎอัตโนมัติ' : 'สร้างกฎอัตโนมัติใหม่'), [editingRuleId]);

  const loadRules = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/rules', { cache: 'no-store' });
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules([]);
    } finally {
      setLoadingList(false);
    }
  };

  const loadConnection = async () => {
    try {
      const res = await fetch('/api/settings/meta-connection', { cache: 'no-store' });
      const data = await res.json();
      setConnected(Boolean(data?.connected));
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    loadRules();
    loadConnection();
  }, []);

  const setConfigValue = (key: keyof RuleFormState['configJson'], value: number) => {
    setForm((prev) => ({ ...prev, configJson: { ...prev.configJson, [key]: value } }));
  };

  const fetchTargets = async () => {
    if (!connected) return;
    const endpoint = form.scopeType === 'ADSET' ? '/api/meta/adsets' : '/api/meta/campaigns';
    const res = await fetch(endpoint, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) return toast({ type: 'error', title: 'ดึงรายการไม่สำเร็จ', description: data.error || 'กรุณาลองใหม่' });
    setItems(Array.isArray(data) ? data : []);
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    // NOTE: ตอนนี้ backend รองรับ Meta เป็นหลัก
    if (platform !== 'META') {
      return toast({ type: 'error', title: 'ยังไม่รองรับ', description: 'ตอนนี้รองรับ Meta ก่อน (TikTok/Shopee จะมาในอนาคต)' });
    }

    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      autoApply: form.autoApply,
      isEnabled: form.isEnabled,
      maxBudgetChangePerDay: Number(form.maxBudgetChangePerDay),
      cooldownHours: Number(form.cooldownHours),
      configJson: getRuleConfigPayload(form),
      scopeType: form.scopeType,
      scopeIds: form.scopeType === 'ACCOUNT' || form.applyToAll ? [] : form.scopeIds,
      applyToAll: form.scopeType === 'ACCOUNT' ? true : form.applyToAll
    };

    const parsed = ruleSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(extractErrorMap(parsed.error));
      return toast({ type: 'error', title: 'ข้อมูลไม่ถูกต้อง', description: 'กรุณาตรวจสอบข้อมูลที่กรอก' });
    }

    setSaving(true);
    const res = await fetch(editingRuleId ? `/api/rules/${editingRuleId}` : '/api/rules', {
      method: editingRuleId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      return toast({
        type: 'error',
        title: 'บันทึกกฎไม่สำเร็จ',
        description: data?.error?.formErrors?.[0] || data?.error || 'กรุณาลองใหม่'
      });
    }

    setForm(initialForm);
    setEditingRuleId(null);
    setErrors({});
    toast({ type: 'success', title: 'บันทึกกฎเรียบร้อยแล้ว' });
    loadRules();
  };

  const deleteRule = async (id: string) => {
    const ok = window.confirm('ต้องการลบกฎนี้ใช่ไหม? (ลบแล้วกู้คืนไม่ได้)');
    if (!ok) return;

    const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast({ type: 'error', title: 'ลบไม่สำเร็จ', description: data?.error || 'กรุณาลองใหม่' });

    toast({ type: 'success', title: 'ลบกฎเรียบร้อยแล้ว' });
    if (editingRuleId === id) {
      setEditingRuleId(null);
      setForm(initialForm);
      setErrors({});
    }
    loadRules();
  };

  const startEdit = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setForm(parseRuleToForm(rule));
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setForm(initialForm);
    setErrors({});
  };

  const filteredTargets = items.filter((i) => i.name.toLowerCase().includes(queryTarget.toLowerCase()) || i.id.includes(queryTarget));
  const InputError = ({ path }: { path: string }) => (errors[path] ? <p className="mt-1 text-xs text-red-400">{errors[path]}</p> : null);

  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => {
        const s = `${r.name} ${r.description}`.toLowerCase();
        const okQ = !q.trim() || s.includes(q.toLowerCase());
        const okType = typeFilter === 'ALL' ? true : r.type === typeFilter;
        const okEnabled = enabledFilter === 'ALL' ? true : enabledFilter === 'ENABLED' ? r.isEnabled : !r.isEnabled;
        return okQ && okType && okEnabled;
      })
      .sort((a, b) => (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }, [rules, q, typeFilter, enabledFilter]);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">กฎอัตโนมัติ</h2>
          <p className="text-sm text-foreground/60">สร้างกฎที่ “อ่านง่าย” และ “ใช้งานจริง” ได้ทันที</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/20 px-3 py-1 text-xs">
            <Dot on={connected} />
            {connected ? 'เชื่อมต่อ Meta แล้ว' : 'ยังไม่ได้เชื่อมต่อ Meta'}
          </span>

          {!connected && (
            <Link href="/settings">
              <Button className="rounded-full px-4 py-2 text-sm">ไปเชื่อมต่อที่ตั้งค่า</Button>
            </Link>
          )}
        </div>
      </div>

      {/* LAYOUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        {/* LEFT: LIST */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_180px_auto] md:items-center">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <span className="text-foreground/50">🔎</span>
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="ค้นหากฎ (ชื่อ/คำอธิบาย)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="ALL">ทุกประเภท</option>
                {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={enabledFilter}
                onChange={(e) => setEnabledFilter(e.target.value as any)}
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="ENABLED">เปิดใช้งาน</option>
                <option value="DISABLED">ปิดใช้งาน</option>
              </select>

              <Button className="rounded-xl px-4 py-2 text-sm" onClick={loadRules} disabled={loadingList}>
                {loadingList ? 'กำลังโหลด...' : 'รีเฟรช'}
              </Button>
            </div>
          </Card>

          {filteredRules.length === 0 ? (
            <Card className="p-6">
              <p className="font-medium">ยังไม่มีกฎ</p>
              <p className="mt-1 text-sm text-foreground/60">เริ่มจากสร้างกฎใหม่ทางด้านขวาได้เลย</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRules.map((rule) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold">{rule.name}</p>

                        <Chip className={['border', RULE_TYPE_BADGE[rule.type].className].join(' ')}>
                          {RULE_TYPE_BADGE[rule.type].label}
                        </Chip>

                        <Chip className={rule.isEnabled ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-200' : 'border-zinc-500/30 bg-zinc-500/15 text-zinc-200'}>
                          {rule.isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </Chip>

                        <Chip className={rule.autoApply ? 'border-sky-500/20 bg-sky-500/15 text-sky-200' : 'border-zinc-500/30 bg-zinc-500/15 text-zinc-200'}>
                          {rule.autoApply ? 'ยิงจริงอัตโนมัติ' : 'โหมดปลอดภัย'}
                        </Chip>
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-foreground/60">{rule.description}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
                        <Chip>เป้าหมาย: {SCOPE_LABELS[rule.scopeType]} {rule.applyToAll ? '(ทั้งหมด)' : `(${rule.scopeIds.length} รายการ)`}</Chip>
                        <Chip>คูลดาวน์: {rule.cooldownHours} ชม.</Chip>
                        <Chip>ปรับงบ/วัน: {rule.maxBudgetChangePerDay}%</Chip>
                        <span className="ml-1 text-foreground/40">
                          อัปเดต: {new Date(rule.updatedAt).toLocaleString('th-TH')}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Button className="rounded-xl px-4 py-2 text-sm" onClick={() => startEdit(rule)}>
                        แก้ไข
                      </Button>

                      <Button
                        className="rounded-xl px-4 py-2 text-sm"
                        onClick={() => deleteRule(rule.id)}
                        // ทำให้ดูเป็นปุ่มลบแบบนิ่ม ๆ
                        style={{ background: 'rgba(244,63,94,0.12)' }}
                      >
                        ลบ
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: FORM */}
        <div className="lg:sticky lg:top-6">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{formTitle}</h3>
                <p className="mt-1 text-sm text-foreground/60">ตั้งค่าให้อ่านง่ายและปรับได้เร็ว</p>
              </div>

              {editingRuleId && (
                <Button className="rounded-xl px-3 py-2 text-sm" onClick={cancelEdit}>
                  ยกเลิก
                </Button>
              )}
            </div>

            {/* platform tabs */}
            <div className="mt-4">
              <p className="text-sm font-medium">แพลตฟอร์ม</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform('META')}
                  className={[
                    'rounded-full border px-4 py-2 text-sm',
                    platform === 'META' ? 'border-border bg-muted/30' : 'border-border/40 text-foreground/60'
                  ].join(' ')}
                >
                  Meta
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('TIKTOK')}
                  className="rounded-full border border-border/40 px-4 py-2 text-sm text-foreground/50"
                  title="ยังไม่รองรับ"
                >
                  TikTok (เร็วๆนี้)
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('SHOPEE')}
                  className="rounded-full border border-border/40 px-4 py-2 text-sm text-foreground/50"
                  title="ยังไม่รองรับ"
                >
                  Shopee (เร็วๆนี้)
                </button>
              </div>
            </div>

            {!connected && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <div className="min-w-0">
                    <p className="font-medium">ยังไม่ได้เชื่อมต่อ Meta</p>
                    <p className="mt-1 text-sm text-foreground/60">
                      คุณยังสร้างกฎได้ แต่การดึงแคมเปญ/แอดเซ็ตจะใช้ไม่ได้จนกว่าจะเชื่อมต่อ
                    </p>
                    <div className="mt-3">
                      <Link href="/settings">
                        <Button className="rounded-xl px-4 py-2 text-sm">ไปเชื่อมต่อที่ตั้งค่า</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form className="mt-4 space-y-4" onSubmit={saveRule}>
              <div>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2"
                  placeholder="ชื่อกฎ (เช่น CPA สูงให้ลดงบ)"
                  value={form.name}
                  onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                />
                <InputError path="name" />
              </div>

              <div>
                <textarea
                  className="w-full rounded-xl border border-border bg-background px-3 py-2"
                  rows={3}
                  placeholder="คำอธิบาย (ให้คนอื่นอ่านรู้เรื่อง)"
                  value={form.description}
                  onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
                />
                <InputError path="description" />
              </div>

              <div>
                <p className="text-sm font-medium">ประเภทกฎ</p>
                <select
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2"
                  value={form.type}
                  onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as RuleType }))}
                >
                  {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <Card className="p-3">
                <p className="text-sm font-medium">เงื่อนไขของกฎ</p>

                {form.type === 'CPA_BUDGET_REDUCTION' && (
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <input
                      type="number"
                      className="rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="เพดาน CPA"
                      value={form.configJson.cpaCeiling}
                      onChange={(e) => setConfigValue('cpaCeiling', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="ลดงบ (%)"
                      value={form.configJson.reducePercent}
                      onChange={(e) => setConfigValue('reducePercent', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="คอนเวอร์ชันขั้นต่ำ"
                      value={form.configJson.minConversions}
                      onChange={(e) => setConfigValue('minConversions', Number(e.target.value))}
                    />
                  </div>
                )}

                {form.type === 'ROAS_PAUSE_ADSET' && (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input
                      type="number"
                      className="rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="ROAS ต่ำสุด"
                      value={form.configJson.roasFloor}
                      onChange={(e) => setConfigValue('roasFloor', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="งบขั้นต่ำ"
                      value={form.configJson.minSpend}
                      onChange={(e) => setConfigValue('minSpend', Number(e.target.value))}
                    />
                  </div>
                )}

                {form.type === 'CTR_FATIGUE_ALERT' && (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input
                      type="number"
                      className="rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="CTR ลดลง (%)"
                      value={form.configJson.ctrDropPercent}
                      onChange={(e) => setConfigValue('ctrDropPercent', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="rounded-xl border border-border bg-background px-3 py-2"
                      placeholder="Frequency ขั้นต่ำ"
                      value={form.configJson.minFrequency}
                      onChange={(e) => setConfigValue('minFrequency', Number(e.target.value))}
                    />
                  </div>
                )}
              </Card>

              <Card className="p-3">
                <p className="text-sm font-medium">เป้าหมายของกฎ</p>

                <select
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2"
                  value={form.scopeType}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      scopeType: e.target.value as ScopeType,
                      applyToAll: e.target.value === 'ACCOUNT',
                      scopeIds: []
                    }))
                  }
                >
                  <option value="ACCOUNT">ทั้งบัญชี</option>
                  <option value="CAMPAIGN">เลือกแคมเปญ</option>
                  <option value="ADSET">เลือกแอดเซ็ต</option>
                </select>

                {form.scopeType !== 'ACCOUNT' && (
                  <>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.applyToAll}
                        onChange={(e) => setForm((v) => ({ ...v, applyToAll: e.target.checked, scopeIds: e.target.checked ? [] : v.scopeIds }))}
                      />
                      ใช้กับทั้งหมดในขอบเขตนี้
                    </label>

                    <div className="mt-2">
                      <Button
                        type="button"
                        className="rounded-xl px-4 py-2 text-sm"
                        onClick={fetchTargets}
                        disabled={!connected}
                      >
                        ดึงรายการจาก Meta
                      </Button>
                      {!connected && <p className="mt-1 text-xs text-amber-400">กรุณาเชื่อมต่อ Meta ในหน้าตั้งค่าก่อน</p>}
                    </div>

                    {!form.applyToAll && (
                      <>
                        <input
                          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2"
                          placeholder="ค้นหาแคมเปญ/แอดเซ็ต"
                          value={queryTarget}
                          onChange={(e) => setQueryTarget(e.target.value)}
                        />

                        <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-xl border border-border p-2">
                          {filteredTargets.map((item) => (
                            <label key={item.id} className="flex items-center justify-between gap-2 rounded-lg p-2 text-sm hover:bg-muted/20">
                              <span className="min-w-0 truncate">{item.name}</span>
                              <input
                                type="checkbox"
                                checked={form.scopeIds.includes(item.id)}
                                onChange={(e) =>
                                  setForm((v) => ({
                                    ...v,
                                    scopeIds: e.target.checked ? [...v.scopeIds, item.id] : v.scopeIds.filter((id) => id !== item.id)
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>

                        <InputError path="scopeIds" />
                      </>
                    )}
                  </>
                )}
              </Card>

              <div className="grid gap-2 md:grid-cols-2">
                <input
                  type="number"
                  className="rounded-xl border border-border bg-background px-3 py-2"
                  value={form.maxBudgetChangePerDay}
                  onChange={(e) => setForm((v) => ({ ...v, maxBudgetChangePerDay: Number(e.target.value) }))}
                  placeholder="ปรับงบ/วัน (%)"
                />
                <input
                  type="number"
                  className="rounded-xl border border-border bg-background px-3 py-2"
                  value={form.cooldownHours}
                  onChange={(e) => setForm((v) => ({ ...v, cooldownHours: Number(e.target.value) }))}
                  placeholder="คูลดาวน์ (ชั่วโมง)"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm((v) => ({ ...v, isEnabled: e.target.checked }))} />
                  เปิดใช้งาน
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.autoApply} onChange={(e) => setForm((v) => ({ ...v, autoApply: e.target.checked }))} />
                  ยิงจริงอัตโนมัติ
                </label>
              </div>

              <Button type="submit" disabled={saving} className="w-full rounded-xl px-4 py-2 text-sm">
                {saving ? 'กำลังบันทึก...' : 'บันทึกกฎ'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
