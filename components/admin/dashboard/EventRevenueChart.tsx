"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type ChartPoint = {
  month: string;
  value: number;
};

export default function EventRevenueChart({
  data,
}: {
  data: ChartPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#111"
          strokeWidth={3}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
