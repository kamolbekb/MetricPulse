from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


RoleType = Literal["Admin", "Editor", "Viewer"]
PlanType = Literal["Starter", "Pro", "Enterprise"]
CustomerStatusType = Literal["Active", "Trial", "Churned"]


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    title: str
    department: str
    status: str
    avatar_color: str
    last_active_at: datetime
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    title: str = Field(default="Growth Analyst", max_length=120)


class DemoLoginRequest(BaseModel):
    role: Literal["Admin", "Viewer"] = "Admin"


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class KpiMetric(BaseModel):
    label: str
    value: float
    previous_value: float
    change_percent: float
    unit: Literal["currency", "number", "percent"]
    positive_is_good: bool = True


class RevenueSeriesPoint(BaseModel):
    label: str
    date: str
    revenue: float
    expenses: float
    net_profit: float
    active_users: int


class AcquisitionChannelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel: str
    users: int
    percentage: float
    conversion_rate: float
    cac: float
    color: str


class PlanBreakdownItem(BaseModel):
    plan: str
    customers: int
    mrr: float
    share_percent: float


class AnalyticsOverviewResponse(BaseModel):
    range: Literal["7d", "30d", "90d", "12m"]
    kpis: list[KpiMetric]
    revenue_series: list[RevenueSeriesPoint]
    acquisition_channels: list[AcquisitionChannelOut]
    plan_breakdown: list[PlanBreakdownItem]
    total_revenue_in_range: float
    total_expenses_in_range: float
    net_margin_percent: float


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    contact_name: str
    contact_email: str
    plan: str
    status: str
    mrr: float
    seats: int
    country: str
    industry: str
    health_score: int
    last_payment_date: date
    created_at: date


class CustomersPageResponse(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: dict[str, float | int]


class CustomerCreateRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=140)
    contact_name: str = Field(min_length=2, max_length=120)
    contact_email: EmailStr
    plan: PlanType = "Pro"
    status: CustomerStatusType = "Active"
    mrr: float = Field(ge=0, le=500000)
    seats: int = Field(ge=1, le=10000)
    country: str = Field(default="United States", max_length=60)
    industry: str = Field(default="SaaS", max_length=80)


class TeamMemberInviteRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: RoleType = "Viewer"
    title: str = Field(default="Product Specialist", max_length=120)
    department: str = Field(default="Product", max_length=80)


class TeamMemberRoleUpdateRequest(BaseModel):
    role: RoleType


class TeamListResponse(BaseModel):
    members: list[UserPublic]
    counts: dict[str, int]


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    billing_email: str
    currency: str
    plan_tier: str
    nrr_target: float
    timezone: str
    updated_at: datetime


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=120)
    billing_email: EmailStr | None = None
    currency: Literal["USD", "EUR", "GBP"] | None = None
    nrr_target: float | None = Field(default=None, ge=80.0, le=200.0)
    timezone: str | None = Field(default=None, min_length=2, max_length=64)
