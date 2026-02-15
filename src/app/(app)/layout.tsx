import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { authOptions } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.user.role} />
      <div className="flex-1">
        <Topbar name={session.user.name} role={session.user.role} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
