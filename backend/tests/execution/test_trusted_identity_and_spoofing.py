import pytest

pytestmark = [pytest.mark.security]
from unittest.mock import MagicMock
from app.api.auth import get_current_principal, is_client_from_trusted_proxy
from app.api.errors import AppError
from app.config import settings


def test_is_client_from_trusted_proxy_cidrs():
    # Valid matching IPv4
    req = MagicMock()
    req.client.host = "10.0.1.5"
    assert is_client_from_trusted_proxy(req, ["10.0.0.0/8", "127.0.0.1/32"]) is True

    # Valid loopback
    req.client.host = "127.0.0.1"
    assert is_client_from_trusted_proxy(req, ["127.0.0.1/32"]) is True

    # Untrusted external IP
    req.client.host = "203.0.113.195"
    assert is_client_from_trusted_proxy(req, ["10.0.0.0/8", "127.0.0.1/32"]) is False

    # Invalid / None request client
    assert is_client_from_trusted_proxy(None, ["10.0.0.0/8"]) is False
    req_no_client = MagicMock()
    req_no_client.client = None
    assert is_client_from_trusted_proxy(req_no_client, ["10.0.0.0/8"]) is False


def test_production_direct_header_spoofing_rejected(monkeypatch):
    """Prompt 14 Section 7-10: Untrusted client spoofing headers in production must receive 403."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    req = MagicMock()
    req.client.host = "198.51.100.42"  # Public attacker IP spoofing headers

    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=req,
            x_operator_id="admin-spoofed",
            x_operator_roles="admin",
            x_auth_source="untrusted",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_DENIED"


def test_production_trusted_proxy_enabled_accepts_valid_proxy(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    req = MagicMock()
    req.client.host = "10.0.0.1"  # Inside trusted ingress proxy CIDR

    principal = get_current_principal(
        request=req,
        x_operator_id="operator-corp-99",
        x_operator_roles="operator,approver",
        x_operator_name="Corporate Operator",
        x_auth_source="corporate_sso",
    )
    assert principal.id == "operator-corp-99"
    assert principal.display_name == "Corporate Operator"
    assert "operator" in principal.roles
    assert principal.source == "trusted_proxy"
    assert principal.authentication_strength == "trusted_proxy"


def test_production_dev_principal_rejected(monkeypatch):
    """Dev identities cannot be smuggled into production."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    req = MagicMock()
    req.client.host = "10.0.0.1"

    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=req,
            x_operator_id="dev-operator-1",
            x_auth_source="dev_provider",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_UNAVAILABLE"


