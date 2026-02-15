'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function DashboardChart({ data }: { data: { date: string; spend: number; roas: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="spend" stroke="#64748b" fill="#94a3b833" />
          <Area type="monotone" dataKey="roas" stroke="#0f172a" fill="#0f172a22" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
