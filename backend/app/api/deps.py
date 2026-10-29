from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.security import (
    verify_jwt_access_token,
    verify_jwt_refresh_token,
    create_jwt_access_token,
    create_jwt_refresh_token,
)

ACCESS_MAX_AGE = 60 * 5                # 5 minutes
REFRESH_MAX_AGE = 60 * 60 * 24 * 7     # 7 days


def _set_auth_cookies(response: Response, user_id: str) -> None:
    response.set_cookie(
        "access_token",
        create_jwt_access_token(user_id),
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=ACCESS_MAX_AGE,
    )
    response.set_cookie(
        "refresh_token",
        create_jwt_refresh_token(user_id),
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_MAX_AGE,
    )


def get_current_user_id(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> str:
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")

    # 1. Try the access token first
    if access_token:
        payload = verify_jwt_access_token(access_token)
        if payload is not None:
            return payload["user_id"]

    # 2. Fall back to the refresh token
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_jwt_refresh_token(refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload["user_id"]
    _set_auth_cookies(response, user_id)
    return user_id


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user (or 401 if not authenticated)."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user