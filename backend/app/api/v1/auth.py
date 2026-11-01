"""/user/register, /user/login, /user/logout and the OTP / Google auth flows.

Registration is gated on an email OTP issued by the external email microservice:

    1. POST /user/send-otp        -> mails a code to the address
    2. POST /user/register        -> verifies the code, then creates the account

Password recovery reuses the same service:

    3. POST /user/forgot-password -> mails a code (only for known accounts)
    4. POST /user/reset-password  -> verifies the code, then stores the new password
"""

from typing import Annotated

from fastapi import APIRouter, status, HTTPException, Response
from fastapi.params import Depends
from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.user import User
from app.api.deps import _set_auth_cookies
from app.schemas.user import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResetPasswordRequest,
    SendOtpRequest,
    UserCreate,
    UserLogin,
)
from app.services.email_service import (
    EmailServiceError,
    send_otp,
    verify_otp,
)
from app.services.google_auth import GoogleAuthError, fetch_google_profile
from app.services.notifications import (
    notify_password_changed,
    notify_registration,
)

db_session = Annotated[Session, Depends(get_db)]
router = APIRouter()

# create base url
router.prefix = "/user"
router.tags = ["user"]


def _user_payload(user_db: User) -> dict:
    return {
        "id": str(user_db.id),
        "email": user_db.email,
        "full_name": user_db.full_name,
        "created_at": user_db.created_at,
    }


# --- registration ---------------------------------------------------------


@router.post("/send-otp", status_code=status.HTTP_200_OK)
def send_registration_otp(payload: SendOtpRequest, db: db_session):
    """Mail a verification code before the account is created."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="email already exists"
        )

    try:
        send_otp(payload.email)
    except EmailServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not send the verification code: {error}",
        )

    return {"message": f"Verification code sent to {payload.email}"}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: db_session, response: Response):
    """Register a new user once the emailed code has been verified."""
    if not all([user.email, user.password, user.full_name]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email, password and full_name are required",
        )

    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="email already exists"
        )

    try:
        otp_ok = verify_otp(user.email, user.otp)
    except EmailServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not verify the code: {error}",
        )

    if not otp_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    user_db = User(
        email=user.email,
        full_name=user.full_name,
        password=hash_password(user.password),  # column is named "password"
    )
    db.add(user_db)
    db.commit()
    db.refresh(user_db)

    # Best-effort: the account already exists, so a mail failure must not 500.
    notify_registration(user_db.email, user_db.full_name)

    # Sign the new user straight in — the OTP already proved they own the inbox.
    _set_auth_cookies(response, str(user_db.id))

    return {
        "message": "User registered successfully",
        "user": _user_payload(user_db),
    }


# --- session --------------------------------------------------------------


@router.post("/login", status_code=status.HTTP_200_OK)
def login(user: UserLogin, db: db_session, response: Response):
    """Login a user."""
    if not all([user.email, user.password]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email and password are required",
        )
    user_db = db.query(User).filter(User.email == user.email).first()
    if not user_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="email is incorrect"
        )
    if not user_db.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was created with Google — continue with Google instead",
        )
    if not verify_password(user.password, user_db.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="password is incorrect"
        )

    # Reuse the shared helper so login sets the exact same cookie attributes
    # (httponly / secure / samesite / max_age) as the refresh flow in deps.py.
    _set_auth_cookies(response, str(user_db.id))
    return {
        "message": "Login successful",
        "user": _user_payload(user_db),
    }


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    """Clear the auth cookies so the user is signed out."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


# --- forgot password ------------------------------------------------------


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest, db: db_session):
    """Mail a reset code. The response is identical for unknown addresses so the
    endpoint cannot be used to enumerate registered emails."""
    user_db = db.query(User).filter(User.email == payload.email).first()

    if user_db is not None:
        try:
            send_otp(payload.email)
        except EmailServiceError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not send the reset code: {error}",
            )

    return {
        "message": "If that email is registered, a reset code is on its way.",
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: db_session):
    """Verify the reset code and store the new password."""
    user_db = db.query(User).filter(User.email == payload.email).first()
    if user_db is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="email is incorrect"
        )

    try:
        otp_ok = verify_otp(payload.email, payload.otp)
    except EmailServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not verify the code: {error}",
        )

    if not otp_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    user_db.password = hash_password(payload.new_password)
    db.commit()

    notify_password_changed(user_db.email)

    return {"message": "Password updated successfully"}


# --- google ---------------------------------------------------------------


@router.post("/google", status_code=status.HTTP_200_OK)
def google_login(payload: GoogleAuthRequest, db: db_session, response: Response):
    """Sign in (or sign up) with a Google account."""
    try:
        profile = fetch_google_profile(payload.access_token)
    except GoogleAuthError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google sign-in failed: {error}",
        )

    email = profile["email"]
    google_id = profile.get("sub")

    user_db = db.query(User).filter(User.email == email).first()
    is_new = user_db is None

    if user_db is None:
        user_db = User(
            email=email,
            full_name=profile.get("name"),
            password=None,
            google_id=google_id,
        )
        db.add(user_db)
    elif user_db.google_id is None:
        # Link the Google identity to an existing email/password account.
        user_db.google_id = google_id

    db.commit()
    db.refresh(user_db)

    if is_new:
        notify_registration(user_db.email, user_db.full_name)

    _set_auth_cookies(response, str(user_db.id))
    return {
        "message": "Login successful",
        "user": _user_payload(user_db),
    }
