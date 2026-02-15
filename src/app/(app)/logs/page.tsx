'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

type LogItem = {
  id: string;
  createdAt: string;
  eventType: string;
  actorLabel: string;
  entityType: string;
  entityId: string;
  detailsJson: unknown;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [eventType, setEventType] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);

  const loadLogs = async (next?: string | null) => {
    const params = new URLSearchParams();
    if (eventType) params.set('eventType', eventType);
    if (next) params.set('cursor', next);
    const res = await fetch(`/api/audit-logs?${params.toString()}`);
    const data = await res.json();
    setLogs(data.items || []);
    setCursor(data.nextCursor);
  };

  useEffect(() => {
    loadLogs();
  }, [eventType]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">บันทึกกิจกรรม</h2>
      <div className="flex gap-2">
        <input className="rounded-xl border border-border bg-background px-3 py-2" placeholder="กรองตาม eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">เวลา</th><th>เหตุการณ์</th><th>ผู้กระทำ</th><th>รายการ</th><th>รายละเอียด</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border/50">
                <td className="p-3">{new Date(l.createdAt).toLocaleString('th-TH')}</td>
                <td>{l.eventType}</td>
                <td>{l.actorLabel}</td>
                <td>{l.entityType}:{l.entityId}</td>
                <td className="max-w-lg truncate">{JSON.stringify(l.detailsJson)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {cursor && <button className="rounded-xl bg-muted px-3 py-2 text-sm" onClick={() => loadLogs(cursor)}>หน้าถัดไป</button>}
    </div>
  );
}
