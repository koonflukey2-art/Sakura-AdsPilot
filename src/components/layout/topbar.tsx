'use client';

import { Moon, Sun } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function Topbar({ name, role }: { name?: string | null; role: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="flex items-center justify-between border-b border-border/60 p-4">
      <p className="text-sm text-foreground/60">ผู้ใช้งาน: {name || 'ไม่ระบุชื่อ'} ({role})</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setDark((v) => !v)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</Button>
        <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/login' })}>ออกจากระบบ</Button>
      </div>
    </div>
  );
}
