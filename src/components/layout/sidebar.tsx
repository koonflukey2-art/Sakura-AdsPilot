'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Settings, ListChecks, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/rules', label: 'Rules', icon: ListChecks },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 border-r border-border/60 bg-card/60 p-4 backdrop-blur-xl">
      <h1 className="mb-8 text-lg font-semibold">Meta Ads Autopilot</h1>
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
