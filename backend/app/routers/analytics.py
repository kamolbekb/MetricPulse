from collections import OrderedDict
from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import AcquisitionChannel, Customer, DailyMetric, User
from app.schemas import (
    AcquisitionChannelOut,
    AnalyticsOverviewResponse,
    KpiMetric,
    PlanBreakdownItem,
    RevenueSeriesPoint,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90, "12m": 365}


def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round(((current - previous) / abs(previous)) * 100.0, 1)


def _aggregate_series(
    rows: list[DailyMetric],
    range_key: Literal["7d", "30d", "90d", "12m"],
) -> list[RevenueSeriesPoint]:
    if range_key in ("7d", "30d"):
        return [
            RevenueSeriesPoint(
                label=row.metric_date.strftime("%b %d"),
                date=row.metric_date.isoformat(),
                revenue=round(row.revenue, 2),
                expenses=round(row.expenses, 2),
                net_profit=round(row.revenue - row.expenses, 2),
                active_users=row.active_users,
            )
            for row in rows
        ]

    if range_key == "90d":
        # Group into ISO weeks for crisp 13-point trend
        buckets: OrderedDict[str, list[DailyMetric]] = OrderedDict()
        for row in rows:
            iso_year, iso_week, _ = row.metric_date.isocalendar()
            key = f"{iso_year}-W{iso_week:02d}"
            buckets.setdefault(key, []).append(row)

        series: list[RevenueSeriesPoint] = []
        for items in buckets.values():
            rev = sum(r.revenue for r in items)
            exp = sum(r.expenses for r in items)
            avg_users = int(sum(r.active_users for r in items) / len(items))
            start_day = items[0].metric_date
            series.append(
                RevenueSeriesPoint(
                    label=start_day.strftime("%b %d"),
                    date=start_day.isoformat(),
                    revenue=round(rev, 2),
                    expenses=round(exp, 2),
                    net_profit=round(rev - exp, 2),
                    active_users=avg_users,
                )
            )
        return series

    # 12m -> Monthly buckets (normalize partial edge months to 30-day pace so the curve stays apples-to-apples)
    month_buckets: OrderedDict[str, list[DailyMetric]] = OrderedDict()
    for row in rows:
        key = row.metric_date.strftime("%Y-%m")
        month_buckets.setdefault(key, []).append(row)

    # Drop a tiny leading partial month (<12 days) so we display a clean 12-month window
    bucket_list = list(month_buckets.values())
    if len(bucket_list) > 12 and len(bucket_list[0]) < 15:
        bucket_list = bucket_list[1:]

    series = []
    for items in bucket_list:
        scale = 30.0 / len(items) if len(items) < 28 else 1.0
        rev = sum(r.revenue for r in items) * scale
        exp = sum(r.expenses for r in items) * scale
        avg_users = int(sum(r.active_users for r in items) / len(items))
        anchor = items[0].metric_date
        series.append(
            RevenueSeriesPoint(
                label=anchor.strftime("%b '%y"),
                date=anchor.isoformat(),
                revenue=round(rev, 2),
                expenses=round(exp, 2),
                net_profit=round(rev - exp, 2),
                active_users=avg_users,
            )
        )
    return series


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_overview(
    range_param: Literal["7d", "30d", "90d", "12m"] = Query(default="30d", alias="range"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    days = RANGE_DAYS[range_param]
    all_metrics = db.query(DailyMetric).order_by(DailyMetric.metric_date.asc()).all()

    if not all_metrics:
        return AnalyticsOverviewResponse(
            range=range_param,
            kpis=[],
            revenue_series=[],
            acquisition_channels=[],
            plan_breakdown=[],
            total_revenue_in_range=0.0,
            total_expenses_in_range=0.0,
            net_margin_percent=0.0,
        )

    current_slice = all_metrics[-days:]
    # Comparison period: same length immediately preceding, or earliest available slice for 12m
    if len(all_metrics) >= days * 2:
        prev_slice = all_metrics[-days * 2 : -days]
    else:
        half = max(1, len(all_metrics) // 2)
        prev_slice = all_metrics[:half]

    latest = current_slice[-1]
    prev_anchor = prev_slice[-1]

    avg_churn_curr = sum(r.churn_rate for r in current_slice) / len(current_slice)
    avg_churn_prev = sum(r.churn_rate for r in prev_slice) / len(prev_slice)
    avg_nrr_curr = sum(r.nrr for r in current_slice) / len(current_slice)
    avg_nrr_prev = sum(r.nrr for r in prev_slice) / len(prev_slice)

    kpis = [
        KpiMetric(
            label="Monthly Recurring Revenue",
            value=round(latest.mrr, 2),
            previous_value=round(prev_anchor.mrr, 2),
            change_percent=_pct_change(latest.mrr, prev_anchor.mrr),
            unit="currency",
            positive_is_good=True,
        ),
        KpiMetric(
            label="Active Users",
            value=float(latest.active_users),
            previous_value=float(prev_anchor.active_users),
            change_percent=_pct_change(float(latest.active_users), float(prev_anchor.active_users)),
            unit="number",
            positive_is_good=True,
        ),
        KpiMetric(
            label="Churn Rate",
            value=round(avg_churn_curr, 2),
            previous_value=round(avg_churn_prev, 2),
            change_percent=_pct_change(avg_churn_curr, avg_churn_prev),
            unit="percent",
            positive_is_good=False,
        ),
        KpiMetric(
            label="Net Revenue Retention",
            value=round(avg_nrr_curr, 1),
            previous_value=round(avg_nrr_prev, 1),
            change_percent=_pct_change(avg_nrr_curr, avg_nrr_prev),
            unit="percent",
            positive_is_good=True,
        ),
    ]

    revenue_series = _aggregate_series(current_slice, range_param)
    total_rev = round(sum(p.revenue for p in revenue_series), 2)
    total_exp = round(sum(p.expenses for p in revenue_series), 2)
    net_margin = round(((total_rev - total_exp) / total_rev) * 100.0, 1) if total_rev > 0 else 0.0

    channels = db.query(AcquisitionChannel).order_by(AcquisitionChannel.users.desc()).all()

    plan_rows = (
        db.query(
            Customer.plan,
            func.count(Customer.id).label("cnt"),
            func.coalesce(func.sum(Customer.mrr), 0.0).label("mrr_sum"),
        )
        .filter(Customer.status == "Active")
        .group_by(Customer.plan)
        .all()
    )
    total_active_mrr = sum(float(r.mrr_sum) for r in plan_rows) or 1.0
    plan_order = {"Enterprise": 0, "Pro": 1, "Starter": 2}
    plan_breakdown = [
        PlanBreakdownItem(
            plan=r.plan,
            customers=int(r.cnt),
            mrr=round(float(r.mrr_sum), 2),
            share_percent=round((float(r.mrr_sum) / total_active_mrr) * 100.0, 1),
        )
        for r in sorted(plan_rows, key=lambda x: plan_order.get(x.plan, 99))
    ]

    return AnalyticsOverviewResponse(
        range=range_param,
        kpis=kpis,
        revenue_series=revenue_series,
        acquisition_channels=[AcquisitionChannelOut.model_validate(c) for c in channels],
        plan_breakdown=plan_breakdown,
        total_revenue_in_range=total_rev,
        total_expenses_in_range=total_exp,
        net_margin_percent=net_margin,
    )
