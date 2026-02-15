'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ruleSchema } from '@/lib/validations';

type RuleType = 'CPA_BUDGET_REDUCTION' | 'ROAS_PAUSE_ADSET' | 'CTR_FATIGUE_ALERT';

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
};

type RuleFormState = {
  name: string;
  description: string;
  type: RuleType;
  autoApply: boolean;
  isEnabled: boolean;
  maxBudgetChangePerDay: number;
  cooldownHours: number;
  configJson: {
    cpaCeiling: number;
    budgetReductionPercent: number;
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

const initialForm: RuleFormState = {
  name: '',
  description: '',
  type: 'CPA_BUDGET_REDUCTION',
  autoApply: false,
  isEnabled: true,
  maxBudgetChangePerDay: 20,
  cooldownHours: 24,
  configJson: {
    cpaCeiling: 50,
    budgetReductionPercent: 10,
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
      budgetReductionPercent: Number(form.configJson.budgetReductionPercent),
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

function getReadableConfigRows(rule: Rule) {
  const config = rule.configJson as Record<string, number>;
  if (rule.type === 'CPA_BUDGET_REDUCTION') {
    return [
      ['เพดาน CPA', `${config.cpaCeiling ?? '-'} บาท`],
      ['ลดงบ (%)', `${config.budgetReductionPercent ?? '-'}%`],
      ['คอนเวอร์ชันขั้นต่ำ', `${config.minConversions ?? '-'}`]
    ];
  }

  if (rule.type === 'ROAS_PAUSE_ADSET') {
    return [
      ['ROAS ต่ำสุด', `${config.roasFloor ?? '-'}x`],
      ['งบขั้นต่ำ', `${config.minSpend ?? '-'} บาท`]
    ];
  }

  return [
    ['เปอร์เซ็นต์ CTR ลดลง', `${config.ctrDropPercent ?? '-'}%`],
    ['Frequency ขั้นต่ำ', `${config.minFrequency ?? '-'}`]
  ];
}

function parseRuleToForm(rule: Rule): RuleFormState {
  const config = rule.configJson as Record<string, number>;
  return {
    name: rule.name,
    description: rule.description,
    type: rule.type,
    autoApply: rule.autoApply,
    isEnabled: rule.isEnabled,
    maxBudgetChangePerDay: rule.maxBudgetChangePerDay,
    cooldownHours: rule.cooldownHours,
    configJson: {
      ...initialForm.configJson,
      cpaCeiling: Number(config.cpaCeiling ?? initialForm.configJson.cpaCeiling),
      budgetReductionPercent: Number(config.budgetReductionPercent ?? initialForm.configJson.budgetReductionPercent),
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

  const formTitle = useMemo(() => (editingRuleId ? 'แก้ไขกฎอัตโนมัติ' : 'สร้างกฎอัตโนมัติใหม่'), [editingRuleId]);

  const loadRules = async () => {
    try {
      const res = await fetch('/api/rules', { cache: 'no-store' });
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules([]);
      toast({ type: 'error', title: 'โหลดรายการกฎไม่สำเร็จ', description: 'กรุณาลองใหม่อีกครั้ง' });
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const setConfigValue = (key: keyof RuleFormState['configJson'], value: number) => {
    setForm((prev) => ({ ...prev, configJson: { ...prev.configJson, [key]: value } }));
  };

  const runValidation = (payload: Omit<Rule, 'id'>) => {
    const parsed = ruleSchema.safeParse(payload);
    if (!parsed.success) {
      const parsedErrors = extractErrorMap(parsed.error);
      setErrors(parsedErrors);
      toast({ type: 'error', title: 'ข้อมูลยังไม่ครบ', description: 'กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือน' });
      return false;
    }

    setErrors({});
    return true;
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      autoApply: form.autoApply,
      isEnabled: form.isEnabled,
      maxBudgetChangePerDay: Number(form.maxBudgetChangePerDay),
      cooldownHours: Number(form.cooldownHours),
      configJson: getRuleConfigPayload(form)
    };

    if (!runValidation(payload)) return;

    setLoading(true);
    const isEdit = Boolean(editingRuleId);
    const endpoint = isEdit ? `/api/rules/${editingRuleId}` : '/api/rules';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const apiFieldErrors = data?.error?.fieldErrors as Record<string, string[]> | undefined;
      const message = data?.error?.formErrors?.[0] || data?.error || 'บันทึกกฎไม่สำเร็จ';
      if (apiFieldErrors) {
        const mapped: FieldErrors = {};
        for (const [key, value] of Object.entries(apiFieldErrors)) {
          mapped[key] = value[0];
        }
        setErrors((prev) => ({ ...prev, ...mapped }));
      }
      toast({ type: 'error', title: 'ไม่สามารถบันทึกกฎได้', description: message });
      setLoading(false);
      return;
    }

    toast({ type: 'success', title: isEdit ? 'แก้ไขกฎเรียบร้อยแล้ว' : 'บันทึกกฎเรียบร้อยแล้ว' });
    setForm(initialForm);
    setEditingRuleId(null);
    setLoading(false);
    loadRules();
  };

  const toggleRule = async (rule: Rule) => {
    setRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, isEnabled: !item.isEnabled } : item)));

    const res = await fetch(`/api/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !rule.isEnabled })
    });

    if (!res.ok) {
      setRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, isEnabled: rule.isEnabled } : item)));
      toast({ type: 'error', title: 'เปลี่ยนสถานะไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' });
      return;
    }

    toast({ type: 'success', title: !rule.isEnabled ? 'เปิดใช้งานกฎแล้ว' : 'ปิดใช้งานกฎแล้ว' });
  };

  const editRule = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setForm(parseRuleToForm(rule));
    setErrors({});
  };

  const deleteRule = async (id: string) => {
    const confirmed = window.confirm('ยืนยันการลบกฎนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้');
    if (!confirmed) return;

    const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast({ type: 'error', title: 'ลบกฎไม่สำเร็จ', description: 'กรุณาลองใหม่อีกครั้ง' });
      return;
    }

    toast({ type: 'success', title: 'ลบกฎเรียบร้อยแล้ว' });
    if (editingRuleId === id) {
      setEditingRuleId(null);
      setForm(initialForm);
      setErrors({});
    }
    loadRules();
  };

  const InputError = ({ path }: { path: string }) =>
    errors[path] ? <p className="mt-1 text-xs text-red-400">{errors[path]}</p> : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">กฎอัตโนมัติ</h2>
        <p className="text-sm text-foreground/60">ตั้งค่ากฎให้อ่านง่ายและพร้อมใช้งานได้ทันที โดยไม่ต้องกรอก JSON</p>
      </div>

      <Card className="p-5">
        <form className="space-y-4" onSubmit={saveRule}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{formTitle}</h3>
            {editingRuleId && (
              <Button type="button" variant="ghost" onClick={() => { setEditingRuleId(null); setForm(initialForm); setErrors({}); }}>
                ยกเลิกการแก้ไข
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">ชื่อกฎ</label>
              <input className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="เช่น ลดงบเมื่อ CPA สูง" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
              <InputError path="name" />
            </div>
            <div>
              <label className="text-sm font-medium">ประเภทกฎ</label>
              <select
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.type}
                onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as RuleType }))}
              >
                <option value="CPA_BUDGET_REDUCTION">{RULE_TYPE_LABELS.CPA_BUDGET_REDUCTION}</option>
                <option value="ROAS_PAUSE_ADSET">{RULE_TYPE_LABELS.ROAS_PAUSE_ADSET}</option>
                <option value="CTR_FATIGUE_ALERT">{RULE_TYPE_LABELS.CTR_FATIGUE_ALERT}</option>
              </select>
              <p className="mt-1 text-xs text-foreground/60">เลือกประเภทให้ตรงกับเป้าหมายการควบคุมแคมเปญ</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">คำอธิบาย</label>
            <textarea className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" rows={3} placeholder="อธิบายเงื่อนไขและเหตุผลของกฎนี้" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
            <InputError path="description" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">การเปลี่ยนงบสูงสุดต่อวัน (%)</label>
              <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.maxBudgetChangePerDay} onChange={(e) => setForm((v) => ({ ...v, maxBudgetChangePerDay: Number(e.target.value) }))} />
              <p className="mt-1 text-xs text-foreground/60">จำกัดเปอร์เซ็นต์การเปลี่ยนงบต่อวัน (1-50%)</p>
              <InputError path="maxBudgetChangePerDay" />
            </div>
            <div>
              <label className="text-sm font-medium">ช่วงพักก่อนทำซ้ำ (ชั่วโมง)</label>
              <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.cooldownHours} onChange={(e) => setForm((v) => ({ ...v, cooldownHours: Number(e.target.value) }))} />
              <p className="mt-1 text-xs text-foreground/60">เว้นระยะก่อนทำซ้ำ เพื่อป้องกันการปรับถี่เกินไป</p>
              <InputError path="cooldownHours" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <span>
                <span className="block text-sm font-medium">เปิดใช้งานทันที</span>
                <span className="text-xs text-foreground/60">หากปิดไว้ ระบบจะยังไม่รันกฎนี้</span>
              </span>
              <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm((v) => ({ ...v, isEnabled: e.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <span>
                <span className="block text-sm font-medium">อนุมัติอัตโนมัติ</span>
                <span className="text-xs text-foreground/60">เปิดเมื่อไม่ต้องการตรวจสอบแบบ manual</span>
              </span>
              <input type="checkbox" checked={form.autoApply} onChange={(e) => setForm((v) => ({ ...v, autoApply: e.target.checked }))} />
            </label>
          </div>

          <Card className="border border-dashed p-4">
            <p className="text-sm font-medium">การตั้งค่าเฉพาะประเภทกฎ</p>
            <p className="mt-1 text-xs text-foreground/60">กรอกค่าด้านล่างให้ครบ ระบบจะตรวจสอบความถูกต้องให้อัตโนมัติ</p>

            {form.type === 'CPA_BUDGET_REDUCTION' && (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm">เพดาน CPA</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.configJson.cpaCeiling} onChange={(e) => setConfigValue('cpaCeiling', Number(e.target.value))} />
                  <InputError path="configJson.cpaCeiling" />
                </div>
                <div>
                  <label className="text-sm">ลดงบ (%)</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.configJson.budgetReductionPercent} onChange={(e) => setConfigValue('budgetReductionPercent', Number(e.target.value))} />
                  <InputError path="configJson.budgetReductionPercent" />
                </div>
                <div>
                  <label className="text-sm">คอนเวอร์ชันขั้นต่ำ</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.configJson.minConversions} onChange={(e) => setConfigValue('minConversions', Number(e.target.value))} />
                  <InputError path="configJson.minConversions" />
                </div>
              </div>
            )}

            {form.type === 'ROAS_PAUSE_ADSET' && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm">ROAS ต่ำสุด</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.configJson.roasFloor} onChange={(e) => setConfigValue('roasFloor', Number(e.target.value))} />
                  <InputError path="configJson.roasFloor" />
                </div>
                <div>
                  <label className="text-sm">งบขั้นต่ำ</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.configJson.minSpend} onChange={(e) => setConfigValue('minSpend', Number(e.target.value))} />
                  <InputError path="configJson.minSpend" />
                </div>
              </div>
            )}

            {form.type === 'CTR_FATIGUE_ALERT' && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm">เปอร์เซ็นต์ CTR ลดลง</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.configJson.ctrDropPercent} onChange={(e) => setConfigValue('ctrDropPercent', Number(e.target.value))} />
                  <InputError path="configJson.ctrDropPercent" />
                </div>
                <div>
                  <label className="text-sm">Frequency ขั้นต่ำ</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={form.configJson.minFrequency} onChange={(e) => setConfigValue('minFrequency', Number(e.target.value))} />
                  <InputError path="configJson.minFrequency" />
                </div>
              </div>
            )}
          </Card>

          <Button type="submit" disabled={loading}>{loading ? 'กำลังบันทึก...' : 'บันทึกกฎ'}</Button>
        </form>
      </Card>

      <section className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{rule.name}</p>
                <p className="text-sm text-foreground/60">{rule.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs">{RULE_TYPE_LABELS[rule.type]}</span>
                <span className={`rounded-full px-3 py-1 text-xs ${rule.isEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/30 text-zinc-200'}`}>
                  {rule.isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl bg-muted/60 p-3 text-sm">
              {getReadableConfigRows(rule).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-b-0 last:pb-0">
                  <span className="text-foreground/70">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => toggleRule(rule)}>{rule.isEnabled ? 'ปิดใช้งานกฎ' : 'เปิดใช้งานกฎ'}</Button>
              <Button variant="ghost" onClick={() => editRule(rule)}>แก้ไข</Button>
              <Button variant="ghost" onClick={() => deleteRule(rule.id)}>ลบ</Button>
            </div>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-base font-medium">ยังไม่มีกฎในระบบ</p>
            <p className="mt-1 text-sm text-foreground/60">เริ่มสร้างกฎแรกของคุณเพื่อให้ระบบช่วยดูแลแคมเปญอัตโนมัติ</p>
          </Card>
        )}
      </section>
    </div>
  );
}
