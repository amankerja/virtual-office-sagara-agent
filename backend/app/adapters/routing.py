"""
RoutingAdapter - Prompt 15.0 Section 18-21

Single normalized routing authority for Mission Control.
Frontend receives ONE normalized RoutingProjection.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

logger = logging.getLogger("sagara.mission_control.adapters.routing")

CANONICAL_SAGARA_PROFILES = frozenset([
    "lead", "personal", "business", "marketing",
    "cs", "it-support", "it-coding", "sagara-lab",
])

HERMES_RUNTIME_ONLY_PROFILES = frozenset(["default", "career"])


@dataclass(frozen=True)
class RouteProjection:
    platform: str
    context: str
    effective_profile_id: str
    mention_required: bool
    enabled: bool
    source: str
    drift_status: str
    is_canonical_sagara_profile: bool
    configured: bool = True
    authorized: bool = True
    effective_dispatch: str = "ENABLED"
    reason: Optional[str] = None
    policy_note: Optional[str] = None


@dataclass
class RoutingProjection:
    routes: list = field(default_factory=list)
    total_routes: int = 0
    aligned_routes: int = 0
    drifted_routes: int = 0
    unresolved_routes: int = 0
    policy_decisions_required: list = field(default_factory=list)
    source_authority: str = "RoutingAdapter"
    schema_version: str = "v1"


_INTENDED_ROUTING_MATRIX: list[dict[str, Any]] = [
    {"context": "ops-general",       "profile_id": "lead",       "platform": "discord",  "mention_required": True,  "enabled": True,  "policy_note": None},
    {"context": "ops-personal",      "profile_id": "personal",   "platform": "discord",  "mention_required": True,  "enabled": True,  "policy_note": None},
    {"context": "ops-business",      "profile_id": "business",   "platform": "discord",  "mention_required": True,  "enabled": True,  "policy_note": None},
    {"context": "ops-marketing",     "profile_id": "marketing",  "platform": "discord",  "mention_required": True,  "enabled": True,  "policy_note": None},
    {"context": "ops-cs",            "profile_id": "cs",         "platform": "discord",  "mention_required": True,  "enabled": True,  "policy_note": None},
    {"context": "ops-it-coding",     "profile_id": "it-coding",  "platform": "discord",  "mention_required": True,  "enabled": True,  "policy_note": None},
    {"context": "ops-lab",           "profile_id": "sagara-lab", "platform": "discord",  "mention_required": True,  "enabled": True,  "policy_note": None},
    {"context": "ops-it-support",    "profile_id": "it-support", "platform": "discord",  "mention_required": True,  "enabled": True,
     "policy_note": "Option B: route retained; authorized=false; dispatch blocked by policy/allowlist."},
    {"context": "command-home",      "profile_id": "lead",       "platform": "discord",  "mention_required": False, "enabled": True,  "policy_note": None},
    {"context": "status",            "profile_id": "lead",       "platform": "discord",  "mention_required": False, "enabled": True,  "policy_note": "DRIFT_CHECK: verify runtime channel ID vs config."},
    {"context": "alerts",            "profile_id": "lead",       "platform": "discord",  "mention_required": False, "enabled": True,  "policy_note": "DRIFT_CHECK: verify runtime channel ID vs config."},
    {"context": "content",           "profile_id": "marketing",  "platform": "discord",  "mention_required": False, "enabled": True,  "policy_note": "DRIFT_CHECK: verify content route channel assignment."},
    {"context": "posting",           "profile_id": "marketing",  "platform": "discord",  "mention_required": False, "enabled": True,  "policy_note": "DRIFT_CHECK: verify posting route channel assignment."},
    {"context": "system",            "profile_id": "lead",       "platform": "discord",  "mention_required": False, "enabled": True,  "policy_note": "DRIFT_CHECK: verify system channel mapping."},
    {"context": "telegram-personal", "profile_id": "personal",   "platform": "telegram", "mention_required": False, "enabled": True,  "policy_note": None},
    {"context": "telegram-business", "profile_id": "business",   "platform": "telegram", "mention_required": False, "enabled": True,  "policy_note": None},
    {"context": "telegram-lead",     "profile_id": "lead",       "platform": "telegram", "mention_required": False, "enabled": True,  "policy_note": None},
    {"context": "whatsapp-cs",       "profile_id": "cs",         "platform": "whatsapp", "mention_required": False, "enabled": True,  "policy_note": None},
    {"context": "whatsapp-business", "profile_id": "business",   "platform": "whatsapp", "mention_required": False, "enabled": True,  "policy_note": None},
]

_KNOWN_DRIFT_CONTEXTS = {"command-home", "status", "alerts", "system", "content", "posting"}
_POLICY_DECISION_CONTEXTS = {"ops-it-support"}


class RoutingAdapter:
    """
    Single normalized routing authority for Mission Control (Prompt 15.0 Sections 18-21 & Finalization Section 7).
    Frontend receives ONE RoutingProjection; never consults raw config files directly.
    """

    def get_routing_projection(self) -> RoutingProjection:
        routes = []
        policy_decisions = []
        aligned = drifted = unresolved = 0

        for entry in _INTENDED_ROUTING_MATRIX:
            ctx = entry["context"]
            profile_id = entry["profile_id"]
            is_canonical = profile_id in CANONICAL_SAGARA_PROFILES

            if ctx in _POLICY_DECISION_CONTEXTS:
                drift_status = "POLICY_DECISION_REQUIRED"
                policy_decisions.append(ctx)
                unresolved += 1
                configured = True
                authorized = False
                effective_dispatch = "BLOCKED"
                reason = "Option B: route retained; authorized=false; dispatch blocked by policy/allowlist while it-support remains DISABLED."
            elif ctx in _KNOWN_DRIFT_CONTEXTS:
                drift_status = "DRIFT"
                drifted += 1
                configured = True
                authorized = True
                effective_dispatch = "ENABLED"
                reason = "Configured channel under drift observation."
            else:
                drift_status = "ALIGNED"
                aligned += 1
                configured = True
                authorized = True
                effective_dispatch = "ENABLED"
                reason = "Aligned and authorized dispatch channel."

            routes.append(RouteProjection(
                platform=entry["platform"],
                context=ctx,
                effective_profile_id=profile_id,
                mention_required=entry["mention_required"],
                enabled=entry["enabled"],
                source="channels_yaml",
                drift_status=drift_status,
                is_canonical_sagara_profile=is_canonical,
                configured=configured,
                authorized=authorized,
                effective_dispatch=effective_dispatch,
                reason=reason,
                policy_note=entry.get("policy_note"),
            ))

        return RoutingProjection(
            routes=routes,
            total_routes=len(routes),
            aligned_routes=aligned,
            drifted_routes=drifted,
            unresolved_routes=unresolved,
            policy_decisions_required=policy_decisions,
        )

    def get_route_for_context(self, context: str) -> Optional[RouteProjection]:
        projection = self.get_routing_projection()
        for route in projection.routes:
            if route.context == context:
                return route
        return None

    def get_ops_it_support_resolution(self) -> dict[str, Any]:
        """Return the explicit resolution status for ops-it-support (Prompt 15.0 Section 7 Option B)."""
        return {
            "context": "ops-it-support",
            "profile": "it-support",
            "configured": True,
            "authorized": False,
            "effective_dispatch": "BLOCKED",
            "reason": (
                "Option B selected: route retained; authorized=false; "
                "dispatch blocked by policy/allowlist while it-support remains DISABLED "
                "for Mission Control production."
            ),
            "current_status": "POLICY_DECISION_REQUIRED",
            "resolution_status": "RESOLVED_OPTION_B",
            "runtime_active": True,
            "mission_control_authorized": False,
            "selected_option": "B",
            "resolution_options": [
                {
                    "option": "A",
                    "action": "remove_route",
                    "description": "Remove route from Discord matrix.",
                },
                {
                    "option": "B",
                    "action": "retain_route_blocked_dispatch",
                    "description": "Retain route, set authorized=false, block dispatch by policy.",
                    "status": "SELECTED",
                },
            ],
        }

    def classify_profile(self, profile_id: str) -> dict[str, Any]:
        """
        Classify a profile as canonical Sagara agent vs. Hermes-runtime-only.
        Prevents career/default from being surfaced as canonical Sagara agents.
        """
        if profile_id in CANONICAL_SAGARA_PROFILES:
            return {
                "profile_id": profile_id,
                "classification": "canonical_sagara_agent",
                "hermes_targetable": True,
                "mission_control_visible": True,
            }
        elif profile_id in HERMES_RUNTIME_ONLY_PROFILES:
            return {
                "profile_id": profile_id,
                "classification": "hermes_runtime_only",
                "hermes_targetable": True,
                "mission_control_visible": False,
                "note": f"'{profile_id}' is Hermes-internal and must NOT become a canonical Sagara Agent without explicit milestone.",
            }
        else:
            return {
                "profile_id": profile_id,
                "classification": "unknown",
                "hermes_targetable": False,
                "mission_control_visible": False,
            }