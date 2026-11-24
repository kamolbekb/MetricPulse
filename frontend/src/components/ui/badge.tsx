"use client";

import React from "react";

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Trial:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Churned:
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    Invited:
      "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  };

  const dotStyles: Record<string, string> = {
    Active: "bg-emerald-500",
    Trial: "bg-amber-500",
    Churned: "bg-rose-500",
    Invited: "bg-sky-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status] || "bg-zinc-400"}`} />
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Admin:
      "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    Editor:
      "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    Viewer:
      "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        styles[role] || styles.Viewer
      }`}
    >
      {role}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    Enterprise:
      "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    Pro: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Starter:
      "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700/80 dark:bg-zinc-800/70 dark:text-zinc-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        styles[plan] || styles.Starter
      }`}
    >
      {plan}
    </span>
  );
}
