"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Lock, Save } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";

export default function SettingsPage() {
  const { workspace, isAdmin, user, refreshWorkspace } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");
  const [nrrTarget, setNrrTarget] = useState("118.0");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setName(workspace.name);
    setSlug(workspace.slug);
    setBillingEmail(workspace.billing_email);
    setCurrency(workspace.currency);
    setNrrTarget(String(workspace.nrr_target));
    setTimezone(workspace.timezone);
  }, [workspace]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await api.updateWorkspace({
        name,
        slug,
        billing_email: billingEmail,
        currency,
        nrr_target: Number(nrrTarget),
        timezone,
      });
      await refreshWorkspace();
      toast({
        title: "Workspace settings saved",
        description: "Updated preferences are now active across MetricPulse.",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save workspace settings.";
      toast({ title: "Save failed", description: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Workspace Settings
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Organization identity, currency formatting, and retention targets
        </p>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Settings locked for {user?.role} role</p>
            <p className="mt-0.5 opacity-90">
              Switch to Demo Admin from the top bar to edit and persist workspace settings.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800/90 dark:bg-zinc-900/60"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ws-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Workspace Name
            </label>
            <input
              id="ws-name"
              type="text"
              required
              disabled={!isAdmin}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="ws-slug" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Workspace Slug
            </label>
            <input
              id="ws-slug"
              type="text"
              required
              disabled={!isAdmin}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ws-billing" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Billing Contact Email
          </label>
          <input
            id="ws-billing"
            type="email"
            required
            disabled={!isAdmin}
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ws-currency" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Reporting Currency
            </label>
            <select
              id="ws-currency"
              disabled={!isAdmin}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "EUR" | "GBP")}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label htmlFor="ws-nrr" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              NRR Target (%)
            </label>
            <input
              id="ws-nrr"
              type="number"
              step="0.5"
              min="80"
              max="200"
              required
              disabled={!isAdmin}
              value={nrrTarget}
              onChange={(e) => setNrrTarget(e.target.value)}
              className="tabular-nums mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="ws-tz" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Reporting Timezone
            </label>
            <select
              id="ws-tz"
              disabled={!isAdmin}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {workspace?.updated_at
              ? `Last updated ${formatDate(workspace.updated_at)}`
              : "Workspace synced"}
          </p>

          <button
            type="submit"
            disabled={!isAdmin || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
