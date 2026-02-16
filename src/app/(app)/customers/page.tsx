'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CustomerItem = {
  id: string;
  displayName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  identities: Array<{ provider: string; value: string }>;
  _count: { events: number; orders: number };
};

export default function CustomersPage() {
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [identifyResult, setIdentifyResult] = useState<string>('');

  const [provider, setProvider] = useState('LINE_USER_ID');
  const [value, setValue] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [eventCustomerId, setEventCustomerId] = useState('');
  const [eventType, setEventType] = useState('CUSTOM');
  const [payload, setPayload] = useState('{"note":"hello"}');

  const load = async (next?: string | null) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (next) params.set('cursor', next);
    params.set('limit', '10');

    const res = await fetch(`/api/customers?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setCursor(next || null);
    setNextCursor(data.nextCursor || null);
  };

  useEffect(() => {
    load();
  }, []);

  const identify = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, value, displayName })
    });
    const data = await res.json();
    if (!res.ok) return setIdentifyResult(data.error || 'ทำรายการไม่สำเร็จ');

    setIdentifyResult(`customerId: ${data.customerId} • isReturning: ${data.isReturning ? 'YES' : 'NO'}`);
    await load();
  };

  const addEvent = async (e: FormEvent) => {
    e.preventDefault();
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(payload || '{}');
    } catch {
      return alert('payload JSON ไม่ถูกต้อง');
    }

    const res = await fetch('/api/customers/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: eventCustomerId, eventType, payload: parsedPayload })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'เพิ่ม event ไม่สำเร็จ');
    alert(`เพิ่ม event สำเร็จ: ${data.id}`);
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Customers CRM</h2>

      <Card className="space-y-2 p-4">
        <p className="font-medium">ค้นหาลูกค้า</p>
        <div className="flex gap-2">
          <input className="w-full rounded-xl border border-border bg-background px-3 py-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ชื่อ, provider, value" />
          <Button onClick={() => load()}>ค้นหา</Button>
        </div>
      </Card>

      <Card className="overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">ชื่อ</th>
              <th className="p-3">firstSeenAt</th>
              <th className="p-3">lastSeenAt</th>
              <th className="p-3">identities</th>
              <th className="p-3">events</th>
              <th className="p-3">orders</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border/50">
                <td className="p-3">{item.id}</td>
                <td className="p-3">{item.displayName || '-'}</td>
                <td className="p-3">{new Date(item.firstSeenAt).toLocaleString('th-TH')}</td>
                <td className="p-3">{new Date(item.lastSeenAt).toLocaleString('th-TH')}</td>
                <td className="p-3">{item.identities.length}</td>
                <td className="p-3">{item._count.events}</td>
                <td className="p-3">{item._count.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex gap-2">
        <Button disabled={!cursor} onClick={() => load(cursor)}>รีเฟรชหน้านี้</Button>
        <Button disabled={!nextCursor} onClick={() => load(nextCursor)}>หน้าถัดไป</Button>
      </div>

      <Card className="space-y-2 p-4">
        <p className="font-medium">Identify customer</p>
        <form className="grid gap-2 md:grid-cols-2" onSubmit={identify}>
          <input className="rounded-xl border border-border bg-background px-3 py-2" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="provider" />
          <input className="rounded-xl border border-border bg-background px-3 py-2" value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" />
          <input className="rounded-xl border border-border bg-background px-3 py-2 md:col-span-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="displayName" />
          <Button type="submit" className="md:col-span-2">Identify</Button>
        </form>
        {identifyResult && <p className="text-sm text-foreground/70">{identifyResult}</p>}
      </Card>

      <Card className="space-y-2 p-4">
        <p className="font-medium">Add event</p>
        <form className="grid gap-2" onSubmit={addEvent}>
          <input className="rounded-xl border border-border bg-background px-3 py-2" value={eventCustomerId} onChange={(e) => setEventCustomerId(e.target.value)} placeholder="customerId" />
          <select className="rounded-xl border border-border bg-background px-3 py-2" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="CUSTOM">CUSTOM</option>
            <option value="PAGE_VIEW">PAGE_VIEW</option>
            <option value="MESSAGE">MESSAGE</option>
            <option value="ORDER">ORDER</option>
            <option value="IDENTIFIED">IDENTIFIED</option>
          </select>
          <textarea className="min-h-24 rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} />
          <Button type="submit">Add event</Button>
        </form>
      </Card>
    </div>
  );
}
