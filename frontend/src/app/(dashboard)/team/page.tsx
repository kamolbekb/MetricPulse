"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { api, ApiError, type TeamListResponse, type User } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/toast";
import { RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatRelativeTime, getInitials } from "@/lib/format";

export default function TeamPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Invite form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Editor" | "Viewer">("Editor");
  const [title, setTitle] = useState("Product Analyst");
  const [department, setDepartment] = useState("Product");
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTeam();
      setTeam(res);
    } catch {
      toast({ title: "Failed to load team members", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const created = await api.inviteMember({
        full_name: fullName,
        email,
        role,
        title,
        department,
      });
      toast({
        title: `Invited ${created.full_name}`,
        description: `${created.email} added as ${created.role}.`,
      });
      setInviteOpen(false);
      setFullName("");
      setEmail("");
      setRole("Editor");
      setTitle("Product Analyst");
      setDepartment("Product");
      await loadTeam();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to invite member.";
      toast({ title: "Invite failed", description: msg, type: "error" });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: User, nextRole: "Admin" | "Editor" | "Viewer") => {
    if (member.role === nextRole) return;
    setUpdatingId(member.id);
    try {
      const updated = await api.updateMemberRole(member.id, nextRole);
      setTeam((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) => (m.id === updated.id ? updated : m)),
              counts: {
                total: prev.members.length,
                Admin: prev.members.filter((m) => (m.id === updated.id ? updated.role : m.role) === "Admin").length,
                Editor: prev.members.filter((m) => (m.id === updated.id ? updated.role : m.role) === "Editor").length,
                Viewer: prev.members.filter((m) => (m.id === updated.id ? updated.role : m.role) === "Viewer").length,
              },
            }
          : prev
      );
      toast({
        title: "Role updated",
        description: `${updated.full_name} is now ${updated.role}.`,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not update role.";
      toast({ title: "Role update failed", description: msg, type: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (member: User) => {
    setUpdatingId(member.id);
    try {
      await api.removeMember(member.id);
      toast({
        title: "Member removed",
        description: `${member.full_name} was removed from the workspace.`,
      });
      await loadTeam();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not remove member.";
      toast({ title: "Removal failed", description: msg, type: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Workspace Team
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Control access across dashboards, customer exports, and workspace configuration
          </p>
        </div>

        <button
          type="button"
          disabled={!isAdmin}
          onClick={() => setInviteOpen(true)}
          title={!isAdmin ? "Admin role required to invite members" : undefined}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite Member
        </button>
      </div>

      {/* RBAC Notice for Viewer */}
      {!isAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Read-only access ({currentUser?.role} role)</p>
            <p className="mt-0.5 opacity-90">
              Only workspace Admins can invite members, change roles, or remove users. Use the{" "}
              <strong>Switch to Admin</strong> button in the top bar to test full Admin controls.
            </p>
          </div>
        </div>
      )}

      {/* Role Summary Cards */}
      {team && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Members", value: team.counts.total },
            { label: "Admins", value: team.counts.Admin },
            { label: "Editors", value: team.counts.Editor },
            { label: "Viewers", value: team.counts.Viewer },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800/90 dark:bg-zinc-900/60"
            >
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </p>
              <p className="tabular-nums mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Team Members Table */}
      {loading && !team ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800/90 dark:bg-zinc-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Last Active</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {team?.members.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  const isBusy = updatingId === member.id;
                  return (
                    <tr
                      key={member.id}
                      className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: member.avatar_color || "#6366f1" }}
                          >
                            {getInitials(member.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {member.full_name}
                              {isSelf && (
                                <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{member.title}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {member.department}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin && !isSelf ? (
                          <div className="inline-flex items-center gap-2">
                            <select
                              aria-label={`Change role for ${member.full_name}`}
                              value={member.role}
                              disabled={isBusy}
                              onChange={(e) =>
                                handleRoleChange(
                                  member,
                                  e.target.value as "Admin" | "Editor" | "Viewer"
                                )
                              }
                              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Editor">Editor</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                            {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />}
                          </div>
                        ) : (
                          <RoleBadge role={member.role} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {formatRelativeTime(member.last_active_at)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={isSelf || isBusy}
                            onClick={() => handleRemove(member)}
                            aria-label={`Remove ${member.full_name}`}
                            title={isSelf ? "You cannot remove your own account" : "Remove member"}
                            className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Matrix Reference */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800/90 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          Role Capabilities
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200/70 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <RoleBadge role="Admin" />
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Full access: analytics, CSV export, invite/remove team members, role toggles, and workspace settings.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200/70 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <RoleBadge role="Editor" />
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              View all SaaS metrics, filter & export customer datasets, and collaborate on analytics views.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200/70 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <RoleBadge role="Viewer" />
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Read-only access to dashboards, customer tables, and CSV exports. Team & settings mutations blocked.
            </p>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        description="Add a collaborator to MetricPulse and assign their workspace role."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label htmlFor="invite-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Full name
            </label>
            <input
              id="invite-name"
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jordan Ellis"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="invite-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Work email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan.ellis@metricpulse.io"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="invite-title" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Title
              </label>
              <input
                id="invite-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label htmlFor="invite-dept" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Department
              </label>
              <input
                id="invite-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "Admin" | "Editor" | "Viewer")}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="Admin">Admin — Full workspace & team control</option>
              <option value="Editor">Editor — Analytics & reporting collaborator</option>
              <option value="Viewer">Viewer — Read-only dashboards & CSV export</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {inviting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
