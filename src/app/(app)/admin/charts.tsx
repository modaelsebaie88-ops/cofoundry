"use client"

import { format } from "date-fns"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Panel } from "@/components/shared/page-header"

// Single-series charts in the brand hue: no legend needed (the title names the series),
// one y-axis, recessive grid, crosshair tooltip on hover.
const BRAND = "#5b3fd6"

export function TrendChart({ title, total, data }: { title: string; total: number; data: { date: string; value: number }[] }) {
  const id = `g-${title.replace(/\W/g, "")}`
  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-lg font-semibold tabular-nums">{total.toLocaleString()}</p>
      </div>
      <div className="h-40" role="img" aria-label={`${title}: ${total} over the last 30 days`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.18} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#ebe8f3" />
            <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "MMM d")} tick={{ fontSize: 11, fill: "#7a7690" }} tickLine={false} axisLine={false} interval={6} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7a7690" }} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              cursor={{ stroke: "#c9c3e0", strokeWidth: 1 }}
              contentStyle={{ borderRadius: 10, border: "1px solid #e6e2f0", fontSize: 12, boxShadow: "0 4px 16px -4px rgba(60,40,120,.15)" }}
              labelFormatter={(d) => format(new Date(String(d)), "EEE, MMM d")}
              formatter={(v) => [Number(v).toLocaleString(), title]}
            />
            <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

/** Horizontal bars as plain HTML: exact labels, values in text ink, hover title per bar. */
export function BarList({ title, data, unit }: { title: string; data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <Panel className="p-5">
      <p className="mb-4 text-sm font-medium">{title}</p>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm" title={`${d.label}: ${d.value} ${unit}`}>
            <span className="truncate text-muted-foreground">{d.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary/80 transition-all" style={{ width: `${(d.value / max) * 100}%` }} />
            </span>
            <span className="text-right font-medium tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
