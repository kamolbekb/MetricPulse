from datetime import datetime, timezone
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, require_admin
from app.database import get_db
from app.models import User
from app.schemas import (
    TeamListResponse,
    TeamMemberInviteRequest,
    TeamMemberRoleUpdateRequest,
    UserPublic,
)

router = APIRouter(prefix="/api/team", tags=["Team"])

AVATAR_COLORS = ["#6366f1", "#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"]


@router.get("", response_model=TeamListResponse)
def list_team(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    role_priority = {"Admin": 0, "Editor": 1, "Viewer": 2}
    members = db.query(User).order_by(User.created_at.asc()).all()
    members_sorted = sorted(members, key=lambda m: (role_priority.get(m.role, 9), m.full_name.lower()))

    counts = {
        "total": len(members_sorted),
        "Admin": sum(1 for m in members_sorted if m.role == "Admin"),
        "Editor": sum(1 for m in members_sorted if m.role == "Editor"),
        "Viewer": sum(1 for m in members_sorted if m.role == "Viewer"),
    }
    return TeamListResponse(
        members=[UserPublic.model_validate(m) for m in members_sorted],
        counts=counts,
    )


@router.post("/invite", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def invite_member(
    payload: TeamMemberInviteRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    email = payload.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workspace member with this email already exists.",
        )

    now = datetime.now(timezone.utc)
    count = db.query(User).count()
    temp_password = secrets.token_urlsafe(16)
    member = User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=hash_password(temp_password),
        role=payload.role,
        title=payload.title.strip() or "Team Member",
        department=payload.department.strip() or "Product",
        status="Invited",
        avatar_color=AVATAR_COLORS[count % len(AVATAR_COLORS)],
        last_active_at=now,
        created_at=now,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return UserPublic.model_validate(member)


@router.patch("/{member_id}/role", response_model=UserPublic)
def update_member_role(
    member_id: int,
    payload: TeamMemberRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    member = db.get(User, member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")

    if member.role == "Admin" and payload.role != "Admin":
        admin_count = db.query(User).filter(User.role == "Admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining Admin in the workspace.",
            )
        if member.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot demote your own Admin account.",
            )

    member.role = payload.role
    db.commit()
    db.refresh(member)
    return UserPublic.model_validate(member)


@router.delete("/{member_id}", status_code=status.HTTP_200_OK)
def remove_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    member = db.get(User, member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")

    if member.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own account.",
        )

    if member.role == "Admin":
        admin_count = db.query(User).filter(User.role == "Admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last Admin from the workspace.",
            )

    removed_email = member.email
    db.delete(member)
    db.commit()
    return {"removed": True, "id": member_id, "email": removed_email}
