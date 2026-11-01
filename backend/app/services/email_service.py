"""Client for the external Email/OTP microservice.

The service exposes four endpoints we care about:

    POST /api/send-otp     {email}                     -> mails a 6-digit code
    POST /api/verify-otp   {email, otp}                -> validates the code
    POST /api/send-email   {to, subject, html, text}   -> arbitrary mail
    POST /api/send-invoice ...

Everything here raises `EmailServiceError` on transport/5xx failures so callers
never silently believe a mail was delivered.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TIMEOUT = 25.0

# Statuses the microservice uses to signal "the code is wrong/expired" rather
# than "the service is broken". verify_otp() turns these into `False`.
_REJECT_STATUSES = {400, 401, 403, 409, 422}


class EmailServiceError(RuntimeError):
    """Raised when the email/OTP microservice cannot fulfil a request."""


def _endpoint(path: str) -> str:
    return f"{settings.OTP_SERVICE_URL.rstrip('/')}{path}"


def _decode(response: httpx.Response) -> dict:
    try:
        payload = response.json()
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _post(path: str, payload: dict) -> tuple[int, dict]:
    try:
        response = httpx.post(_endpoint(path), json=payload, timeout=TIMEOUT)
    except httpx.HTTPError as error:
        raise EmailServiceError(
            f"Email service unreachable ({path}): {error}"
        ) from error
    return response.status_code, _decode(response)


def send_otp(email: str) -> None:
    """Ask the microservice to email a verification code."""
    status_code, data = _post("/api/send-otp", {"email": email})
    if status_code >= 400 or data.get("success") is False:
        raise EmailServiceError(
            data.get("message") or f"Could not send verification code ({status_code})"
        )


def verify_otp(email: str, otp: str) -> bool:
    """Return True when the code matches, False when it is wrong or expired."""
    status_code, data = _post("/api/verify-otp", {"email": email, "otp": otp})

    if status_code in _REJECT_STATUSES:
        return False
    if status_code >= 500:
        raise EmailServiceError(
            data.get("message") or "Email service failed to verify the code"
        )
    return bool(data.get("success"))


def send_email(
    *,
    to: str,
    subject: str,
    html: str | None = None,
    text: str | None = None,
) -> None:
    """Send a transactional mail (welcome, password-changed, ...)."""
    payload: dict = {"to": to, "subject": subject}
    if html:
        payload["html"] = html
    if text:
        payload["text"] = text
    if settings.EMAIL_FROM:
        payload["from"] = settings.EMAIL_FROM

    status_code, data = _post("/api/send-email", payload)
    if status_code >= 400 or data.get("success") is False:
        raise EmailServiceError(
            data.get("message") or f"Could not send email ({status_code})"
        )
