'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'สมัครสมาชิกไม่สำเร็จ');
      return;
    }
    setMessage('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-border/50 bg-card/80 p-8 shadow-soft backdrop-blur">
        <h1 className="text-2xl font-semibold">สมัครสมาชิก</h1>
        <p className="text-sm text-foreground/60">สร้างบัญชีผู้ใช้งานสำหรับทีมของคุณ</p>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="ชื่อผู้ใช้งาน" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="อีเมล" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="รหัสผ่าน" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} />
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="ยืนยันรหัสผ่าน" value={form.confirmPassword} onChange={(e) => setForm((v) => ({ ...v, confirmPassword: e.target.value }))} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        <Button className="w-full" type="submit">ลงทะเบียน</Button>
        <p className="text-sm text-foreground/70">มีบัญชีแล้ว? <Link className="underline" href="/login">เข้าสู่ระบบ</Link></p>
      </form>
    </main>
  );
}
