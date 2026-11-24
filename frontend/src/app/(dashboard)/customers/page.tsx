"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { api, type CustomersPage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/toast";
import { PlanBadge, StatusBadge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

const STATUS_OPTIONS = ["All", "Active", "Trial", "Churned"] as const;
const PLAN_OPTIONS = ["All", "Starter", "Pro", "Enterprise"] as const;

type SortField = "company_name" | "plan" | "status" | "mrr" | "seats" | "health_score" | "last_payment_date";

export default function CustomersPageView() {
  const { workspace } = useAuth();
  const { toast } = useToast();
  const currency = workspace?.currency || "USD";

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [planFilter, setPlanFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortField>("mrr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [data, setData] = useState<CustomersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers({
        search: debouncedSearch || undefined,
        status: statusFilter,
        plan: planFilter,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: pageSize,
      });
      setData(res);
    } catch {
      toast({
        title: "Failed to fetch customers",
        description: "Unable to reach the customers endpoint.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, planFilter, sortBy, sortDir, page, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSort = (column: SortField) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "company_name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { filename, rowCount } = await api.exportCustomersCsv({
        search: debouncedSearch || undefined,
        status: statusFilter,
        plan: planFilter,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      toast({
        title: "CSV export complete",
        description: `Downloaded ${rowCount || data?.total || 0} filtered records to ${filename}.`,
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not download CSV from the backend.",
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("All");
    setPlanFilter("All");
    setPage(1);
  };

  const hasActiveFilters = Boolean(debouncedSearch) || statusFilter !== "All" || planFilter !== "All";

  const SortIcon = ({ col }: { col: SortField }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-indigo-500" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-500" />
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Export CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Customers & Subscriptions
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {data ? `${data.total} matching B2B accounts` : "Loading accounts..."}
            {data && ` · Filtered MRR: ${formatCurrency(data.summary.total_mrr, currency)}`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Export to CSV
        </button>
      </div>

      {/* Summary Strip */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800/90 dark:bg-zinc-900/60">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Filtered MRR</p>
            <p className="tabular-nums mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(data.summary.total_mrr, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800/90 dark:bg-zinc-900/60">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Active</p>
            <p className="tabular-nums mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {data.summary.active_count}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800/90 dark:bg-zinc-900/60">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Trial</p>
            <p className="tabular-nums mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
              {data.summary.trial_count}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800/90 dark:bg-zinc-900/60">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Churned</p>
            <p className="tabular-nums mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
              {data.summary.churned_count}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 md:flex-row md:items-center md:justify-between dark:border-zinc-800/90 dark:bg-zinc-900/60">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search company, contact, industry..."
            aria-label="Search customers"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-8 text-xs text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:bg-zinc-950"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Status: {opt}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by plan"
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Plan: {opt}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      {loading && !data ? (
        <TableSkeleton rows={10} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800/90 dark:bg-zinc-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort("company_name")}
                      className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Company <SortIcon col="company_name" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort("plan")}
                      className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Plan <SortIcon col="plan" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Status <SortIcon col="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("mrr")}
                      className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      MRR <SortIcon col="mrr" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("seats")}
                      className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Seats <SortIcon col="seats" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort("health_score")}
                      className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Health <SortIcon col="health_score" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("last_payment_date")}
                      className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Last Billing <SortIcon col="last_payment_date" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {data && data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
                      No customers match the current search or filters.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((customer) => {
                    const healthColor =
                      customer.health_score >= 75
                        ? "bg-emerald-500"
                        : customer.health_score >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500";

                    return (
                      <tr
                        key={customer.id}
                        className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {customer.company_name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {customer.contact_name} · {customer.industry}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={customer.plan} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={customer.status} />
                        </td>
                        <td className="tabular-nums px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {customer.mrr > 0 ? formatCurrency(customer.mrr, currency) : "—"}
                        </td>
                        <td className="tabular-nums px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">
                          {customer.seats}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                              <div
                                className={`h-full rounded-full ${healthColor}`}
                                style={{ width: `${customer.health_score}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                              {customer.health_score}
                            </span>
                          </div>
                        </td>
                        <td className="tabular-nums px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">
                          {formatDate(customer.last_payment_date)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {data && (
            <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing{" "}
                <span className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {data.total === 0 ? 0 : (data.page - 1) * data.page_size + 1}
                </span>
                –
                <span className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {Math.min(data.page * data.page_size, data.total)}
                </span>{" "}
                of{" "}
                <span className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {data.total}
                </span>{" "}
                customers
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="tabular-nums px-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Page {data.page} of {data.total_pages}
                </span>
                <button
                  type="button"
                  disabled={data.page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
