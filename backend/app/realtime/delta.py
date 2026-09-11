from typing import Optional

from app.realtime.types import (
    CanonicalRealtimeSnapshot,
    EntityDelta,
    RealtimeChanges,
    RealtimeDelta,
)
from app.schemas.agents import AgentDto
from app.schemas.delegations import DelegationDto
from app.schemas.mission_control import AttentionItemDto
from app.schemas.runtime import GatewayDto


class RealtimeDeltaService:
    """Pure diff delta service for computing minimal canonical state deltas.

    Deterministic: same previous and current snapshots always yield identical deltas.
    Suppresses volatile counters (e.g. heartbeat age) to prevent spamming transport.
    """

    @staticmethod
    def _gateway_has_meaningful_change(prev: GatewayDto, curr: GatewayDto) -> bool:
        """Compare gateway properties ignoring purely volatile heartbeat_age_seconds."""
        return (
            prev.status != curr.status
            or prev.connected != curr.connected
            or prev.latency_ms != curr.latency_ms
            or prev.last_heartbeat_at != curr.last_heartbeat_at
            or prev.host != curr.host
            or prev.pid != curr.pid
            or prev.backend_id != curr.backend_id
            or prev.restart_count != curr.restart_count
        )

    @staticmethod
    def _agent_has_meaningful_change(prev: AgentDto, curr: AgentDto) -> bool:
        """Compare agent definition, runtime state, capabilities, and usage."""
        if prev.definition.model_dump() != curr.definition.model_dump():
            return True
        if prev.runtime.model_dump() != curr.runtime.model_dump():
            return True
        if prev.capabilities.model_dump() != curr.capabilities.model_dump():
            return True
        prev_usage = prev.usage.model_dump() if prev.usage else None
        curr_usage = curr.usage.model_dump() if curr.usage else None
        if prev_usage != curr_usage:
            return True
        return False

    def compute_delta(
        self,
        previous: CanonicalRealtimeSnapshot,
        current: CanonicalRealtimeSnapshot,
    ) -> Optional[RealtimeDelta]:
        changes = RealtimeChanges()

        # 1. Gateway diff
        if self._gateway_has_meaningful_change(previous.gateway, current.gateway):
            changes.gateway = current.gateway

        # 2. Runtime summary diff
        prev_summary = previous.runtime_summary
        curr_summary = current.runtime_summary
        if (
            prev_summary.status != curr_summary.status
            or prev_summary.active_sessions_count != curr_summary.active_sessions_count
            or prev_summary.active_workers_count != curr_summary.active_workers_count
            or prev_summary.confidence != curr_summary.confidence
        ):
            changes.runtime_summary = curr_summary

        # 3. Agents diff
        prev_agents_map = {a.id: a for a in previous.agents}
        curr_agents_map = {a.id: a for a in current.agents}

        agents_upsert: list[AgentDto] = []
        agents_remove: list[str] = []

        for agent_id, curr_agent in curr_agents_map.items():
            prev_agent = prev_agents_map.get(agent_id)
            if prev_agent is None:
                agents_upsert.append(curr_agent)
            elif self._agent_has_meaningful_change(prev_agent, curr_agent):
                agents_upsert.append(curr_agent)

        for agent_id in prev_agents_map:
            if agent_id not in curr_agents_map:
                agents_remove.append(agent_id)

        if agents_upsert or agents_remove:
            changes.agents = EntityDelta(
                upsert=sorted(agents_upsert, key=lambda a: a.id),
                remove=sorted(agents_remove),
            )

        # 4. Task summary diff
        if previous.task_summary != current.task_summary:
            changes.task_summary = current.task_summary

        # 5. Approval summary diff
        if previous.approval_summary != current.approval_summary:
            changes.approval_summary = current.approval_summary

        # 6. Active delegations diff
        prev_del_map = {d.id: d for d in previous.active_delegations}
        curr_del_map = {d.id: d for d in current.active_delegations}

        del_upsert: list[DelegationDto] = []
        del_remove: list[str] = []

        for del_id, curr_del in curr_del_map.items():
            prev_del = prev_del_map.get(del_id)
            if prev_del is None or prev_del.model_dump() != curr_del.model_dump():
                del_upsert.append(curr_del)

        for del_id in prev_del_map:
            if del_id not in curr_del_map:
                del_remove.append(del_id)

        if del_upsert or del_remove:
            changes.active_delegations = EntityDelta(
                upsert=sorted(del_upsert, key=lambda d: d.id),
                remove=sorted(del_remove),
            )

        # 7. Attention items diff
        prev_att_map = {att.id: att for att in previous.attention}
        curr_att_map = {att.id: att for att in current.attention}

        att_upsert: list[AttentionItemDto] = []
        att_remove: list[str] = []

        for att_id, curr_att in curr_att_map.items():
            prev_att = prev_att_map.get(att_id)
            if prev_att is None or prev_att.model_dump() != curr_att.model_dump():
                att_upsert.append(curr_att)

        for att_id in prev_att_map:
            if att_id not in curr_att_map:
                att_remove.append(att_id)

        if att_upsert or att_remove:
            changes.attention = EntityDelta(
                upsert=sorted(att_upsert, key=lambda att: att.id),
                remove=sorted(att_remove),
            )

        if not changes.has_changes():
            return None

        return RealtimeDelta(
            base_revision=previous.revision,
            revision=current.revision,
            generated_at=current.generated_at,
            changes=changes,
        )
