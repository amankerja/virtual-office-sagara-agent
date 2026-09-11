import pytest
from app.api.auth import get_current_principal
from app.api.errors import AppError
from app.config import settings
from app.domain.principal import OperatorPrincipal
from app.services.authorization_service import AuthorizationService


class DummyRequest:
    def __init__(self, headers=None):
        self.headers = headers or {}


def test_dev_principal_default_in_development():
    req = DummyRequest()
    orig_env = settings.environment
    try:
        settings.environment = "development"
        p = get_current_principal(req)
        assert p.id == "dev-operator-1"
        assert "operator" in p.roles
        assert "approver" in p.roles
    finally:
        settings.environment = orig_env


def test_production_fails_closed_without_auth():
    """Section 19: If production does not have an approved provider, fails closed (403)."""
    req = DummyRequest()
    orig_env = settings.environment
    try:
        settings.environment = "production"
        with pytest.raises(AppError) as exc:
            get_current_principal(req)
        assert exc.value.status_code == 403
        assert exc.value.code == "AUTHORIZATION_UNAVAILABLE"
    finally:
        settings.environment = orig_env


def test_dev_principal_rejected_in_production():
    """Section 18 & 119: Dev principal provider cannot escape into production."""
    req = DummyRequest()
    orig_env = settings.environment
    try:
        settings.environment = "production"
        with pytest.raises(AppError) as exc:
            get_current_principal(req, x_operator_id="dev-user", x_auth_source="dev_provider")
        assert exc.value.status_code == 403
        assert exc.value.code == "AUTHORIZATION_UNAVAILABLE"
    finally:
        settings.environment = orig_env


def test_authorization_service_request_checks():
    auth = AuthorizationService()
    viewer = OperatorPrincipal(id="viewer-1", roles=["viewer"])
    operator = OperatorPrincipal(id="op-1", roles=["operator"])

    with pytest.raises(AppError) as exc:
        auth.authorize_action_request(viewer, "TASK_DISPATCH", "task-1")
    assert exc.value.code == "AUTHORIZATION_DENIED"

    # Operator is allowed
    auth.authorize_action_request(operator, "TASK_DISPATCH", "task-1")


def test_self_approval_forbidden_for_high_and_critical():
    """Section 42 & 119: Requester cannot self-approve HIGH or CRITICAL intent."""
    auth = AuthorizationService()
    approver = OperatorPrincipal(id="user-lead", roles=["approver", "admin"])

    # Attempt to self-approve a HIGH risk action
    with pytest.raises(AppError) as exc:
        auth.authorize_action_approval(
            principal=approver,
            intent_requested_by="user-lead",
            risk="HIGH",
            action_type="TASK_DISPATCH",
        )
    assert exc.value.code == "APPROVAL_SELF_APPROVAL_FORBIDDEN"

    # Attempt to self-approve a CRITICAL risk action
    with pytest.raises(AppError) as exc_crit:
        auth.authorize_action_approval(
            principal=approver,
            intent_requested_by="user-lead",
            risk="CRITICAL",
            action_type="SYSTEM_MUTATION",
        )
    assert exc_crit.value.code == "APPROVAL_SELF_APPROVAL_FORBIDDEN"

    # Approving someone else's HIGH action succeeds
    auth.authorize_action_approval(
        principal=approver,
        intent_requested_by="other-operator",
        risk="HIGH",
        action_type="TASK_DISPATCH",
    )
