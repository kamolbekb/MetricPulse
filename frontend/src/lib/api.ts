export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_STORAGE_KEY = "metricpulse_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  title: string;
  department: string;
  status: "Active" | "Invited";
  avatar_color: string;
  last_active_at: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type TimeRange = "7d" | "30d" | "90d" | "12m";

export interface KpiMetric {
  label: string;
  value: number;
  previous_value: number;
  change_percent: number;
  unit: "currency" | "number" | "percent";
  positive_is_good: boolean;
}

export interface RevenueSeriesPoint {
  label: string;
  date: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  active_users: number;
}

export interface AcquisitionChannel {
  id: number;
  channel: string;
  users: number;
  percentage: number;
  conversion_rate: number;
  cac: number;
  color: string;
}

export interface PlanBreakdownItem {
  plan: string;
  customers: number;
  mrr: number;
  share_percent: number;
}

export interface AnalyticsOverview {
  range: TimeRange;
  kpis: KpiMetric[];
  revenue_series: RevenueSeriesPoint[];
  acquisition_channels: AcquisitionChannel[];
  plan_breakdown: PlanBreakdownItem[];
  total_revenue_in_range: number;
  total_expenses_in_range: number;
  net_margin_percent: number;
}

export interface Customer {
  id: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  plan: "Starter" | "Pro" | "Enterprise";
  status: "Active" | "Trial" | "Churned";
  mrr: number;
  seats: number;
  country: string;
  industry: string;
  health_score: number;
  last_payment_date: string;
  created_at: string;
}

export interface CustomersPage {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: {
    total_mrr: number;
    active_count: number;
    trial_count: number;
    churned_count: number;
  };
}

export interface TeamListResponse {
  members: User[];
  counts: {
    total: number;
    Admin: number;
    Editor: number;
    Viewer: number;
  };
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  billing_email: string;
  currency: "USD" | "EUR" | "GBP";
  plan_tier: string;
  nrr_target: number;
  timezone: string;
  updated_at: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
        detail = data.detail[0].msg;
      }
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: { full_name: string; email: string; password: string; title?: string }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  demoLogin: (role: "Admin" | "Viewer") =>
    request<AuthResponse>("/api/auth/demo", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),

  getMe: () => request<User>("/api/auth/me"),

  getAnalyticsOverview: (range: TimeRange) =>
    request<AnalyticsOverview>(`/api/analytics/overview?range=${range}`),

  getCustomers: (params: {
    search?: string;
    status?: string;
    plan?: string;
    sort_by?: string;
    sort_dir?: "asc" | "desc";
    page?: number;
    page_size?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status && params.status !== "All") query.set("status", params.status);
    if (params.plan && params.plan !== "All") query.set("plan", params.plan);
    if (params.sort_by) query.set("sort_by", params.sort_by);
    if (params.sort_dir) query.set("sort_dir", params.sort_dir);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    return request<CustomersPage>(`/api/customers?${query.toString()}`);
  },

  exportCustomersCsv: async (params: {
    search?: string;
    status?: string;
    plan?: string;
    sort_by?: string;
    sort_dir?: "asc" | "desc";
  }): Promise<{ filename: string; rowCount: number }> => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status && params.status !== "All") query.set("status", params.status);
    if (params.plan && params.plan !== "All") query.set("plan", params.plan);
    if (params.sort_by) query.set("sort_by", params.sort_by);
    if (params.sort_dir) query.set("sort_dir", params.sort_dir);

    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/api/customers/export?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      throw new ApiError("Failed to export CSV.", res.status);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] || "metricpulse-customers.csv";
    const rowCount = Number(res.headers.get("X-Export-Row-Count") || "0");

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return { filename, rowCount };
  },

  getTeam: () => request<TeamListResponse>("/api/team"),

  inviteMember: (payload: {
    full_name: string;
    email: string;
    role: "Admin" | "Editor" | "Viewer";
    title: string;
    department: string;
  }) =>
    request<User>("/api/team/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateMemberRole: (memberId: number, role: "Admin" | "Editor" | "Viewer") =>
    request<User>(`/api/team/${memberId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeMember: (memberId: number) =>
    request<{ removed: boolean; id: number; email: string }>(`/api/team/${memberId}`, {
      method: "DELETE",
    }),

  getWorkspace: () => request<Workspace>("/api/workspace"),

  updateWorkspace: (payload: Partial<Pick<Workspace, "name" | "slug" | "billing_email" | "currency" | "nrr_target" | "timezone">>) =>
    request<Workspace>("/api/workspace", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
