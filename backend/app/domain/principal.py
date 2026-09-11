from typing import Optional
from pydantic import BaseModel, ConfigDict


class OperatorPrincipal(BaseModel):
    """Authenticated operator principal."""
    model_config = ConfigDict(extra="ignore")

    id: str
    display_name: Optional[str] = None
    roles: list[str] = ["viewer"]
    permissions: list[str] = []
    authentication_strength: str = "token"
    source: str = "header"

    def has_role(self, role: str) -> bool:
        return role in self.roles or "admin" in self.roles

    def has_permission(self, permission: str) -> bool:
        return permission in self.permissions or "admin" in self.roles
