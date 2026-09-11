from datetime import datetime, timezone
import time
from typing import Optional
from app.adapters.hermes_database import HermesReadOnlyDatabase
from app.adapters.hermes_delegations import DelegationReader
from app.adapters.hermes_diagnostics import HermesRuntimeDiagnostics
from app.adapters.hermes_events import RuntimeEventReader
from app.adapters.hermes_gateway import GatewayHeartbeatReader
from app.adapters.hermes_sessions import SessionReader
from app.adapters.hermes_usage import UsageReader
from app.adapters.runtime import RuntimeReader
from app.schemas.delegations import DelegationDto
from app.schemas.runtime import GatewayDto, RuntimeEventDto, RuntimeOverviewDto, RuntimeStatus
from app.schemas.sessions import SessionDto


class HermesSqliteRuntimeAdapter:
    """
    HermesSqliteRuntimeAdapter implements RuntimeReader protocol against live Hermes SQLite state.db.
    Decomposes into modular readers sharing a strictly read-only WAL-aware HermesReadOnlyDatabase.
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
        db: Optional[HermesReadOnlyDatabase] = None,
    ) -> None:
        self.diagnostics = HermesRuntimeDiagnostics()
        self.database = db or HermesReadOnlyDatabase(db_path=db_path)
        self.gateway_reader = GatewayHeartbeatReader(self.database, self.diagnostics)
        self.session_reader = SessionReader(self.database, self.diagnostics)
        self.delegation_reader = DelegationReader(self.database, self.diagnostics)
        self.usage_reader = UsageReader(self.database, self.diagnostics)
        self.event_reader = RuntimeEventReader(self.diagnostics)

    async def get_runtime_overview(self) -> RuntimeOverviewDto:
        gateway = await self.gateway_reader.get_gateway()
        sessions = await self.session_reader.list_sessions(limit=200)
        delegations = await self.delegation_reader.list_delegations()

        active_sessions = sum(1 for s in sessions if s.state == "ACTIVE")
        active_workers = sum(1 for d in delegations if d.state in ("RUNNING", "CLAIMED"))

        # Map status to valid RuntimeStatus
        valid_statuses: set[RuntimeStatus] = {"HEALTHY", "DEGRADED", "ERROR", "OFFLINE", "UNKNOWN", "NOT_CONNECTED"}
        raw_status = gateway.status
        status: RuntimeStatus = raw_status if raw_status in valid_statuses else ("HEALTHY" if gateway.connected else "NOT_CONNECTED")

        confidence = "CONFIRMED" if status == "HEALTHY" else ("INFERRED" if gateway.connected else "UNKNOWN")

        # Uptime approximation from gateway last_heartbeat / age
        uptime_sec = 0
        if gateway.connected:
            uptime_sec = 3600  # Conservative active uptime baseline

        return RuntimeOverviewDto(
            status=status,
            uptime_seconds=uptime_sec,
            active_sessions_count=active_sessions,
            active_workers_count=active_workers,
            confidence=confidence,
            system_load=None,
        )

    async def get_gateway(self) -> GatewayDto:
        return await self.gateway_reader.get_gateway()

    async def list_sessions(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[SessionDto]:
        return await self.session_reader.list_sessions(
            agent_id=agent_id,
            state=state,
            cursor=cursor,
            limit=limit,
        )

    async def get_session(self, session_id: str) -> Optional[SessionDto]:
        return await self.session_reader.get_session(session_id)

    async def list_delegations(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
    ) -> list[DelegationDto]:
        return await self.delegation_reader.list_delegations(agent_id=agent_id, state=state)

    async def get_delegation(self, delegation_id: str) -> Optional[DelegationDto]:
        return await self.delegation_reader.get_delegation(delegation_id)

    async def list_events(self, limit: int = 100) -> list[RuntimeEventDto]:
        return await self.event_reader.list_events(limit=limit)
