import csv
from datetime import date
import io
import math
from typing import Literal
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Customer, User
from app.schemas import CustomerCreateRequest, CustomerOut, CustomersPageResponse

router = APIRouter(prefix="/api/customers", tags=["Customers"])

SORTABLE_COLUMNS = {
    "company_name": Customer.company_name,
    "plan": Customer.plan,
    "status": Customer.status,
    "mrr": Customer.mrr,
    "seats": Customer.seats,
    "health_score": Customer.health_score,
    "last_payment_date": Customer.last_payment_date,
    "created_at": Customer.created_at,
}


def _apply_filters(
    query,
    search: str | None,
    status_filter: str | None,
    plan_filter: str | None,
):
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Customer.company_name).like(term),
                func.lower(Customer.contact_name).like(term),
                func.lower(Customer.contact_email).like(term),
                func.lower(Customer.industry).like(term),
                func.lower(Customer.country).like(term),
            )
        )
    if status_filter and status_filter != "All":
        query = query.filter(Customer.status == status_filter)
    if plan_filter and plan_filter != "All":
        query = query.filter(Customer.plan == plan_filter)
    return query


@router.get("", response_model=CustomersPageResponse)
def list_customers(
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    plan_filter: str | None = Query(default=None, alias="plan"),
    sort_by: str = Query(default="mrr"),
    sort_dir: Literal["asc", "desc"] = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=5, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    filtered = _apply_filters(db.query(Customer), search, status_filter, plan_filter)
    total = filtered.count()

    total_mrr = filtered.with_entities(func.coalesce(func.sum(Customer.mrr), 0.0)).scalar() or 0.0
    active_count = filtered.filter(Customer.status == "Active").count()
    trial_count = filtered.filter(Customer.status == "Trial").count()
    churned_count = filtered.filter(Customer.status == "Churned").count()

    sort_col = SORTABLE_COLUMNS.get(sort_by, Customer.mrr)
    order_clause = asc(sort_col) if sort_dir == "asc" else desc(sort_col)

    total_pages = max(1, math.ceil(total / page_size))
    safe_page = min(page, total_pages)

    items = (
        filtered.order_by(order_clause, Customer.id.asc())
        .offset((safe_page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return CustomersPageResponse(
        items=[CustomerOut.model_validate(item) for item in items],
        total=total,
        page=safe_page,
        page_size=page_size,
        total_pages=total_pages,
        summary={
            "total_mrr": round(float(total_mrr), 2),
            "active_count": active_count,
            "trial_count": trial_count,
            "churned_count": churned_count,
        },
    )


@router.get("/export")
def export_customers_csv(
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    plan_filter: str | None = Query(default=None, alias="plan"),
    sort_by: str = Query(default="mrr"),
    sort_dir: Literal["asc", "desc"] = Query(default="desc"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    filtered = _apply_filters(db.query(Customer), search, status_filter, plan_filter)
    sort_col = SORTABLE_COLUMNS.get(sort_by, Customer.mrr)
    order_clause = asc(sort_col) if sort_dir == "asc" else desc(sort_col)
    rows = filtered.order_by(order_clause, Customer.id.asc()).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "ID",
            "Company Name",
            "Contact Name",
            "Contact Email",
            "Plan",
            "Status",
            "MRR (USD)",
            "Seats",
            "Country",
            "Industry",
            "Health Score",
            "Last Payment Date",
            "Customer Since",
        ]
    )
    for c in rows:
        writer.writerow(
            [
                c.id,
                c.company_name,
                c.contact_name,
                c.contact_email,
                c.plan,
                c.status,
                f"{c.mrr:.2f}",
                c.seats,
                c.country,
                c.industry,
                c.health_score,
                c.last_payment_date.isoformat(),
                c.created_at.isoformat(),
            ]
        )

    csv_bytes = buffer.getvalue().encode("utf-8")
    filename = f"metricpulse-customers-{date.today().isoformat()}.csv"

    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Export-Row-Count": str(len(rows)),
        },
    )


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    today = date.today()
    customer = Customer(
        company_name=payload.company_name.strip(),
        contact_name=payload.contact_name.strip(),
        contact_email=payload.contact_email.strip().lower(),
        plan=payload.plan,
        status=payload.status,
        mrr=payload.mrr,
        seats=payload.seats,
        country=payload.country.strip(),
        industry=payload.industry.strip(),
        health_score=88 if payload.status == "Active" else (75 if payload.status == "Trial" else 25),
        last_payment_date=today,
        created_at=today,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return CustomerOut.model_validate(customer)
