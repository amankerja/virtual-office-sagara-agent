from fastapi import APIRouter, Depends
from app.api.auth import get_current_principal, get_auth_health_status
from app.domain.principal import OperatorPrincipal

router = APIRouter(prefix="/auth", tags=["Authentication & Identity (V1.1 Proposed)"])


@router.get("/me", response_model=OperatorPrincipal)
async def get_my_principal(principal: OperatorPrincipal = Depends(get_current_principal)):
    """
    Retrieve currently authenticated server-derived OperatorPrincipal.
    Prompt 14.4 Section 17-18: Derived strictly server-side from trusted auth boundary.
    """
    return principal


@router.get("/health")
async def get_authentication_health():
    """
    Diagnostic status of trusted authentication boundary.
    Prompt 14.4 Section 37: AUTH_CONFIGURED, AUTH_UNAVAILABLE, or AUTH_MISCONFIGURED.
    """
    return get_auth_health_status()
