from datetime import datetime, timezone
from app.adapters.runtime import RuntimeReader
from app.repositories.protocols import ActivityRepository, ApprovalRepository, TaskRepository
from app.schemas.mission_control import AttentionItemDto, MissionControlSnapshotDto
from app.services.agent_service import AgentProjectionService


class MissionControlSnapshotService:
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

    async def get_snapshot(self) -> MissionControlSnapshotDto:
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Fetch underlying summaries concurrently
        agents = await self._agent_service.list_agents()
        tasks = await self._task_repo.list_tasks(limit=100)
        approvals = await self._approval_repo.list_approvals()
        gateway = await self._runtime_reader.get_gateway()
        runtime_overview = await self._runtime_reader.get_runtime_overview()
        recent_activity = await self._activity_repo.list_activity(limit=10)

        # Agent counts
        active_agents = sum(1 for a in agents if a.runtime.state == "ACTIVE")
        idle_agents = sum(1 for a in agents if a.runtime.state == "IDLE")
        awaiting_agents = sum(1 for a in agents if a.runtime.state == "AWAITING_APPROVAL")

        # Task counts
        running_tasks = sum(1 for t in tasks if t.state in ["RUNNING", "DISPATCHING"])
        ready_tasks = sum(1 for t in tasks if t.state == "READY")
        blocked_tasks = sum(1 for t in tasks if t.state == "BLOCKED")
        awaiting_tasks = sum(1 for t in tasks if t.state == "AWAITING_APPROVAL")
        completed_tasks = sum(1 for t in tasks if t.state == "COMPLETED")

        # Approval counts
        pending_approvals = sum(1 for a in approvals if a.state == "PENDING")
        high_risk_approvals = sum(1 for a in approvals if a.state == "PENDING" and a.risk in ["HIGH", "CRITICAL"])

        # Attention items
        attention_items: list[AttentionItemDto] = []
        if high_risk_approvals > 0:
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

        return MissionControlSnapshotDto(
            generated_at=now,
            system_pulse={
                "gateway_connected": gateway.connected,
                "gateway_latency_ms": gateway.latency_ms,
                "runtime_status": runtime_overview.status,
                "uptime_seconds": runtime_overview.uptime_seconds,
            },
            agent_counts={
                "total": len(agents),
                "active": active_agents,
                "idle": idle_agents,
                "awaiting_approval": awaiting_agents,
            },
            task_counts={
                "total": len(tasks),
                "running": running_tasks,
                "ready": ready_tasks,
                "blocked": blocked_tasks,
                "awaiting_approval": awaiting_tasks,
                "completed": completed_tasks,
            },
            approval_counts={
                "total": len(approvals),
                "pending": pending_approvals,
                "high_risk": high_risk_approvals,
            },
            attention_items=attention_items,
            recent_activity=recent_activity,
        )
