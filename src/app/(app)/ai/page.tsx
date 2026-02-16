'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Suggestion = {
  id: string;
  title: string;
  summary: string;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  createdAt: string;
};

export default function AiPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [payload, setPayload] = useState('{}');

  const load = async () => {
    const res = await fetch('/api/ai/suggestions');
    const data = await res.json();
    setItems(data.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const createSuggestion = async (e: FormEvent) => {
    e.preventDefault();
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(payload || '{}');
    } catch {
      return alert('payload JSON ไม่ถูกต้อง');
    }

    const res = await fetch('/api/ai/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, payload: parsedPayload })
    });

    if (!res.ok) {
      const data = await res.json();
      return alert(data.error?.formErrors?.[0] || data.error || 'สร้างไม่สำเร็จ');
    }

    setTitle('');
    setSummary('');
    setPayload('{}');
    await load();
  };

  const updateStatus = async (id: string, status: 'APPLIED' | 'DISMISSED') => {
    const res = await fetch(`/api/ai/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'อัปเดตสถานะไม่สำเร็จ');
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Suggestions</h2>

      <Card className="space-y-2 p-4">
        <p className="font-medium">สร้าง suggestion</p>
        <form className="grid gap-2" onSubmit={createSuggestion}>
          <input className="rounded-xl border border-border bg-background px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title" />
          <textarea className="min-h-20 rounded-xl border border-border bg-background px-3 py-2" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="summary" />
          <textarea className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="payload JSON (optional)" />
          <Button type="submit">Create</Button>
        </form>
      </Card>

      <Card className="overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">title</th>
              <th className="p-3">summary</th>
              <th className="p-3">status</th>
              <th className="p-3">createdAt</th>
              <th className="p-3 text-right">actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border/50 align-top">
                <td className="p-3">{item.title}</td>
                <td className="p-3">{item.summary}</td>
                <td className="p-3">{item.status}</td>
                <td className="p-3">{new Date(item.createdAt).toLocaleString('th-TH')}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(item.id, 'APPLIED')}>APPLY</Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(item.id, 'DISMISSED')}>DISMISS</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
