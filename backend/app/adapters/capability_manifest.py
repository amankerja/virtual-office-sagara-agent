"""
CapabilityManifestAdapter - Prompt 15.0 Section 31

Normalized machine-readable profile capability projection.
Helps Mission Control avoid hardcoded profile capability assumptions.

This is NOT raw skill internals. Frontend sees normalized capability flags only.
"""

from typing import Any
from dataclasses import dataclass, field


CANONICAL_SAGARA_PROFILES = [
    "lead", "personal", "business", "marketing",
    "cs", "it-support", "it-coding", "sagara-lab",
]

# Capability flags per profile (based on Sagara VPS production baseline)
# These are advisory projections derived from the canonical skill registry.
# Do NOT hardcode Mission Control execution policy based solely on these flags;
# always consult the authoritative ProfileRegistry and SkillRegistry.
_PROFILE_CAPABILITY_MATRIX: dict[str, dict[str, Any]] = {
    "lead": {
        "network_sensitive": True,
        "mutation_sensitive": True,
        "external_communication_sensitive": True,
        "runtime_targetable": True,
        "skill_ids": [
            "lead-management", "crm-integration", "pipeline-review",
            "deal-status-tracker", "follow-up-scheduler",
        ],
    },
    "personal": {
        "network_sensitive": False,
        "mutation_sensitive": False,
        "external_communication_sensitive": True,
        "runtime_targetable": True,
        "skill_ids": [
            "personal-assistant", "calendar-management", "reminder-service",
        ],
    },
    "business": {
        "network_sensitive": True,
        "mutation_sensitive": True,
        "external_communication_sensitive": True,
        "runtime_targetable": True,
        "skill_ids": [
            "business-intelligence", "financial-reporting", "ops-monitor",
        ],
    },
    "marketing": {
        "network_sensitive": True,
        "mutation_sensitive": False,
        "external_communication_sensitive": True,
        "runtime_targetable": True,
        "skill_ids": [
            "content-generation", "social-media-scheduler", "campaign-tracker",
        ],
    },
    "cs": {
        "network_sensitive": False,
        "mutation_sensitive": False,
        "external_communication_sensitive": True,
        "runtime_targetable": True,
        "skill_ids": [
            "customer-support", "ticket-triage", "response-drafter",
        ],
    },
    "it-support": {
        "network_sensitive": True,
        "mutation_sensitive": True,
        "external_communication_sensitive": False,
        "runtime_targetable": True,
        "skill_ids": [
            "system-diagnostics", "service-health-check", "log-analysis",
        ],
        "mission_control_execution_status": "DISABLED",
        "mission_control_note": (
            "it-support is DISABLED for Mission Control production execution "
            "per Prompt 15.0 Section 46. Activation requires a separate milestone."
        ),
    },
    "it-coding": {
        "network_sensitive": True,
        "mutation_sensitive": True,
        "external_communication_sensitive": False,
        "runtime_targetable": True,
        "skill_ids": [
            "code-review", "code-generation", "refactor-assist",
            "security-audit", "test-generation",
        ],
    },
    "sagara-lab": {
        "network_sensitive": False,
        "mutation_sensitive": False,
        "external_communication_sensitive": False,
        "runtime_targetable": True,
        "skill_ids": [
            "research-only", "reasoning-sandbox", "draft-generation",
        ],
        "mission_control_note": (
            "sagara-lab is the preferred acceptance profile for "
            "reasoning-only, no-external-communication tasks."
        ),
    },
}


@dataclass(frozen=True)
class ProfileCapabilityProjection:
    """Normalized capability projection for a single profile."""
    profile_id: str
    skill_ids: list[str] = field(default_factory=list)
    network_sensitive: bool = False
    mutation_sensitive: bool = False
    external_communication_sensitive: bool = False
    runtime_targetable: bool = True
    mission_control_execution_status: str = "ENABLED"
    mission_control_note: str = ""
    is_canonical: bool = True


class CapabilityManifestAdapter:
    """
    Produces normalized profile capability projections (Prompt 15.0 Section 31).

    Mission Control uses this to determine what a profile is capable of
    WITHOUT hardcoding assumptions in the frontend.

    The adapter surface is stable; internal capability data may be updated
    as the registry evolves without frontend API changes.
    """

    def get_profile_capability(self, profile_id: str) -> ProfileCapabilityProjection:
        data = _PROFILE_CAPABILITY_MATRIX.get(profile_id, {})
        return ProfileCapabilityProjection(
            profile_id=profile_id,
            skill_ids=data.get("skill_ids", []),
            network_sensitive=data.get("network_sensitive", False),
            mutation_sensitive=data.get("mutation_sensitive", False),
            external_communication_sensitive=data.get("external_communication_sensitive", False),
            runtime_targetable=data.get("runtime_targetable", profile_id in CANONICAL_SAGARA_PROFILES),
            mission_control_execution_status=data.get("mission_control_execution_status", "ENABLED"),
            mission_control_note=data.get("mission_control_note", ""),
            is_canonical=profile_id in CANONICAL_SAGARA_PROFILES,
        )

    def get_all_capability_projections(self) -> list[ProfileCapabilityProjection]:
        return [self.get_profile_capability(pid) for pid in CANONICAL_SAGARA_PROFILES]

    def get_safe_acceptance_profiles(self) -> list[str]:
        """
        Returns profiles safe for reasoning-only acceptance testing
        (no external comms, no mutation, not network-sensitive).
        """
        safe = []
        for pid in CANONICAL_SAGARA_PROFILES:
            cap = self.get_profile_capability(pid)
            if (
                not cap.network_sensitive
                and not cap.mutation_sensitive
                and not cap.external_communication_sensitive
                and cap.mission_control_execution_status != "DISABLED"
                and cap.runtime_targetable
            ):
                safe.append(pid)
        return safe