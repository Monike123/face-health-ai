"""Clerk session verification for the web API."""

from __future__ import annotations

import os

from clerk_backend_api.security import authenticate_request
from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import HTTPException, Request


def require_user(request: Request) -> str:
    """Return the Clerk user id or raise 401. Fails closed when auth is misconfigured."""
    secret = os.environ.get("CLERK_SECRET_KEY")
    parties = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
    if not secret or (os.environ.get("VERCEL") and not parties):
        raise HTTPException(status_code=503, detail="auth not configured")
    state = authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=secret,
            authorized_parties=parties or None,
            accepts_token=["session_token"],
        ),
    )
    if not state.is_signed_in or not state.payload:
        raise HTTPException(status_code=401, detail="sign in required")
    return str(state.payload["sub"])
