"""RuntimeEvidenceService: Standardizes raw runtime reads into strongly typed RuntimeEvidence units.

Strictly adheres to:
- Prompt 11: Architecture & Internal Concept Runtime Evidence
- Isolated from presentation and API route handlers
- Timezone-aware UTC timestamps
"""

from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from app.domain.runtime_state import (
    DEFAULT_STALENESS_CONFIG,
    EvidenceType,
    RuntimeEvidence,
    RuntimeStalenessConfig,
    parse_iso_or_epoch,
)
from app.schemas.approvals import ApprovalDto
from app.schemas.delegations import DelegationDto
from app.schemas.runtime import GatewayDto
from app.schemas.sessions import SessionDto
from app.schemas.tasks import TaskDto


class RuntimeEvidenceService:
    """Collects and standardizes runtime telemetry into canonical RuntimeEvidence records."""

    def __init__(self, config: RuntimeStalenessConfig = DEFAULT_STALENESS_CONFIG) -> None:
        self._config = config

    def collect_gateway_evidence(
        self,
        gateway: GatewayDto,
        now: datetime,
    ) -> list[RuntimeEvidence]:
        observed_at = parse_iso_or_epoch(gateway.last_heartbeat_at)
        confidence = (
            "CONFIRMED"
            if (gateway.connected and gateway.status == "HEALTHY")
            else ("INFERRED" if gateway.connected else "STALE")
        )
        return [
            RuntimeEvidence(
                evidence_type=EvidenceType.GATEWAY_HEARTBEAT,
                entity_id=gateway.backend_id,
                observed_at=observed_at,
                confidence=confidence,
                source="gateway_heartbeats",
                attributes={
                    "status": gateway.status,
                    "connected": gateway.connected,
                    "host": gateway.host,
                    "pid": gateway.pid,
                    "heartbeat_age_seconds": gateway.heartbeat_age_seconds,
                },
            )
        ]

    def collect_session_evidence(
        self,
        sessions: list[SessionDto],
        active_leases: set[str],
        now: datetime,
    ) -> list[RuntimeEvidence]:
        evidence_list: list[RuntimeEvidence] = []
        for s in sessions:
            observed_at = parse_iso_or_epoch(s.last_activity_at or s.started_at)
            if s.id in active_leases:
                ev_type = EvidenceType.SESSION_ACTIVE_LEASE
                confidence = "CONFIRMED"
            elif s.state == "FAILED":
                ev_type = EvidenceType.SESSION_FAILED
                confidence = "CONFIRMED"
            elif s.state == "RECENT":
                ev_type = EvidenceType.SESSION_RECENT
                confidence = "INFERRED"
            elif s.state == "COMPLETED":
                ev_type = EvidenceType.SESSION_COMPLETED
                confidence = "CONFIRMED"
            else:
                ev_type = EvidenceType.SESSION_EXISTS
                confidence = "INFERRED"

            evidence_list.append(
                RuntimeEvidence(
                    evidence_type=ev_type,
                    entity_id=s.id,
                    observed_at=observed_at,
                    confidence=confidence,
                    source="sessions",
                    attributes={
                        "profile_id": s.profile_id or s.agent_id,
                        "model": s.model,
                        "parent_session_id": s.parent_session_id,
                        "state": s.state,
                        "message_count": s.message_count,
                        "tool_call_count": s.tool_call_count,
                    },
                )
            )
        return evidence_list

    def collect_delegation_evidence(
        self,
        delegations: list[DelegationDto],
        now: datetime,
    ) -> list[RuntimeEvidence]:
        evidence_list: list[RuntimeEvidence] = []
        for d in delegations:
            observed_at = parse_iso_or_epoch(d.completed_at or d.started_at)
            state_upper = (d.state or "UNKNOWN").upper()

            if state_upper in ("RUNNING", "CLAIMED"):
                ev_type = EvidenceType.DELEGATION_RUNNING
                confidence = "CONFIRMED"
            elif state_upper == "QUEUED":
                ev_type = EvidenceType.DELEGATION_QUEUED
                confidence = "CONFIRMED"
            elif state_upper == "COMPLETED":
                ev_type = EvidenceType.DELEGATION_COMPLETED
                confidence = "CONFIRMED"
            elif state_upper == "FAILED":
                ev_type = EvidenceType.DELEGATION_FAILED
                confidence = "CONFIRMED"
            elif state_upper == "CANCELLED":
                ev_type = EvidenceType.DELEGATION_CANCELLED
                confidence = "CONFIRMED"
            else:
                ev_type = "DELEGATION_UNKNOWN"
                confidence = "UNKNOWN"

            evidence_list.append(
                RuntimeEvidence(
                    evidence_type=ev_type,
                    entity_id=d.id,
                    observed_at=observed_at,
                    confidence=confidence,
                    source="async_delegations",
                    attributes={
                        "target_agent_id": d.target_agent_id,
                        "parent_session_id": d.parent_session_id,
                        "state": d.state,
                        "owner_pid": d.owner_pid,
                    },
                )
            )
        return evidence_list

    def collect_workflow_evidence(
        self,
        tasks: list[TaskDto],
        approvals: list[ApprovalDto],
        now: datetime,
    ) -> list[RuntimeEvidence]:
        evidence_list: list[RuntimeEvidence] = []
        for a in approvals:
            if a.state == "PENDING":
                evidence_list.append(
                    RuntimeEvidence(
                        evidence_type=EvidenceType.APPROVAL_PENDING,
                        entity_id=a.id,
                        observed_at=parse_iso_or_epoch(a.requested_at),
                        confidence="CONFIRMED",
                        source="approvals",
                        attributes={
                            "task_id": a.task_id,
                            "agent_id": a.agent_id,
                            "risk": a.risk,
                        },
                    )
                )

        for t in tasks:
            # Check for explicit session link
            direct_sess_id = getattr(t, "session_id", None)
            if direct_sess_id:
                evidence_list.append(
                    RuntimeEvidence(
                        evidence_type=EvidenceType.TASK_SESSION_LINK,
                        entity_id=t.id,
                        observed_at=parse_iso_or_epoch(t.updated_at or t.created_at),
                        confidence="CONFIRMED",
                        source="tasks",
                        attributes={
                            "session_id": str(direct_sess_id),
                            "assigned_agent_id": t.assigned_agent_id,
                            "state": t.state,
                        },
                    )
                )
        return evidence_list
