"use client";

import React from "react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800/90 dark:bg-zinc-900/60"
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-5 w-14 rounded-full" />
          </div>
          <SkeletonBlock className="mt-4 h-8 w-32" />
          <SkeletonBlock className="mt-3 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function ChartCardSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800/90 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-4 w-44" />
          <SkeletonBlock className="mt-2 h-3 w-64" />
        </div>
        <SkeletonBlock className="h-8 w-44 rounded-lg" />
      </div>
      <SkeletonBlock className={`mt-6 w-full rounded-lg ${height}`} />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800/90 dark:bg-zinc-900/60">
      <div className="border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
        <SkeletonBlock className="h-4 w-full max-w-xl" />
      </div>
      <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-4 px-5 py-3.5">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3.5 w-40" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-full" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
