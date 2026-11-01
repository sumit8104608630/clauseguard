"""Transactional notification mail (welcome, password changed).

These are best-effort: the account action (registration / password reset) has
already succeeded in the database, so a delivery failure is logged instead of
being surfaced as an error to the user.
"""

import logging

from app.config import settings
from app.services.email_service import EmailServiceError, send_email

logger = logging.getLogger(__name__)


def _brand_wrapper(heading: str, body_html: str) -> str:
    return f"""
    <div style="font-family:Georgia,'Times New Roman',serif;background:#f4f5f8;padding:32px">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ec;border-radius:10px">
        <div style="background:#0f1b33;padding:20px 28px">
          <p style="margin:0;color:#ffffff;font-size:18px;letter-spacing:.4px">ClauseGuard</p>
          <p style="margin:4px 0 0;color:#9aa6bd;font-size:12px">Contract Analyzer</p>
        </div>
        <div style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0f1b33">{heading}</h1>
          {body_html}
        </div>
        <div style="padding:16px 28px;border-top:1px solid #e2e5ec">
          <p style="margin:0;font-size:11px;color:#8a94a6">
            This is an automated message from ClauseGuard.
          </p>
        </div>
      </div>
    </div>
    """


def notify_registration(user_email: str, full_name: str | None) -> None:
    """Welcome mail sent right after a successful registration."""
    name = full_name or "there"
    html = _brand_wrapper(
        f"Welcome aboard, {name}",
        f"""
        <p style="margin:0 0 14px;font-size:14px;color:#3c4761;line-height:1.6">
          Your email <strong>{user_email}</strong> is verified and your ClauseGuard
          account is ready.
        </p>
        <p style="margin:0 0 22px;font-size:14px;color:#3c4761;line-height:1.6">
          Upload a contract to extract clauses, run a risk review, and chat with
          your documents.
        </p>
        <a href="{settings.FRONTEND_URL}"
           style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;
                  padding:11px 20px;border-radius:6px;font-size:14px">
          Open your dashboard
        </a>
        """,
    )
    _deliver(user_email, "Welcome to ClauseGuard", html)


def notify_password_changed(user_email: str) -> None:
    """Security notice sent after a password reset."""
    html = _brand_wrapper(
        "Your password was changed",
        f"""
        <p style="margin:0 0 14px;font-size:14px;color:#3c4761;line-height:1.6">
          The password for <strong>{user_email}</strong> was reset a moment ago.
        </p>
        <p style="margin:0;font-size:14px;color:#3c4761;line-height:1.6">
          If this wasn't you, reply to this email immediately so we can secure
          your account.
        </p>
        """,
    )
    _deliver(user_email, "Your ClauseGuard password was changed", html)


def _deliver(to: str, subject: str, html: str) -> None:
    try:
        send_email(to=to, subject=subject, html=html)
    except EmailServiceError as error:
        logger.warning("Notification mail to %s failed: %s", to, error)
