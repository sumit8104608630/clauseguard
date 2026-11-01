"""Google Sign-In helper.

The React app uses Google Identity Services (`useGoogleLogin`) to obtain an
OAuth2 access token for the user. We exchange that token for the profile at
Google's userinfo endpoint — the token is only accepted if it was issued for
our client and carries the `openid email profile` scopes.
"""

import logging

import httpx

logger = logging.getLogger(__name__)

USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
TIMEOUT = 15.0


class GoogleAuthError(RuntimeError):
    """Raised when Google rejects the supplied token."""


def fetch_google_profile(access_token: str) -> dict:
    """Return the Google profile for `access_token` or raise GoogleAuthError."""
    if not access_token:
        raise GoogleAuthError("Missing Google access token")

    try:
        response = httpx.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=TIMEOUT,
        )
    except httpx.HTTPError as error:
        raise GoogleAuthError(f"Could not reach Google: {error}") from error

    if response.status_code != 200:
        raise GoogleAuthError("Google rejected the access token")

    profile = response.json()
    email = profile.get("email")
    if not email:
        raise GoogleAuthError("Google account has no email address")
    if profile.get("email_verified") is False:
        raise GoogleAuthError("Google account email is not verified")

    return profile
