import { Card } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <Card className="space-y-3 p-5">
        <h3 className="font-medium">Connect Meta (Stub)</h3>
        <p className="text-sm text-foreground/60">Use API /api/meta/test and /api/rules for phase-1 structure. Store encrypted token server-side only.</p>
        <a className="text-sm underline" href="/api/meta/test">Test Connection endpoint</a>
      </Card>
      <Card className="space-y-3 p-5">
        <h3 className="font-medium">Notifications</h3>
        <p className="text-sm text-foreground/60">Configure SMTP and LINE token in environment variables. UI form can be extended to persist NotificationSetting.</p>
      </Card>
    </div>
  );
}
