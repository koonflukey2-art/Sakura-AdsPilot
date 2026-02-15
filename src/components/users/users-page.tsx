'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
};

export default function UsersClientPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (role) params.set('role', role);
    const res = await fetch(`/api/users?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
      return;
    }
    setUsers(data.items || []);
  };

  useEffect(() => {
    loadUsers();
  }, [query, role]);

  const updateUser = async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setMessage(res.ok ? 'อัปเดตผู้ใช้งานเรียบร้อย' : data.error || 'อัปเดตไม่สำเร็จ');
    loadUsers();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">จัดการผู้ใช้งาน (แอดมิน)</h2>
      {message && <p className="text-sm text-foreground/70">{message}</p>}
      <div className="flex gap-2">
        <input className="rounded-xl border border-border bg-background px-3 py-2" placeholder="ค้นหาชื่อหรืออีเมล" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="rounded-xl border border-border bg-background px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">ทุกบทบาท</option>
          <option value="ADMIN">ADMIN</option>
          <option value="EMPLOYEE">EMPLOYEE</option>
        </select>
      </div>

      {users.map((user) => (
        <Card key={user.id} className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">{user.name || '-'}</p>
            <p className="text-sm text-foreground/60">{user.email}</p>
            <p className="text-xs text-foreground/60">สถานะ: {user.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-muted px-3 py-2 text-sm" onClick={() => updateUser(user.id, { role: user.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN' })}>เปลี่ยนเป็น {user.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN'}</button>
            <button className="rounded-xl bg-muted px-3 py-2 text-sm" onClick={() => updateUser(user.id, { isActive: !user.isActive })}>{user.isActive ? 'ปิดผู้ใช้' : 'เปิดผู้ใช้'}</button>
          </div>
        </Card>
      ))}
      {users.length === 0 && <Card className="p-6 text-sm text-foreground/60">ไม่พบผู้ใช้งาน</Card>}
    </div>
  );
}
