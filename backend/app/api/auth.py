import ipaddress
from typing import Optional, List
from fastapi import Header, Request
from app.api.errors import AppError
from app.config import settings
from app.domain.principal import OperatorPrincipal, DEFAULT_ROLE_PERMISSIONS


def validate_trusted_proxy_cidrs(trusted_cidrs: list[str]) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    """
    Validate and parse trusted proxy CIDRs (Prompt 14.4 Section 31-32).
    - Parse successfully or raise ValueError with exact reason
    - Strictly reject open-world wildcards (0.0.0.0/0, ::/0) with OPEN_WORLD_CIDR_REJECTED
    - Reject malformed CIDRs with INVALID_CIDR_FORMAT
    - Support IPv4 and IPv6
    """
    networks = []
    for cidr in trusted_cidrs:
        if not cidr or not cidr.strip():
            continue
        cleaned = cidr.strip()
        try:
            network = ipaddress.ip_network(cleaned, strict=False)
            if network.prefixlen == 0:
                raise ValueError(f"Open-world wildcard CIDR '{cleaned}' is strictly prohibited (OPEN_WORLD_CIDR_REJECTED).")
            networks.append(network)
        except ValueError as err:
            if "OPEN_WORLD_CIDR_REJECTED" in str(err):
                raise
            raise ValueError(f"Malformed CIDR format '{cleaned}': {err} (INVALID_CIDR_FORMAT)")
    return networks


def is_client_from_trusted_proxy(request: Request, trusted_cidrs: list[str]) -> bool:
    """
    Validate whether request.client.host is within configured trusted ingress CIDRs.
    Never trusts client-controlled X-Forwarded-For headers (Prompt 14.4 Section 14-15).
    """
    if not request or not getattr(request, "client", None) or not request.client.host:
        return False
    if not trusted_cidrs:
        return False
    client_host = request.client.host
    try:
        client_ip = ipaddress.ip_address(client_host)
        valid_networks = validate_trusted_proxy_cidrs(trusted_cidrs)
        for network in valid_networks:
            if client_ip in network:
                return True
    except ValueError:
        return False
    return False


def get_auth_health_status() -> dict:
    """Diagnostic health status for authentication subsystem (Prompt 14.4 Section 37)."""
    is_dev = settings.environment.lower() == "development"
    if is_dev:
        return {
            "status": "AUTH_CONFIGURED",
            "environment": settings.environment,
            "auth_mode": "development",
            "trusted_proxy_enabled": settings.trusted_auth_proxy_enabled,
            "trusted_proxy_cidrs_count": len(settings.trusted_proxy_cidrs),
            "reason": "Development authentication active.",
        }

    if not settings.trusted_auth_proxy_enabled:
        return {
            "status": "AUTH_UNAVAILABLE",
            "environment": settings.environment,
            "auth_mode": "unconfigured",
            "trusted_proxy_enabled": False,
            "trusted_proxy_cidrs_count": len(settings.trusted_proxy_cidrs),
            "reason": "Trusted auth proxy is not enabled in production environment.",
        }

    if not settings.trusted_proxy_cidrs:
        return {
            "status": "AUTH_UNAVAILABLE",
            "environment": settings.environment,
            "auth_mode": "trusted_proxy",
            "trusted_proxy_enabled": True,
            "trusted_proxy_cidrs_count": 0,
            "reason": "No trusted proxy CIDRs configured in production environment.",
        }

    try:
        validate_trusted_proxy_cidrs(settings.trusted_proxy_cidrs)
        return {
            "status": "AUTH_CONFIGURED",
            "environment": settings.environment,
            "auth_mode": "trusted_proxy",
            "trusted_proxy_enabled": True,
            "trusted_proxy_cidrs_count": len(settings.trusted_proxy_cidrs),
            "reason": "Trusted proxy authentication configured and active.",
        }
    except ValueError as err:
        return {
            "status": "AUTH_MISCONFIGURED",
            "environment": settings.environment,
            "auth_mode": "trusted_proxy",
            "trusted_proxy_enabled": True,
            "trusted_proxy_cidrs_count": len(settings.trusted_proxy_cidrs),
            "reason": str(err),
        }


