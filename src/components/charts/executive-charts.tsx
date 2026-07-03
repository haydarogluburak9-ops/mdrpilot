"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";

const COLORS = {
  primary: "#1e3a8a", accent: "#3b82f6", success: "#16a34a", warning: "#f59e0b", danger: "#dc2626", muted: "#cbd5e1",
};

export function TrendLineChart({ data, dataKey = "score", color = COLORS.accent }: { data: { name: string; [k: string]: string | number }[]; dataKey?: string; color?: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data, color = COLORS.primary }: { data: { name: string; value: number }[]; color?: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComplianceBars({ data }: { data: { name: string; score: number }[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="score" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.score >= 80 ? COLORS.success : d.score >= 50 ? COLORS.warning : COLORS.danger} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskPie({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) return <EmptyChart />;
  const palette: Record<string, string> = { LOW: COLORS.success, MEDIUM: COLORS.warning, HIGH: COLORS.danger, CRITICAL: "#7f1d1d" };
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
          {filtered.map((d, i) => <Cell key={i} fill={palette[d.name] ?? COLORS.muted} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">No data yet</div>;
}
