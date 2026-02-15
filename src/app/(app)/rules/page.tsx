'use client';

import { useEffect, useMemo, useState } from 'react';
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

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  CPA_BUDGET_REDUCTION: 'ลดงบเมื่อ CPA สูงเกินกำหนด',
  ROAS_PAUSE_ADSET: 'หยุดแอดเซ็ตเมื่อ ROAS ต่ำ',
  CTR_FATIGUE_ALERT: 'แจ้งเตือนเมื่อ CTR เริ่มล้า'
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
  if (form.type === 'CPA_BUDGET_REDUCTION') return { cpaCeiling: form.configJson.cpaCeiling, reducePercent: form.configJson.reducePercent, minConversions: form.configJson.minConversions };
  if (form.type === 'ROAS_PAUSE_ADSET') return { roasFloor: form.configJson.roasFloor, minSpend: form.configJson.minSpend };
  return { ctrDropPercent: form.configJson.ctrDropPercent, minFrequency: form.configJson.minFrequency };
}

function parseRuleToForm(rule: Rule): RuleFormState {
  const config = rule.configJson as Record<string, number>;
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

export default function RulesPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState<RuleFormState>(initialForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MetaItem[]>([]);
  const [query, setQuery] = useState('');
  const [connected, setConnected] = useState(false);

  const formTitle = useMemo(() => (editingRuleId ? 'แก้ไขกฎอัตโนมัติ' : 'สร้างกฎอัตโนมัติใหม่'), [editingRuleId]);

  const loadRules = async () => {
    const res = await fetch('/api/rules', { cache: 'no-store' });
    const data = await res.json();
    setRules(Array.isArray(data) ? data : []);
  };

  const loadConnection = async () => {
    const res = await fetch('/api/settings/meta-connection', { cache: 'no-store' });
    const data = await res.json();
    setConnected(Boolean(data?.connected));
  };

  useEffect(() => {
    loadRules();
    loadConnection();
  }, []);

  const setConfigValue = (key: keyof RuleFormState['configJson'], value: number) => setForm((prev) => ({ ...prev, configJson: { ...prev.configJson, [key]: value } }));

  const fetchTargets = async () => {
    if (!connected) return;
    const endpoint = form.scopeType === 'ADSET' ? '/api/meta/adsets' : '/api/meta/campaigns';
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!res.ok) return toast({ type: 'error', title: 'ดึงรายการไม่สำเร็จ', description: data.error || 'กรุณาลองใหม่' });
    setItems(data);
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setLoading(true);
    const res = await fetch(editingRuleId ? `/api/rules/${editingRuleId}` : '/api/rules', {
      method: editingRuleId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast({ type: 'error', title: 'บันทึกกฎไม่สำเร็จ', description: data?.error?.formErrors?.[0] || data?.error || 'กรุณาลองใหม่' });

    setForm(initialForm);
    setEditingRuleId(null);
    setErrors({});
    toast({ type: 'success', title: 'บันทึกกฎเรียบร้อยแล้ว' });
    loadRules();
  };

  const filteredItems = items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()) || i.id.includes(query));
  const InputError = ({ path }: { path: string }) => (errors[path] ? <p className="mt-1 text-xs text-red-400">{errors[path]}</p> : null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">กฎอัตโนมัติ</h2>
          <p className="text-sm text-foreground/60">ตั้งค่ากฎให้อ่านง่ายและพร้อมใช้งานได้ทันที</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/30 text-zinc-200'}`}>{connected ? 'เชื่อมต่อ Facebook แล้ว' : 'ยังไม่ได้เชื่อมต่อ'}</span>
      </div>

      <Card className="p-5">
        <form className="space-y-4" onSubmit={saveRule}>
          <h3 className="text-lg font-medium">{formTitle}</h3>
          <input className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="ชื่อกฎ" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
          <InputError path="name" />
          <textarea className="w-full rounded-xl border border-border bg-background px-3 py-2" rows={3} placeholder="คำอธิบาย" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          <InputError path="description" />

          <select className="w-full rounded-xl border border-border bg-background px-3 py-2" value={form.type} onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as RuleType }))}>
            {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          <Card className="p-3">
            <p className="text-sm font-medium">เงื่อนไขของกฎ</p>
            {form.type === 'CPA_BUDGET_REDUCTION' && <div className="mt-2 grid gap-2 md:grid-cols-3"><input type="number" className="rounded-xl border border-border bg-background px-3 py-2" placeholder="cpaCeiling" value={form.configJson.cpaCeiling} onChange={(e) => setConfigValue('cpaCeiling', Number(e.target.value))} /><input type="number" className="rounded-xl border border-border bg-background px-3 py-2" placeholder="reducePercent" value={form.configJson.reducePercent} onChange={(e) => setConfigValue('reducePercent', Number(e.target.value))} /><input type="number" className="rounded-xl border border-border bg-background px-3 py-2" placeholder="minConversions" value={form.configJson.minConversions} onChange={(e) => setConfigValue('minConversions', Number(e.target.value))} /></div>}
            {form.type === 'ROAS_PAUSE_ADSET' && <div className="mt-2 grid gap-2 md:grid-cols-2"><input type="number" className="rounded-xl border border-border bg-background px-3 py-2" placeholder="roasFloor" value={form.configJson.roasFloor} onChange={(e) => setConfigValue('roasFloor', Number(e.target.value))} /><input type="number" className="rounded-xl border border-border bg-background px-3 py-2" placeholder="minSpend" value={form.configJson.minSpend} onChange={(e) => setConfigValue('minSpend', Number(e.target.value))} /></div>}
            {form.type === 'CTR_FATIGUE_ALERT' && <div className="mt-2 grid gap-2 md:grid-cols-2"><input type="number" className="rounded-xl border border-border bg-background px-3 py-2" placeholder="ctrDropPercent" value={form.configJson.ctrDropPercent} onChange={(e) => setConfigValue('ctrDropPercent', Number(e.target.value))} /><input type="number" className="rounded-xl border border-border bg-background px-3 py-2" placeholder="minFrequency" value={form.configJson.minFrequency} onChange={(e) => setConfigValue('minFrequency', Number(e.target.value))} /></div>}
          </Card>

          <Card className="p-3">
            <p className="text-sm font-medium">เป้าหมายของกฎ</p>
            <select className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.scopeType} onChange={(e) => setForm((v) => ({ ...v, scopeType: e.target.value as ScopeType, applyToAll: e.target.value === 'ACCOUNT', scopeIds: [] }))}>
              <option value="ACCOUNT">ทั้งบัญชี</option>
              <option value="CAMPAIGN">เลือกแคมเปญ</option>
              <option value="ADSET">เลือกแอดเซ็ต</option>
            </select>

            {form.scopeType !== 'ACCOUNT' && (
              <>
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.applyToAll} onChange={(e) => setForm((v) => ({ ...v, applyToAll: e.target.checked, scopeIds: e.target.checked ? [] : v.scopeIds }))} /> ใช้กับทั้งหมดในขอบเขตนี้</label>
                <Button type="button" className="mt-2" onClick={fetchTargets} disabled={!connected}>{connected ? 'ดึงรายการจาก Facebook' : 'ดึงรายการจาก Facebook'}</Button>
                {!connected && <p className="mt-1 text-xs text-amber-400">กรุณาเชื่อมต่อ Facebook ในหน้าตั้งค่าก่อน</p>}
                {!form.applyToAll && <><input className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="ค้นหาแคมเปญ/แอดเซ็ต" value={query} onChange={(e) => setQuery(e.target.value)} /><div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-xl border border-border p-2">{filteredItems.map((item) => <label key={item.id} className="flex items-center justify-between gap-2 rounded-lg p-1 text-sm"><span>{item.name}</span><input type="checkbox" checked={form.scopeIds.includes(item.id)} onChange={(e) => setForm((v) => ({ ...v, scopeIds: e.target.checked ? [...v.scopeIds, item.id] : v.scopeIds.filter((id) => id !== item.id) }))} /></label>)}</div><InputError path="scopeIds" /></>}
              </>
            )}
          </Card>

          <div className="grid gap-2 md:grid-cols-2">
            <input type="number" className="rounded-xl border border-border bg-background px-3 py-2" value={form.maxBudgetChangePerDay} onChange={(e) => setForm((v) => ({ ...v, maxBudgetChangePerDay: Number(e.target.value) }))} placeholder="maxBudgetChangePerDay" />
            <input type="number" className="rounded-xl border border-border bg-background px-3 py-2" value={form.cooldownHours} onChange={(e) => setForm((v) => ({ ...v, cooldownHours: Number(e.target.value) }))} placeholder="cooldownHours" />
          </div>

          <Button type="submit" disabled={loading}>{loading ? 'กำลังบันทึก...' : 'บันทึกกฎ'}</Button>
        </form>
      </Card>

      {rules.map((rule) => (
        <Card key={rule.id} className="space-y-2 p-4">
          <p className="font-medium">{rule.name}</p>
          <p className="text-sm text-foreground/60">{RULE_TYPE_LABELS[rule.type]} • {SCOPE_LABELS[rule.scopeType]} {rule.applyToAll ? '(ทั้งหมด)' : `(${rule.scopeIds.length} รายการ)`}</p>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => { setEditingRuleId(rule.id); setForm(parseRuleToForm(rule)); }}>แก้ไข</Button></div>
        </Card>
      ))}
    </div>
  );
}
