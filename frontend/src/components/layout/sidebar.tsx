"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getInitials } from "@/lib/format";
import { RoleBadge } from "@/components/ui/badge";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Building2 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workspace, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navContent = (isCompact: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3.5 dark:border-zinc-800/90">
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 overflow-hidden"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs shadow-indigo-600/30">
            <Activity className="h-4 w-4" />
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                MetricPulse
              </p>
              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {workspace?.name || "MetricPulse Labs"}
              </p>
            </div>
          )}
        </Link>

        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 lg:inline-flex dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Mobile close */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 lg:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2.5">
        {!isCompact && (
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Workspace
          </p>
        )}
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onCloseMobile}
              title={isCompact ? label : undefined}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
              } ${isCompact ? "justify-center px-2" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCompact && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Plan indicator */}
      {!isCompact && (
        <div className="mx-2.5 mb-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {workspace?.plan_tier || "Enterprise"} Plan
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Role-based access active. Signed in as <span className="font-medium text-zinc-700 dark:text-zinc-300">{user?.role}</span>.
          </p>
        </div>
      )}

      {/* User footer */}
      {user && (
        <div className="border-t border-zinc-200 p-2.5 dark:border-zinc-800/90">
          <div
            className={`flex items-center gap-2.5 rounded-lg p-1.5 ${
              isCompact ? "justify-center" : ""
            }`}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: user.avatar_color || "#6366f1" }}
            >
              {getInitials(user.full_name)}
            </div>
            {!isCompact && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.full_name}
                  </p>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <RoleBadge role={user.role} />
                </div>
              </div>
            )}
            {!isCompact && (
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-zinc-200 bg-white transition-all duration-200 lg:block dark:border-zinc-800/90 dark:bg-zinc-950 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <div className="sticky top-0 h-screen">{navContent(collapsed)}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            {navContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
