'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('credentials', { email, password, callbackUrl: '/dashboard', redirect: false });
    if (res?.error) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีอาจถูกปิดการใช้งาน');
    else window.location.href = '/dashboard';
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <motion.form initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-border/50 bg-card/80 p-8 shadow-soft backdrop-blur">
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบ Sakura AdsPilot</h1>
        <p className="text-sm text-foreground/60">ระบบจัดการโฆษณาสำหรับทีมงาน</p>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" type="submit">เข้าสู่ระบบ</Button>
        <p className="text-sm text-foreground/70">ยังไม่มีบัญชี? <Link className="underline" href="/register">ลงทะเบียน</Link></p>
      </motion.form>
    </main>
  );
}
