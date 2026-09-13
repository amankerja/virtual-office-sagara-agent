import asyncio
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import time
from typing import Optional
import yaml

from app.adapters.hermes_database import HermesReadOnlyDatabase
from app.adapters.hermes_delegations import DelegationReader
from app.adapters.hermes_diagnostics import HermesRuntimeDiagnostics
from app.adapters.hermes_events import RuntimeEventReader
from app.adapters.hermes_gateway import GatewayHeartbeatReader
from app.adapters.hermes_sessions import SessionReader
from app.adapters.hermes_usage import UsageReader
from app.adapters.router_health import NineRouterHealthAdapter
from app.adapters.runtime import RuntimeReader
from app.adapters.service_health import ServiceHealthAdapter
from app.adapters.vps_telemetry import VpsTelemetryAdapter
from app.schemas.delegations import DelegationDto
from app.schemas.runtime import GatewayDto, RuntimeEventDto, RuntimeOverviewDto, RuntimeStatus
from app.schemas.sessions import SessionDto

logger = logging.getLogger("sagara.mission_control.adapters.hermes_runtime")


class HermesSqliteRuntimeAdapter:
    """
    HermesSqliteRuntimeAdapter implements RuntimeReader protocol against live Hermes SQLite state.db.
    Decomposes into modular readers sharing a strictly read-only WAL-aware HermesReadOnlyDatabase.
    Enriches overview with real host telemetry, system services, and 9Router status.
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
        db: Optional[HermesReadOnlyDatabase] = None,
        vps_adapter: Optional[VpsTelemetryAdapter] = None,
        service_adapter: Optional[ServiceHealthAdapter] = None,
        router_adapter: Optional[NineRouterHealthAdapter] = None,
    ) -> None:
        self.diagnostics = HermesRuntimeDiagnostics()
        self.database = db or HermesReadOnlyDatabase(db_path=db_path)
        self.gateway_reader = GatewayHeartbeatReader(self.database, self.diagnostics)
        self.session_reader = SessionReader(self.database, self.diagnostics)
        self.delegation_reader = DelegationReader(self.database, self.diagnostics)
        self.usage_reader = UsageReader(self.database, self.diagnostics)
        self.event_reader = RuntimeEventReader(self.diagnostics)

        self.vps_adapter = vps_adapter or VpsTelemetryAdapter()
        self.service_adapter = service_adapter or ServiceHealthAdapter()
        self.router_adapter = router_adapter or NineRouterHealthAdapter(self.service_adapter)

    def _read_model_config(self) -> tuple[Optional[str], Optional[str]]:
        hermes_dir = os.path.dirname(self.database.db_path) if self.database.db_path else None
        if not hermes_dir and Path("/home/ubuntu/.hermes").is_dir():
            hermes_dir = "/home/ubuntu/.hermes"
        if hermes_dir:
            cfg_path = os.path.join(hermes_dir, "config.yaml")
            if os.path.isfile(cfg_path):
                try:
                    with open(cfg_path, "r", encoding="utf-8") as f:
                        data = yaml.safe_load(f)
                    if isinstance(data, dict):
                        model_data = data.get("model", {})
                        default_model = model_data.get("default") if isinstance(model_data, dict) else None
                        provider_str = model_data.get("provider") if isinstance(model_data, dict) else None
                        if provider_str and "9router" in provider_str.lower():
                            provider_name = "9Router"
                        elif provider_str:
                            provider_name = provider_str.split(":")[-1].capitalize()
                        else:
                            provider_name = None
                        return default_model or "UNKNOWN", provider_name or "UNKNOWN"
                except Exception:
                    pass
        return "UNKNOWN", "UNKNOWN"

    def _read_platform_states(self) -> dict[str, str]:
        hermes_dir = os.path.dirname(self.database.db_path) if self.database.db_path else None
        if not hermes_dir and Path("/home/ubuntu/.hermes").is_dir():
            hermes_dir = "/home/ubuntu/.hermes"
        result: dict[str, str] = {"discord": "UNKNOWN", "telegram": "UNKNOWN", "whatsapp": "UNKNOWN"}
        if hermes_dir:
            gw_json = os.path.join(hermes_dir, "gateway_state.json")
            if os.path.isfile(gw_json):
                try:
                    with open(gw_json, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    platforms = data.get("platforms", {})
                    for p_name in ("discord", "telegram", "whatsapp"):
                        p_info = platforms.get(p_name)
                        if isinstance(p_info, dict):
                            st = p_info.get("state")
                            if st == "connected":
                                result[p_name] = "HEALTHY"
                            elif st in ("error", "disconnected"):
                                result[p_name] = "UNAVAILABLE"
                            elif st:
                                result[p_name] = "DEGRADED"
                except Exception:
                    pass
        return result

    async def get_runtime_overview(self) -> RuntimeOverviewDto:
        gateway = await self.gateway_reader.get_gateway()
        sessions = await self.session_reader.list_sessions(limit=200)
        delegations = await self.delegation_reader.list_delegations()
        accounting = await self.session_reader.get_session_accounting()
        vps = await self.vps_adapter.get_telemetry()
        services = await self.service_adapter.list_services()
        router = await self.router_adapter.get_health()

        active_sessions = sum(1 for s in sessions if s.state == "ACTIVE")
        active_workers = sum(1 for d in delegations if d.state in ("RUNNING", "CLAIMED"))

        # Map status to valid RuntimeStatus
        valid_statuses: set[RuntimeStatus] = {"HEALTHY", "DEGRADED", "ERROR", "OFFLINE", "UNKNOWN", "NOT_CONNECTED"}
        raw_status = gateway.status
        status: RuntimeStatus = raw_status if raw_status in valid_statuses else ("HEALTHY" if gateway.connected else "NOT_CONNECTED")

        confidence = "CONFIRMED" if status == "HEALTHY" else ("INFERRED" if gateway.connected else "UNKNOWN")

        # Live host uptime from VPS telemetry adapter
        uptime_sec = vps.uptime_seconds

        # Read model/provider and platforms
        current_model, current_provider = self._read_model_config()
        platforms = self._read_platform_states()

        system_load = {
            "cpu_percent": vps.cpu_percent,
            "cpuPercent": vps.cpu_percent,
            "memory_used_mb": vps.ram_used_mb,
            "memoryUsedMb": vps.ram_used_mb,
            "memory_total_mb": vps.ram_total_mb,
            "memoryTotalMb": vps.ram_total_mb,
            "memory_percent": vps.ram_percent,
            "memoryPercent": vps.ram_percent,
            "swap_used_mb": vps.swap_used_mb,
            "swap_total_mb": vps.swap_total_mb,
            "disk_used_gb": vps.disk_used_gb,
            "disk_total_gb": vps.disk_total_gb,
            "disk_free_gb": vps.disk_free_gb,
            "disk_percent": vps.disk_percent,
            "load_1m": vps.load_1m,
            "load_5m": vps.load_5m,
            "load_15m": vps.load_15m,
            "hostname": vps.hostname,
        }

        return RuntimeOverviewDto(
            status=status,
            uptime_seconds=uptime_sec,
            active_sessions_count=active_sessions,
            active_workers_count=active_workers,
            confidence=confidence,
            system_load=system_load,
            central_store_sessions=accounting["central_store_sessions"],
            profile_local_sessions=accounting["profile_local_sessions"],
            aggregate_distinct_sessions=accounting["aggregate_distinct_sessions"],
            current_model=current_model,
            current_provider=current_provider,
            platforms=platforms,
            vps_health=vps.model_dump(),
            services_health=[s.model_dump() for s in services],
            router_health=router.model_dump(),
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
