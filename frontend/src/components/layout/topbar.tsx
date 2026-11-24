"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Moon, Sun, ArrowLeftRight } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/toast";
import { RoleBadge } from "@/components/ui/badge";

interface TopbarProps {
  onOpenMobile: () => void;
}

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Overview",
    subtitle: "Real-time SaaS revenue, retention, and acquisition telemetry",
  },
  "/customers": {
    title: "Customers",
    subtitle: "Search, filter, and export B2B subscription accounts",
  },
  "/team": {
    title: "Team Management",
    subtitle: "Manage workspace members, invitations, and RBAC permissions",
  },
  "/settings": {
    title: "Workspace Settings",
    subtitle: "Configure workspace profile, reporting currency, and NRR targets",
  },
};

export function Topbar({ onOpenMobile }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, demoLogin } = useAuth();
  const { toast } = useToast();

  const meta = ROUTE_META[pathname] || {
    title: "MetricPulse",
    subtitle: "SaaS Analytics Workspace",
  };

  const handleQuickRoleSwitch = async () => {
    const nextRole = user?.role === "Admin" ? "Viewer" : "Admin";
    try {
      await demoLogin(nextRole);
      toast({
        title: `Switched to Demo ${nextRole}`,
        description:
          nextRole === "Admin"
            ? "Full workspace management & team controls unlocked."
            : "Read-only analytics & CSV export mode active.",
        type: "info",
      });
      router.refresh();
    } catch {
      toast({ title: "Unable to switch demo role", type: "error" });
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 dark:border-zinc-800/90 dark:bg-zinc-950/80">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 lg:hidden dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-zinc-900 sm:text-base dark:text-zinc-50">
            {meta.title}
          </h1>
          <p className="hidden truncate text-xs text-zinc-500 sm:block dark:text-zinc-400">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <button
            type="button"
            onClick={handleQuickRoleSwitch}
            title="Switch between Demo Admin and Demo Viewer to test RBAC"
            className="hidden items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 sm:inline-flex dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
            <span>Switch to {user.role === "Admin" ? "Viewer" : "Admin"}</span>
          </button>
        )}

        {user && (
          <div className="sm:hidden">
            <RoleBadge role={user.role} />
          </div>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
