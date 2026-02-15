'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@company.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('credentials', { email, password, callbackUrl: '/dashboard', redirect: false });
    if (res?.error) setError('Invalid credentials');
    else window.location.href = '/dashboard';
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <motion.form initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-border/50 bg-card/80 p-8 shadow-soft backdrop-blur">
        <h1 className="text-2xl font-semibold">Meta Ads Autopilot</h1>
        <p className="text-sm text-foreground/60">Secure access for internal teams.</p>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full rounded-xl border border-border bg-background px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" type="submit">Sign in</Button>
      </motion.form>
    </main>
  );
}
