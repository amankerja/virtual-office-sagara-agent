import logging
from typing import Optional

from app.adapters.runtime import RuntimeReader
from app.realtime.protocol import get_utc_now_iso
from app.realtime.types import CanonicalRealtimeSnapshot
from app.repositories.protocols import ActivityRepository, ApprovalRepository, TaskRepository
from app.schemas.delegations import DelegationDto
from app.schemas.mission_control import AttentionItemDto
from app.services.agent_service import AgentProjectionService

logger = logging.getLogger("mission_control.realtime")


class CanonicalSnapshotService:
    """Service to produce canonical realtime operational snapshots.

    Does not duplicate state derivation: reuses AgentProjectionService,
    RuntimeReader, and local repositories in bounded single-flight batches.
    """

    def __init__(
        self,
        agent_service: AgentProjectionService,
        task_repo: TaskRepository,
        approval_repo: ApprovalRepository,
        runtime_reader: RuntimeReader,
        activity_repo: ActivityRepository,
    ) -> None:
        self._agent_service = agent_service
        self._task_repo = task_repo
        self._approval_repo = approval_repo
        self._runtime_reader = runtime_reader
        self._activity_repo = activity_repo
        self._current_revision: int = 0

    async def get_snapshot(self) -> CanonicalRealtimeSnapshot:
        now = get_utc_now_iso()
        self._current_revision += 1

        # Fetch canonical projections using existing services
        agents = await self._agent_service.list_agents()
        tasks = await self._task_repo.list_tasks(limit=100)
        approvals = await self._approval_repo.list_approvals()
        gateway = await self._runtime_reader.get_gateway()
        runtime_overview = await self._runtime_reader.get_runtime_overview()

        # Get active delegations (only QUEUED, CLAIMED, RUNNING)
        all_delegations = await self._runtime_reader.list_delegations()
        active_delegations = [
            d for d in all_delegations
            if d.state in ["QUEUED", "CLAIMED", "RUNNING"]
        ]

        # Deterministic sorting by ID
        agents_sorted = sorted(agents, key=lambda a: a.id)
        delegations_sorted = sorted(active_delegations, key=lambda d: d.id)

        # Task summary counts
        task_summary = {
            "total": len(tasks),
            "running": sum(1 for t in tasks if t.state in ["RUNNING", "DISPATCHING"]),
            "ready": sum(1 for t in tasks if t.state == "READY"),
            "blocked": sum(1 for t in tasks if t.state == "BLOCKED"),
            "awaiting_approval": sum(1 for t in tasks if t.state == "AWAITING_APPROVAL"),
            "completed": sum(1 for t in tasks if t.state == "COMPLETED"),
        }

        # Approval summary counts
        approval_summary = {
            "total": len(approvals),
            "pending": sum(1 for a in approvals if a.state == "PENDING"),
            "high_risk": sum(1 for a in approvals if a.state == "PENDING" and a.risk in ["HIGH", "CRITICAL"]),
        }

        # Attention items
        attention_items: list[AttentionItemDto] = []
        for a in approvals:
            if a.state == "PENDING" and a.risk in ["HIGH", "CRITICAL"]:
                attention_items.append(
                    AttentionItemDto(
                        id=f"att-{a.id}",
                        type="APPROVAL_REQUIRED",
                        severity="CRITICAL" if a.risk == "CRITICAL" else "HIGH",
                        title=f"Critical Approval Required: {a.title}",
                        description=a.description,
                        timestamp=a.requested_at,
                        related_entity_ids={"approval_id": a.id, "task_id": a.task_id or ""},
                        entity_type="APPROVAL",
                    )
                )

        for t in tasks:
            if t.state == "BLOCKED":
                attention_items.append(
                    AttentionItemDto(
                        id=f"att-{t.id}",
                        type="TASK_BLOCKED",
                        severity="MEDIUM",
                        title=f"Task Blocked: {t.title}",
                        description=t.description,
                        timestamp=t.updated_at or t.created_at,
                        related_entity_ids={"task_id": t.id},
                        entity_type="TASK",
                    )
                )

        attention_sorted = sorted(attention_items, key=lambda att: att.id)

        return CanonicalRealtimeSnapshot(
            generated_at=now,
            revision=self._current_revision,
            gateway=gateway,
            runtime_summary=runtime_overview,
            agents=agents_sorted,
            task_summary=task_summary,
            approval_summary=approval_summary,
            active_delegations=delegations_sorted,
            attention=attention_sorted,
        )
