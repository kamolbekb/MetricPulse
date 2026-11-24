"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Layers, RefreshCw } from "lucide-react";
import { api, type AnalyticsOverview, type TimeRange } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/toast";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { AcquisitionChart } from "@/components/dashboard/acquisition-chart";
import { ChartCardSkeleton, KpiGridSkeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
};

export default function OverviewPage() {
  const { workspace } = useAuth();
  const { toast } = useToast();
  const [range, setRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = workspace?.currency || "USD";

  const fetchOverview = async (selectedRange: TimeRange, showToast = false) => {
    try {
      if (data) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await api.getAnalyticsOverview(selectedRange);
      setData(res);
      if (showToast) {
        toast({ title: "Telemetry refreshed", description: `Showing ${RANGE_LABELS[selectedRange]} window.`, type: "info" });
      }
    } catch {
      toast({
        title: "Failed to load analytics",
        description: "Check that the FastAPI backend is reachable.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {workspace?.name || "MetricPulse Labs"} · Live Telemetry
          </p>
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Executive SaaS Overview
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOverview(range, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            View Customers
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 KPI Cards */}
      {loading || !data ? (
        <KpiGridSkeleton />
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.kpis.map((metric) => (
            <KpiCard
              key={metric.label}
              metric={metric}
              currency={currency}
              rangeLabel={RANGE_LABELS[range]}
            />
          ))}
        </section>
      )}

      {/* Charts Grid */}
      {loading || !data ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ChartCardSkeleton height="h-72" />
          </div>
          <ChartCardSkeleton height="h-72" />
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RevenueChart
              data={data.revenue_series}
              range={range}
              onRangeChange={setRange}
              totalRevenue={data.total_revenue_in_range}
              totalExpenses={data.total_expenses_in_range}
              netMargin={data.net_margin_percent}
              currency={currency}
            />
          </div>
          <AcquisitionChart channels={data.acquisition_channels} currency={currency} />
        </section>
      )}

      {/* Active MRR by Plan Breakdown */}
      {data && data.plan_breakdown.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800/90 dark:bg-zinc-900/60">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Active Revenue Mix by Plan Tier
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              NRR target: <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">{workspace?.nrr_target?.toFixed(1) || "118.0"}%</span>
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.plan_breakdown.map((tier) => {
              const barColor =
                tier.plan === "Enterprise"
                  ? "bg-indigo-500"
                  : tier.plan === "Pro"
                  ? "bg-sky-500"
                  : "bg-emerald-500";
              return (
                <div
                  key={tier.plan}
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {tier.plan}
                    </span>
                    <span className="tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                      {tier.customers} accounts
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="tabular-nums text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(tier.mrr, currency)}
                    </span>
                    <span className="tabular-nums text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {tier.share_percent.toFixed(1)}% of MRR
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(100, tier.share_percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
