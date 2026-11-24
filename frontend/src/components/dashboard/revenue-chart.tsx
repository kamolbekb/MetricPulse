"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueSeriesPoint, TimeRange } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/contexts/theme-context";

interface RevenueChartProps {
  data: RevenueSeriesPoint[];
  range: TimeRange;
  onRangeChange: (next: TimeRange) => void;
  totalRevenue: number;
  totalExpenses: number;
  netMargin: number;
  currency?: string;
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "12m", label: "12m" },
];

export function RevenueChart({
  data,
  range,
  onRangeChange,
  totalRevenue,
  totalExpenses,
  netMargin,
  currency = "USD",
}: RevenueChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const gridColor = isDark ? "#27272a" : "#e4e4e7";
  const axisColor = isDark ? "#a1a1aa" : "#71717a";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800/90 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Revenue vs. Expenses
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Recognized subscription revenue compared against operating costs
          </p>
        </div>

        {/* Range Switcher */}
        <div
          role="tablist"
          aria-label="Chart date range"
          className="inline-flex self-start rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          {RANGES.map((item) => {
            const active = range === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onRangeChange(item.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  active
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline summary bar */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Revenue</span>
          <span className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(totalRevenue, currency, true)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Expenses</span>
          <span className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(totalExpenses, currency, true)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Net Margin</span>
          <span className="tabular-nums rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {netMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Area Chart */}
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={isDark ? 0.35 : 0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={isDark ? 0.28 : 0.18} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={22}
            />
            <YAxis
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) => formatCurrency(Number(v), currency, true)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const rev = Number(payload.find((p) => p.dataKey === "revenue")?.value || 0);
                const exp = Number(payload.find((p) => p.dataKey === "expenses")?.value || 0);
                return (
                  <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Revenue
                        </span>
                        <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(rev, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Expenses
                        </span>
                        <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(exp, currency)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-6 border-t border-zinc-200 pt-1 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400">Net Profit</span>
                        <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(rev - exp, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#revGradient)"
              activeDot={{ r: 4, strokeWidth: 0, fill: "#6366f1" }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#expGradient)"
              activeDot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
