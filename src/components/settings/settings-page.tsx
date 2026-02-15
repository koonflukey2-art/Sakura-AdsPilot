'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type Notif = { emailEnabled: boolean; smtpHost: string; smtpPort: number; smtpUser: string; smtpFrom: string; notifyEmailTo: string; lineEnabled: boolean; lineMode: string; smtpPassword?: string; lineToken?: string; smtpPasswordMasked?: string; lineTokenMasked?: string };
type Meta = { adAccountId: string; accessToken?: string; tokenPreview?: string; hasToken?: boolean; status?: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' };

export default function SettingsClientPage() {
  const { toast } = useToast();
  const [notif, setNotif] = useState<Notif>({ emailEnabled: false, smtpHost: '', smtpPort: 587, smtpUser: '', smtpFrom: '', notifyEmailTo: '', lineEnabled: false, lineMode: 'NOTIFY' });
  const [meta, setMeta] = useState<Meta>({ adAccountId: '', accessToken: '', status: 'DISCONNECTED' });

  const load = async () => {
    const [nRes, mRes] = await Promise.all([fetch('/api/settings/notifications'), fetch('/api/settings/meta-connection')]);
    const [n, m] = await Promise.all([nRes.json(), mRes.json()]);
    setNotif((prev) => ({ ...prev, ...n }));
    setMeta((prev) => ({ ...prev, ...m, accessToken: '' }));
  };

  useEffect(() => { load(); }, []);

  const saveNotifications = async () => {
    const res = await fetch('/api/settings/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notif) });
    const data = await res.json();
    toast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'บันทึกสำเร็จ' : 'บันทึกไม่สำเร็จ', description: res.ok ? 'อัปเดตการตั้งค่าการแจ้งเตือนแล้ว' : data.error || 'เกิดข้อผิดพลาด' });
  };

  const saveMeta = async () => {
    const res = await fetch('/api/settings/meta-connection', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
    const data = await res.json();
    toast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'บันทึกสำเร็จ' : 'บันทึกไม่สำเร็จ', description: data.messageThai || data.error || 'เกิดข้อผิดพลาด' });
    if (res.ok) load();
  };

  const testConnection = async () => {
    const r = await fetch('/api/settings/meta-connection/test', { method: 'POST' });
    const d = await r.json();
    toast({ type: r.ok && d.ok ? 'success' : 'error', title: d.ok ? 'เชื่อมต่อสำเร็จ' : 'ทดสอบไม่ผ่าน', description: d.messageThai });
    await load();
  };

  const clearMeta = async () => {
    const r = await fetch('/api/settings/meta-connection', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adAccountId: '', accessToken: '', status: 'DISCONNECTED' }) });
    const d = await r.json();
    toast({ type: r.ok ? 'success' : 'error', title: r.ok ? 'ล้างค่าแล้ว' : 'ล้างค่าไม่สำเร็จ', description: d.messageThai || d.error || '' });
    await load();
  };

  const badge = meta.status === 'CONNECTED' ? 'เชื่อมต่อแล้ว' : meta.status === 'ERROR' ? 'ทดสอบไม่ผ่าน' : 'ยังไม่เชื่อมต่อ';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">ตั้งค่าระบบ</h2>

      <Card className="space-y-3 p-5">
        <h3 className="font-medium">ตั้งค่าการแจ้งเตือน</h3>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="SMTP Host" value={notif.smtpHost} onChange={(e) => setNotif((v) => ({ ...v, smtpHost: e.target.value }))} />
        <label className="text-sm flex items-center gap-2"><Lock size={14} /> รหัสผ่าน SMTP (ข้อมูลลับ)</label>
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder={notif.smtpPasswordMasked || '****'} value={notif.smtpPassword || ''} onChange={(e) => setNotif((v) => ({ ...v, smtpPassword: e.target.value }))} />
        <Button onClick={saveNotifications}>บันทึก</Button>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="font-medium">เชื่อมต่อ Meta API</h3>
        <p className="text-sm">สถานะ: <span className="font-medium">{badge}</span></p>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="รหัสบัญชีโฆษณา" value={meta.adAccountId || ''} onChange={(e) => setMeta((v) => ({ ...v, adAccountId: e.target.value }))} />
        <label className="text-sm flex items-center gap-2"><Lock size={14} /> Access Token (ข้อมูลลับ)</label>
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder={meta.tokenPreview || '****'} value={meta.accessToken || ''} onChange={(e) => setMeta((v) => ({ ...v, accessToken: e.target.value }))} />
        <div className="flex gap-2">
          <Button onClick={saveMeta}>บันทึก</Button>
          <Button variant="secondary" onClick={testConnection}>ทดสอบการเชื่อมต่อ</Button>
          <Button variant="ghost" onClick={clearMeta}>ล้างค่า</Button>
        </div>
      </Card>
    </div>
  );
}
