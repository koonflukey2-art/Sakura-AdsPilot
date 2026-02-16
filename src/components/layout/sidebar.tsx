'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Settings, ListChecks, ScrollText, Users, BrainCircuit, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarProps = { role: 'ADMIN' | 'EMPLOYEE' };

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = [
    { href: '/dashboard', label: 'แดชบอร์ด', icon: BarChart3 },
    { href: '/rules', label: 'กฎอัตโนมัติ', icon: ListChecks },
    { href: '/customers', label: 'ลูกค้า CRM', icon: UsersRound },
    { href: '/ai', label: 'AI Suggestions', icon: BrainCircuit },
    { href: '/logs', label: 'บันทึกกิจกรรม', icon: ScrollText },
    ...(role === 'ADMIN' ? [{ href: '/users', label: 'จัดการผู้ใช้', icon: Users }] : []),
    { href: '/settings', label: 'ตั้งค่า', icon: Settings }
  ];

  return (
    <aside className="w-64 border-r border-border/60 bg-card/60 p-4 backdrop-blur-xl">
      <h1 className="mb-8 text-lg font-semibold">Sakura AdsPilot</h1>
      <nav className="space-y-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm', pathname.startsWith(item.href) ? 'bg-muted font-medium' : 'text-foreground/70 hover:bg-muted/70')}>
            <item.icon className="h-4 w-4" /> {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
