"""
AdapterErrorContract - Prompt 15.0 Section 32

Frozen stable adapter error codes for Mission Control.
Internal Python exceptions remain private.
Frontend and caller code should ONLY depend on these error codes.
"""

from typing import Final


class AdapterErrorCode:
    """Frozen adapter-boundary error codes (Prompt 15.0 Section 32)."""

    # Profile errors
    PROFILE_NOT_FOUND: Final[str] = "PROFILE_NOT_FOUND"
    PROFILE_NOT_TARGETABLE: Final[str] = "PROFILE_NOT_TARGETABLE"

    # Skill registry errors
    SKILL_REGISTRY_INVALID: Final[str] = "SKILL_REGISTRY_INVALID"

    # Hermes execution errors
    HERMES_UNAVAILABLE: Final[str] = "HERMES_UNAVAILABLE"
    HERMES_TIMEOUT: Final[str] = "HERMES_TIMEOUT"
    HERMES_EXECUTION_FAILED: Final[str] = "HERMES_EXECUTION_FAILED"
    HERMES_SESSION_RECEIPT_MISSING: Final[str] = "HERMES_SESSION_RECEIPT_MISSING"

    # Routing errors
    ROUTING_DRIFT: Final[str] = "ROUTING_DRIFT"

    # Audit errors
    AUDIT_UNAVAILABLE: Final[str] = "AUDIT_UNAVAILABLE"

    # All known codes (for validation)
    ALL_CODES: Final[frozenset[str]] = frozenset([
        "PROFILE_NOT_FOUND",
        "PROFILE_NOT_TARGETABLE",
        "SKILL_REGISTRY_INVALID",
        "HERMES_UNAVAILABLE",
        "HERMES_TIMEOUT",
        "HERMES_EXECUTION_FAILED",
        "HERMES_SESSION_RECEIPT_MISSING",
        "ROUTING_DRIFT",
        "AUDIT_UNAVAILABLE",
    ])

    @classmethod
    def is_known(cls, code: str) -> bool:
        return code in cls.ALL_CODES