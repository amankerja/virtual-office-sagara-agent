import ipaddress
from typing import Optional
from fastapi import Header, Request
from app.api.errors import AppError
from app.config import settings
from app.domain.principal import OperatorPrincipal


def is_client_from_trusted_proxy(request: Request, trusted_cidrs: list[str]) -> bool:
    """Validate whether request.client.host is within configured trusted ingress CIDRs."""
    if not request or not getattr(request, "client", None) or not request.client.host:
        return False
    client_host = request.client.host
    try:
        client_ip = ipaddress.ip_address(client_host)
        for cidr in trusted_cidrs:
            if not cidr or not cidr.strip():
                continue
            network = ipaddress.ip_network(cidr.strip(), strict=False)
            if client_ip in network:
                return True
    except ValueError:
        return False
    return False


def get_current_principal(
    request: Request,
    x_operator_id: Optional[str] = Header(None, alias="X-Operator-ID"),
    x_operator_roles: Optional[str] = Header(None, alias="X-Operator-Roles"),
    x_operator_name: Optional[str] = Header(None, alias="X-Operator-Name"),
    x_auth_source: Optional[str] = Header(None, alias="X-Auth-Source"),
) -> OperatorPrincipal:
    """
    Derive authenticated operator principal with strict fail-closed production semantics.
    Prompt 14 Section 7-13:
    - Direct client header spoofing outside trusted proxy receives 403.
    - Production requires trusted proxy boundary (TrustedProxyPrincipalProvider).
    - In dev mode, dev identities are permitted only for environment=development.
    """
    is_dev = settings.environment.lower() == "development"

    # Normalize parameters when called without FastAPI dependency injection
    if not isinstance(x_operator_id, str):
        x_operator_id = None
    if not isinstance(x_operator_roles, str):
        x_operator_roles = None
    if not isinstance(x_operator_name, str):
        x_operator_name = None
    if not isinstance(x_auth_source, str):
        x_auth_source = None

    # In production, enforce trusted auth proxy boundary
    if not is_dev:
        if x_auth_source == "dev_provider" or (x_operator_id and x_operator_id.startswith("dev-")):
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_UNAVAILABLE",
                message="Development principal provider cannot be used in production environment.",
            )

        # Check if trusted auth proxy is enabled
        if not settings.trusted_auth_proxy_enabled:
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_UNAVAILABLE",
                message="Trusted auth proxy is not enabled in production environment.",
            )

        # Validate that the client IP is within trusted CIDRs (Prompt 14 Section 8-10)
        is_trusted = is_client_from_trusted_proxy(request, settings.trusted_proxy_cidrs)
        if not is_trusted:
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_DENIED",
                message="Untrusted client origin: operator identity headers rejected outside trusted ingress proxy.",
            )

        # If real auth identity is not supplied via trusted proxy:
        if not x_operator_id:
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_UNAVAILABLE",
                message="No authenticated operator identity provided by trusted ingress proxy.",
            )

        roles = [r.strip() for r in (x_operator_roles or "operator").split(",") if r.strip()]
        return OperatorPrincipal(
            id=x_operator_id,
            display_name=x_operator_name or x_operator_id,
            roles=roles,
            permissions=["action:request", "action:approve", "action:execute"],
            authentication_strength="trusted_proxy",
            source="trusted_proxy",
        )

    # In development mode:
    if x_operator_id:
        roles = [r.strip() for r in (x_operator_roles or "operator,approver,admin").split(",") if r.strip()]
        return OperatorPrincipal(
            id=x_operator_id,
            display_name=x_operator_name or x_operator_id,
            roles=roles,
            permissions=["action:request", "action:approve", "action:cancel", "action:execute"],
            authentication_strength="development",
            source=x_auth_source or "dev_provider",
        )

    # Default development operator principal
    return OperatorPrincipal(
        id="dev-operator-1",
        display_name="Dev Operator (Lead)",
        roles=["operator", "approver", "admin"],
        permissions=["action:request", "action:approve", "action:cancel", "action:execute"],
        authentication_strength="development",
        source="dev_provider",
    )
