"use client";

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import type { AcquisitionChannel } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useTheme } from "@/contexts/theme-context";

interface AcquisitionChartProps {
  channels: AcquisitionChannel[];
  currency?: string;
}

export function AcquisitionChart({ channels, currency = "USD" }: AcquisitionChartProps) {
  const [mode, setMode] = useState<"bar" | "pie">("bar");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const axisColor = isDark ? "#a1a1aa" : "#71717a";

  const totalUsers = channels.reduce((sum, c) => sum + c.users, 0);

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800/90 dark:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            User Acquisition by Channel
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {formatNumber(totalUsers)} attributed signups across 6 channels
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            type="button"
            onClick={() => setMode("bar")}
            aria-label="Bar chart view"
            className={`rounded-md p-1.5 transition-colors ${
              mode === "bar"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode("pie")}
            aria-label="Donut chart view"
            className={`rounded-md p-1.5 transition-colors ${
              mode === "pie"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <PieChartIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "bar" ? (
            <BarChart
              data={channels}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatNumber(Number(v), true)}
              />
              <YAxis
                type="category"
                dataKey="channel"
                width={118}
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const ch = payload[0].payload as AcquisitionChannel;
                  return (
                    <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{ch.channel}</p>
                      <div className="mt-1.5 space-y-1 text-zinc-600 dark:text-zinc-300">
                        <p className="tabular-nums">Users: <strong className="text-zinc-900 dark:text-zinc-50">{formatNumber(ch.users)}</strong> ({ch.percentage}%)</p>
                        <p className="tabular-nums">Conv. Rate: <strong className="text-zinc-900 dark:text-zinc-50">{ch.conversion_rate}%</strong></p>
                        <p className="tabular-nums">Avg. CAC: <strong className="text-zinc-900 dark:text-zinc-50">{formatCurrency(ch.cac, currency)}</strong></p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="users" radius={[0, 6, 6, 0]} barSize={18}>
                {channels.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={channels}
                dataKey="users"
                nameKey="channel"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={86}
                paddingAngle={3}
                strokeWidth={0}
              >
                {channels.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const ch = payload[0].payload as AcquisitionChannel;
                  return (
                    <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{ch.channel}</p>
                      <p className="mt-1 tabular-nums text-zinc-600 dark:text-zinc-300">
                        {formatNumber(ch.users)} users ({ch.percentage}%) · CAC {formatCurrency(ch.cac, currency)}
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Compact channel legend */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
        {channels.map((ch) => (
          <div key={ch.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-zinc-600 dark:text-zinc-400">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: ch.color }}
              />
              <span className="truncate">{ch.channel}</span>
            </span>
            <span className="tabular-nums shrink-0 font-medium text-zinc-900 dark:text-zinc-200">
              {ch.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
