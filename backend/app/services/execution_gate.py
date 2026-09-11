from typing import Any
from app.api.errors import AppError


class ExecutionGate:
    """
    Hard safety boundary gate.
    Section 62: enabled = false unconditionally for Hermes production.
    Prompt 13 MUST NOT cross into Hermes execution.
    """

    @staticmethod
    def is_enabled() -> bool:
        return False


class DisabledActionExecutor:
    """
    Stub action executor interface.
    Section 63 & 64: The backend executor boundary itself must fail with EXECUTION_DISABLED.
    No real Hermes execution in Prompt 13.
    """

    async def execute_action(self, intent_id: str, action_type: str, payload: Any) -> None:
        raise AppError(
            status_code=403,
            code="ACTION_EXECUTION_DISABLED",
            message=(
                "Production execution is disabled in this phase. "
                "The requested action has passed safety preflight and approval gates, "
                "but execution is locked until Prompt 14 Controlled Hermes Dispatch."
            ),
            details={"intent_id": intent_id, "action_type": action_type},
        )
