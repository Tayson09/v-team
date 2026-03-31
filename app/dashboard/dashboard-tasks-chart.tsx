'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ChartPoint = {
  date: string;
  tasks: number;
};

type Props = {
  data: ChartPoint[];
};

export default function DashboardTasksChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="tasks" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}