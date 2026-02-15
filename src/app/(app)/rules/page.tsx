'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Rule = {
  id: string;
  name: string;
  description: string;
  type: 'CPA_BUDGET_REDUCTION' | 'ROAS_PAUSE_ADSET' | 'CTR_FATIGUE_ALERT';
  isEnabled: boolean;
  autoApply: boolean;
  maxBudgetChangePerDay: number;
  cooldownHours: number;
  configJson: Record<string, unknown>;
};

const initialForm = {
  name: '',
  description: '',
  type: 'CPA_BUDGET_REDUCTION' as Rule['type'],
  autoApply: false,
  isEnabled: true,
  maxBudgetChangePerDay: 20,
  cooldownHours: 24,
  configJson: '{}'
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  const loadRules = async () => {
    const res = await fetch('/api/rules');
    const data = await res.json();
    setRules(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, configJson: JSON.parse(form.configJson) })
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'บันทึกกฎไม่สำเร็จ');
      return;
    }
    setMessage('บันทึกกฎเรียบร้อยแล้ว');
    setForm(initialForm);
    loadRules();
  };

  const toggleRule = async (rule: Rule) => {
    await fetch(`/api/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !rule.isEnabled })
    });
    loadRules();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    loadRules();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">จัดการกฎอัตโนมัติ</h2>
      <Card className="p-5">
        <form className="grid gap-3" onSubmit={saveRule}>
          <input className="rounded-xl border border-border bg-background px-3 py-2" placeholder="ชื่อกฎ" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
          <input className="rounded-xl border border-border bg-background px-3 py-2" placeholder="คำอธิบาย" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          <select className="rounded-xl border border-border bg-background px-3 py-2" value={form.type} onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as Rule['type'] }))}>
            <option value="CPA_BUDGET_REDUCTION">ลดงบตาม CPA</option>
            <option value="ROAS_PAUSE_ADSET">หยุดแอดเซ็ตตาม ROAS</option>
            <option value="CTR_FATIGUE_ALERT">แจ้งเตือนครีเอทีฟล้า</option>
          </select>
          <textarea className="rounded-xl border border-border bg-background px-3 py-2" placeholder="configJson เช่น {" + '"cpaCeiling":50}' value={form.configJson} onChange={(e) => setForm((v) => ({ ...v, configJson: e.target.value }))} />
          <Button type="submit">บันทึก</Button>
        </form>
        {message && <p className="mt-2 text-sm text-foreground/70">{message}</p>}
      </Card>

      {rules.map((rule) => (
        <Card key={rule.id} className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{rule.name}</p>
              <p className="text-sm text-foreground/60">{rule.description}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs">{rule.isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(rule.configJson, null, 2)}</pre>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => toggleRule(rule)}>{rule.isEnabled ? 'ปิดกฎ' : 'เปิดกฎ'}</Button>
            <Button variant="ghost" onClick={() => deleteRule(rule.id)}>ลบ</Button>
          </div>
        </Card>
      ))}
      {rules.length === 0 && <Card className="p-6 text-sm text-foreground/60">ยังไม่มีกฎในระบบ</Card>}
    </div>
  );
}
