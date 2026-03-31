"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardTasksChart({ data }: { data: { date: string; tasks: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
        <XAxis dataKey="date" stroke="#c084fc" tick={{ fill: "#c084fc", fontSize: 12 }} />
        <YAxis stroke="#c084fc" tick={{ fill: "#c084fc", fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f1a2e", borderColor: "#8b5cf6", borderRadius: 8 }}
          labelStyle={{ color: "#fff" }}
        />
        <Bar dataKey="tasks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}