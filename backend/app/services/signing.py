import hmac
import hashlib
import json
import secrets
from typing import Any
from app.api.errors import AppError
from app.config import settings


def canonicalize_payload(payload: Any) -> str:
    """Deterministic JSON serialization with sorted keys and compact separators."""
    if payload is None:
        return "{}"
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_payload_hash(payload: Any) -> str:
    """Compute SHA-256 fingerprint over canonicalized payload."""
    canonical_str = canonicalize_payload(payload)
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


def generate_nonce() -> str:
    """Generate cryptographically secure random nonce."""
    return secrets.token_hex(16)


def get_signing_key() -> str:
    """
    Retrieve server-held signing key.
    Section 24: Key comes from secret/environment, never sent to frontend, never logged.
    Section 25: Missing key in production fails closed (ACTION_GATE_UNAVAILABLE). No auto-generation.
    Section 26: Development may use deterministic placeholder.
    """
    key = settings.action_signing_key
    if not key:
        is_dev = settings.environment.lower() == "development"
        if not is_dev:
            raise AppError(
                status_code=503,
                code="ACTION_GATE_UNAVAILABLE",
                message="Action signing key is not configured in production environment. Safety gate is locked.",
            )
        return "development-only-deterministic-signing-secret-key-32b"
    return key


def compute_action_signature(
    intent_id: str,
    action_type: str,
    target_type: str,
    target_id: str,
    payload_hash: str,
    operator_id: str,
    created_at: str,
    expires_at: str,
    nonce: str,
) -> str:
    """Compute HMAC-SHA256 signature for server-side ActionIntent integrity."""
    signing_key = get_signing_key().encode("utf-8")
    message = (
        f"{intent_id}:{action_type}:{target_type}:{target_id}:"
        f"{payload_hash}:{operator_id}:{created_at}:{expires_at}:{nonce}"
    ).encode("utf-8")
    return hmac.new(signing_key, message, hashlib.sha256).hexdigest()


def verify_action_signature(
    signature: str,
    intent_id: str,
    action_type: str,
    target_type: str,
    target_id: str,
    payload_hash: str,
    operator_id: str,
    created_at: str,
    expires_at: str,
    nonce: str,
) -> bool:
    """Verify HMAC-SHA256 signature using constant-time comparison."""
    expected_signature = compute_action_signature(
        intent_id=intent_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        payload_hash=payload_hash,
        operator_id=operator_id,
        created_at=created_at,
        expires_at=expires_at,
        nonce=nonce,
    )
    return hmac.compare_digest(signature, expected_signature)