def get_current_principal(
    request: Request,
    x_operator_id: Optional[str] = Header(None, alias="X-Operator-ID"),
    x_operator_roles: Optional[str] = Header(None, alias="X-Operator-Roles"),
    x_operator_role: Optional[str] = Header(None, alias="X-Operator-Role"),
    x_operator_name: Optional[str] = Header(None, alias="X-Operator-Name"),
    x_auth_source: Optional[str] = Header(None, alias="X-Auth-Source"),
    cf_access_email: Optional[str] = Header(None, alias="Cf-Access-Authenticated-User-Email"),
) -> OperatorPrincipal:
    """
    Derive authenticated operator principal with strict fail-closed production semantics.
    Prompt 14.4 Section 10-22:
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
    if not isinstance(x_operator_role, str):
        x_operator_role = None
    if not isinstance(x_operator_name, str):
        x_operator_name = None
    if not isinstance(x_auth_source, str):
        x_auth_source = None
    if not isinstance(cf_access_email, str):
        cf_access_email = None

    effective_roles_header = x_operator_roles or x_operator_role
    effective_operator_id = x_operator_id or cf_access_email

    # In production, enforce trusted auth proxy boundary
    if not is_dev:
        if x_auth_source == "dev_provider" or (effective_operator_id and effective_operator_id.startswith("dev-")):
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

        # Check CIDR configuration presence and health
        if not settings.trusted_proxy_cidrs:
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_UNAVAILABLE",
                message="No trusted proxy CIDRs configured in production environment.",
            )

        try:
            validate_trusted_proxy_cidrs(settings.trusted_proxy_cidrs)
        except ValueError as cidr_err:
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_UNAVAILABLE",
                message=f"Trusted proxy configuration error: {cidr_err}",
            )

        # Validate that the client IP is within trusted CIDRs (Prompt 14.4 Section 14-16)
        is_trusted = is_client_from_trusted_proxy(request, settings.trusted_proxy_cidrs)
        if not is_trusted:
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_DENIED",
                message="Untrusted client origin: operator identity headers rejected outside trusted ingress proxy.",
            )

        # If real auth identity is not supplied via trusted proxy:
        if not effective_operator_id:
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_UNAVAILABLE",
                message="No authenticated operator identity provided by trusted ingress proxy.",
            )

        roles = [r.strip() for r in (effective_roles_header or "operator").split(",") if r.strip()]
        perms: set[str] = set()
        for r in roles:
            if r in DEFAULT_ROLE_PERMISSIONS:
                perms.update(DEFAULT_ROLE_PERMISSIONS[r])
        if not perms:
            perms.update(DEFAULT_ROLE_PERMISSIONS.get("viewer", []))

        return OperatorPrincipal(
            id=effective_operator_id,
            display_name=x_operator_name or effective_operator_id,
            roles=roles,
            permissions=sorted(list(perms)),
            authentication_strength="trusted_proxy",
            source="trusted_proxy",
        )

    # In development mode:
    if effective_operator_id:
        roles = [r.strip() for r in (effective_roles_header or "operator,approver,admin").split(",") if r.strip()]
        perms = set()
        for r in roles:
            if r in DEFAULT_ROLE_PERMISSIONS:
                perms.update(DEFAULT_ROLE_PERMISSIONS[r])
        return OperatorPrincipal(
            id=effective_operator_id,
            display_name=x_operator_name or effective_operator_id,
            roles=roles,
            permissions=sorted(list(perms)) or ["action.request", "action.approve", "execution.execute"],
            authentication_strength="development",
            source=x_auth_source or "dev_provider",
        )

    # Default development operator principal
    admin_perms = sorted(DEFAULT_ROLE_PERMISSIONS.get("admin", []))
    return OperatorPrincipal(
        id="dev-operator-1",
        display_name="Dev Operator (Lead)",
        roles=["operator", "approver", "admin"],
        permissions=admin_perms,
        authentication_strength="development",
        source="dev_provider",
    )
