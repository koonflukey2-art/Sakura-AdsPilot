'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsClientPage() {
  const [notif, setNotif] = useState<any>({ emailEnabled: false, smtpPort: 587, lineEnabled: false });
  const [meta, setMeta] = useState<any>({ adAccountId: '', accessToken: '', status: 'CONNECTED' });
  const [message, setMessage] = useState('');

  const load = async () => {
    const [nRes, mRes] = await Promise.all([fetch('/api/settings/notifications'), fetch('/api/settings/meta-connection')]);
    const [n, m] = await Promise.all([nRes.json(), mRes.json()]);
    setNotif((prev: any) => ({ ...prev, ...n }));
    setMeta((prev: any) => ({ ...prev, ...m }));
  };

  useEffect(() => {
    load();
  }, []);

  const saveNotifications = async () => {
    const res = await fetch('/api/settings/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif)
    });
    const data = await res.json();
    setMessage(res.ok ? 'บันทึกการแจ้งเตือนสำเร็จ' : data.error || 'เกิดข้อผิดพลาด');
  };

  const saveMeta = async () => {
    const res = await fetch('/api/settings/meta-connection', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta)
    });
    const data = await res.json();
    setMessage(res.ok ? 'บันทึกการเชื่อมต่อ Meta สำเร็จ' : data.error || 'เกิดข้อผิดพลาด');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">ตั้งค่าระบบ</h2>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Card className="space-y-3 p-5">
        <h3 className="font-medium">ตั้งค่าการแจ้งเตือน</h3>
        <label className="text-sm">SMTP Host</label>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" value={notif.smtpHost || ''} onChange={(e) => setNotif((v: any) => ({ ...v, smtpHost: e.target.value }))} />
        <label className="text-sm flex items-center gap-2"><Lock size={14} /> รหัสผ่าน SMTP (ข้อมูลลับ)</label>
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" value={notif.smtpPassword || ''} onChange={(e) => setNotif((v: any) => ({ ...v, smtpPassword: e.target.value }))} />
        <div className="flex gap-2">
          <Button onClick={saveNotifications}>บันทึก</Button>
          <Button variant="secondary" onClick={() => setNotif({ emailEnabled: false, smtpPort: 587, lineEnabled: false })}>ล้างค่า</Button>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="font-medium">เชื่อมต่อ Meta/Facebook</h3>
        <label className="text-sm">รหัสบัญชีโฆษณา</label>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" value={meta.adAccountId || ''} onChange={(e) => setMeta((v: any) => ({ ...v, adAccountId: e.target.value }))} />
        <label className="text-sm flex items-center gap-2"><Lock size={14} /> Access Token (ข้อมูลลับ)</label>
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" value={meta.accessToken || ''} onChange={(e) => setMeta((v: any) => ({ ...v, accessToken: e.target.value }))} />
        <div className="flex gap-2">
          <Button onClick={saveMeta}>บันทึก</Button>
          <Button variant="secondary" onClick={async () => { const r = await fetch('/api/meta/test'); const d = await r.json(); setMessage(r.ok ? d.message : d.error || 'ทดสอบไม่สำเร็จ'); }}>ทดสอบการเชื่อมต่อ</Button>
          <Button variant="ghost" onClick={() => setMeta({ adAccountId: '', accessToken: '', status: 'CONNECTED' })}>ล้างค่า</Button>
        </div>
      </Card>
    </div>
  );
}
