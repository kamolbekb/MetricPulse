from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import User, Workspace
from app.schemas import WorkspaceOut, WorkspaceUpdateRequest

router = APIRouter(prefix="/api/workspace", tags=["Workspace"])


@router.get("", response_model=WorkspaceOut)
def get_workspace(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ws = db.query(Workspace).first()
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not initialized.")
    return WorkspaceOut.model_validate(ws)


@router.patch("", response_model=WorkspaceOut)
def update_workspace(
    payload: WorkspaceUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    ws = db.query(Workspace).first()
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not initialized.")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(ws, field, value)

    ws.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ws)
    return WorkspaceOut.model_validate(ws)