def test_production_trusted_proxy_disabled_fails_closed(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", False)

    req = MagicMock()
    req.client.host = "127.0.0.1"

    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=req,
            x_operator_id="operator-1",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_UNAVAILABLE"


def test_forwarded_for_header_spoofing_does_not_bypass_trusted_cidr(monkeypatch):
    """Prompt 14.4B Section 15: Never trust client-controlled X-Forwarded-For headers."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    req = MagicMock()
    req.client.host = "203.0.113.50"  # External attacker IP
    req.headers = {"X-Forwarded-For": "10.0.0.1, 10.0.1.5"}  # Attacker spoofing internal IP

    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=req,
            x_operator_id="admin-spoofed",
            x_operator_roles="admin",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_DENIED"


def test_role_spoofing_ordinary_operator_cannot_elevate_privileges(monkeypatch):
    """Prompt 14.4B Section 18: Ordinary operator cannot elevate to admin or execution rights."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    req = MagicMock()
    req.client.host = "10.0.0.1"  # Inside trusted proxy CIDR

    # Authoritative proxy injects operator role
    principal = get_current_principal(
        request=req,
        x_operator_id="operator-standard-42",
        x_operator_roles="operator",
        x_operator_name="Standard Operator",
    )
    assert principal.roles == ["operator"]
    assert "execution.execute" not in principal.permissions
    assert "execution.lock.manage" not in principal.permissions
    assert "action.request" in principal.permissions

    # Test viewer role strictly restricted to audit.verify
    viewer_principal = get_current_principal(
        request=req,
        x_operator_id="viewer-42",
        x_operator_roles="viewer",
        x_operator_name="Auditor Viewer",
    )
    assert viewer_principal.roles == ["viewer"]
    assert "execution.execute" not in viewer_principal.permissions
    assert "execution.lock.manage" not in viewer_principal.permissions
    assert "action.approve" not in viewer_principal.permissions
    assert "action.request" not in viewer_principal.permissions
    assert "audit.verify" in viewer_principal.permissions


def test_open_world_cidrs_rejected_with_specific_code():
    """Prompt 14.4B Section 22: 0.0.0.0/0 and ::/0 must be rejected."""
    from app.api.auth import validate_trusted_proxy_cidrs

    with pytest.raises(ValueError) as exc_ipv4:
        validate_trusted_proxy_cidrs(["0.0.0.0/0"])
    assert "OPEN_WORLD_CIDR_REJECTED" in str(exc_ipv4.value)

    with pytest.raises(ValueError) as exc_ipv6:
        validate_trusted_proxy_cidrs(["::/0"])
    assert "OPEN_WORLD_CIDR_REJECTED" in str(exc_ipv6.value)


def test_production_empty_trusted_cidrs_fails_closed(monkeypatch):
    """Prompt 14.4B Section 21: Empty trusted proxy CIDRs fails closed."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", [])

    req = MagicMock()
    req.client.host = "127.0.0.1"

    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=req,
            x_operator_id="operator-1",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_UNAVAILABLE"


def test_read_only_principal_sanitization():
    """Prompt 14.4B Section 23: Principal exposes only safe metadata."""
    from app.domain.principal import OperatorPrincipal

    principal = OperatorPrincipal(
        id="op-101",
        display_name="Security Lead",
        roles=["admin"],
        permissions=["action.request", "execution.lock.manage"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )
    data = principal.model_dump()
    assert "password" not in data
    assert "secret" not in data
    assert "token" not in data
    assert data["id"] == "op-101"
    assert data["source"] == "trusted_proxy"


def test_cloudflare_access_email_rejected_from_untrusted_client(monkeypatch):
    """Negative Test: Untrusted external IP cannot assert Cf-Access-Authenticated-User-Email."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["127.0.0.1/32"])

    req = MagicMock()
    req.client.host = "198.51.100.99"

    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=req,
            cf_access_email="spoofed-operator@example.com",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_DENIED"


def test_cloudflare_access_email_accepted_from_trusted_proxy(monkeypatch):
    """Positive Test: Authoritative Cloudflare Access email forwarded via trusted proxy loopback is accepted as operator ID."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["127.0.0.1/32"])

    req = MagicMock()
    req.client.host = "127.0.0.1"

    principal = get_current_principal(
        request=req,
        cf_access_email="authorized-operator@example.com",
    )
    assert principal.id == "authorized-operator@example.com"
    assert principal.roles == ["operator"]
    assert principal.source == "trusted_proxy"
    # Crucial: operator role cannot execute tasks
    assert "execution.execute" not in principal.permissions
    assert "execution.lock.manage" not in principal.permissions


def test_cloudflare_access_auth_does_not_unlock_execution():
    """Invariance: Authentication NEVER mutates execution safety flags."""
    assert settings.execution_enabled is False
    assert settings.live_canary_enabled is False


def test_http_security_headers_present():
    """Verify production security headers (X-Robots-Tag, nosniff, DENY, Referrer-Policy)."""
    from starlette.testclient import TestClient
    from app.main import create_app

    app = create_app()
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        assert res.headers.get("x-robots-tag") == "noindex, nofollow, noarchive"
        assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert res.headers.get("x-permitted-cross-domain-policies") == "none"


