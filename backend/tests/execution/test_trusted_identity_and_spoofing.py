import pytest
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
