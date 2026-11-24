from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import User
from app.schemas import AuthResponse, DemoLoginRequest, LoginRequest, RegisterRequest, UserPublic
from app.seed import DEMO_ADMIN_EMAIL, DEMO_VIEWER_EMAIL

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

AVATAR_PALETTE = ["#6366f1", "#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"]


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user.last_active_at = datetime.now(timezone.utc)
    if user.status == "Invited":
        user.status = "Active"
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return AuthResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_count = db.query(User).count()
    now = datetime.now(timezone.utc)
    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="Viewer",
        title=payload.title.strip() or "Growth Analyst",
        department="Analytics",
        status="Active",
        avatar_color=AVATAR_PALETTE[user_count % len(AVATAR_PALETTE)],
        last_active_at=now,
        created_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return AuthResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/demo", response_model=AuthResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)):
    target_email = DEMO_ADMIN_EMAIL if payload.role == "Admin" else DEMO_VIEWER_EMAIL
    user = db.query(User).filter(func.lower(User.email) == target_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo account not found. Please restart the server to seed demo data.",
        )

    user.last_active_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return AuthResponse(access_token=token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)
