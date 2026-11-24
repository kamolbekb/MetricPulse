"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, DollarSign, Repeat, TrendingDown, Users } from "lucide-react";
import type { KpiMetric } from "@/lib/api";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

interface KpiCardProps {
  metric: KpiMetric;
  currency?: string;
  rangeLabel: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Monthly Recurring Revenue": DollarSign,
  "Active Users": Users,
  "Churn Rate": TrendingDown,
  "Net Revenue Retention": Repeat,
};

export function KpiCard({ metric, currency = "USD", rangeLabel }: KpiCardProps) {
  const Icon = ICONS[metric.label] || DollarSign;
  const isPositiveMove = metric.change_percent >= 0;
  const isGood = metric.positive_is_good ? isPositiveMove : !isPositiveMove;

  const formattedValue =
    metric.unit === "currency"
      ? formatCurrency(metric.value, currency)
      : metric.unit === "percent"
      ? formatPercent(metric.value, metric.label === "Churn Rate" ? 2 : 1)
      : formatNumber(metric.value);

  const formattedPrev =
    metric.unit === "currency"
      ? formatCurrency(metric.previous_value, currency, true)
      : metric.unit === "percent"
      ? formatPercent(metric.previous_value, metric.label === "Churn Rate" ? 2 : 1)
      : formatNumber(metric.previous_value, true);

  return (
    <div className="group rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {metric.label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="tabular-nums text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {formattedValue}
        </p>
        <span
          className={`tabular-nums inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            isGood
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }`}
        >
          {isPositiveMove ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {Math.abs(metric.change_percent).toFixed(1)}%
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        vs. <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">{formattedPrev}</span> prior {rangeLabel}
      </p>
    </div>
  );
}
