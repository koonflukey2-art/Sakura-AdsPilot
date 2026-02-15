import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

export default async function LogsPage() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Activity Logs</h2>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Timestamp</th><th>Event</th><th>Actor</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border/50">
                <td className="p-3">{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.eventType}</td>
                <td>{l.actorLabel}</td>
                <td>{l.entityType}</td>
                <td className="max-w-lg truncate">{JSON.stringify(l.detailsJson)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
