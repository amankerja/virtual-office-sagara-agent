from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict


# Canonical Permission Constants (Prompt 14.4 Section 23)
PERMISSION_ACTION_REQUEST = "action.request"
PERMISSION_ACTION_APPROVE = "action.approve"
PERMISSION_EXECUTION_PREPARE = "execution.prepare"
PERMISSION_EXECUTION_EXECUTE = "execution.execute"
PERMISSION_EXECUTION_LOCK_MANAGE = "execution.lock.manage"
PERMISSION_AUDIT_VERIFY = "audit.verify"

# Canonical Role-to-Permissions Mapping (Prompt 14.4 Section 23-26)
DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "admin": [
        PERMISSION_ACTION_REQUEST,
        PERMISSION_ACTION_APPROVE,
        PERMISSION_EXECUTION_PREPARE,
        PERMISSION_EXECUTION_EXECUTE,
        PERMISSION_EXECUTION_LOCK_MANAGE,
        PERMISSION_AUDIT_VERIFY,
        "action:request",
        "action:approve",
        "action:execute",
        "action:cancel",
    ],
    "executor": [
        PERMISSION_EXECUTION_PREPARE,
        PERMISSION_EXECUTION_EXECUTE,
        PERMISSION_AUDIT_VERIFY,
        "action:execute",
    ],
    "operator": [
        PERMISSION_ACTION_REQUEST,
        PERMISSION_ACTION_APPROVE,
        PERMISSION_EXECUTION_PREPARE,
        PERMISSION_AUDIT_VERIFY,
        "action:request",
        "action:approve",
    ],
    "approver": [
        PERMISSION_ACTION_APPROVE,
        PERMISSION_AUDIT_VERIFY,
        "action:approve",
    ],
    "viewer": [
        PERMISSION_AUDIT_VERIFY,
    ],
}


class OperatorPrincipal(BaseModel):
    """Authenticated operator principal with granular permissions."""
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
        """
        Check whether principal possesses permission.
        Supports both canonical dot notation (action.approve) and colon notation (action:approve).
        Admin role grants standard administrative permissions.
        """
        if permission in self.permissions:
            return True
        alt_perm = permission.replace(".", ":") if "." in permission else permission.replace(":", ".")
        if alt_perm in self.permissions:
            return True
        if "admin" in self.roles:
            return True
        for r in self.roles:
            role_perms = DEFAULT_ROLE_PERMISSIONS.get(r, [])
            if permission in role_perms or alt_perm in role_perms:
                return True
        return False


