import asyncio
from datetime import datetime, timezone
import logging
import platform
import subprocess
import time
from typing import Optional

from app.schemas.runtime import ServiceHealthDto

logger = logging.getLogger("sagara.mission_control.adapters.service_health")

MONITORED_SERVICES = [
    "sagara-mission-control.service",
    "hermes-gateway.service",
    "9router.service",
]


class ServiceHealthAdapter:
    """
    Read-only service health observation adapter (Section 19).
    Monitors systemd user services strictly bounded with timeout.
    Enforces UNKNOWN != HEALTHY and UNAVAILABLE != HEALTHY invariants.
    """

    def __init__(self, ttl_seconds: float = 10.0) -> None:
        self._ttl_seconds = ttl_seconds
        self._cache_time: float = 0.0
        self._cached_services: Optional[list[ServiceHealthDto]] = None

    def _sync_inspect_service(self, service_name: str, observed_at: str) -> ServiceHealthDto:
        is_linux = platform.system().lower() == "linux"
        if not is_linux:
            return ServiceHealthDto(
                name=service_name,
                active_state="UNKNOWN",
                sub_state="UNKNOWN",
                main_pid=None,
                restart_count=None,
                active_since=None,
                observed_at=observed_at,
                health="UNKNOWN",
            )

        try:
            res = subprocess.run(
                [
                    "systemctl",
                    "--user",
                    "show",
                    service_name,
                    "--property=Id,ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp",
                ],
                capture_output=True,
                text=True,
                timeout=2.0,
            )
            if res.returncode != 0:
                logger.warning(f"systemctl returned {res.returncode} for {service_name}")
                return ServiceHealthDto(
                    name=service_name,
                    active_state="UNAVAILABLE",
                    sub_state="UNKNOWN",
                    main_pid=None,
                    restart_count=None,
                    active_since=None,
                    observed_at=observed_at,
                    health="UNAVAILABLE",
                )

            props: dict[str, str] = {}
            for line in res.stdout.splitlines():
                if "=" in line:
                    k, v = line.split("=", 1)
                    props[k.strip()] = v.strip()

            active_state = props.get("ActiveState", "UNKNOWN")
            sub_state = props.get("SubState", "UNKNOWN")
            
            raw_pid = props.get("MainPID")
            main_pid: Optional[int] = None
            if raw_pid and raw_pid.isdigit():
                val = int(raw_pid)
                if val > 0:
                    main_pid = val

            raw_restarts = props.get("NRestarts")
            restart_count: Optional[int] = None
            if raw_restarts and raw_restarts.isdigit():
                restart_count = int(raw_restarts)

            active_since = props.get("ActiveEnterTimestamp") or None
            if active_since and (active_since == "n/a" or active_since.lower() == "never"):
                active_since = None

            # Health classification
            if active_state == "active" and sub_state == "running":
                health = "HEALTHY"
            elif active_state == "active":
                health = "DEGRADED"
            elif active_state in ("failed", "inactive"):
                health = "UNAVAILABLE"
            else:
                health = "UNKNOWN"

            return ServiceHealthDto(
                name=service_name,
                active_state=active_state,
                sub_state=sub_state,
                main_pid=main_pid,
                restart_count=restart_count,
                active_since=active_since,
                observed_at=observed_at,
                health=health,
            )

        except subprocess.TimeoutExpired:
            logger.error(f"Timeout inspecting {service_name}")
            return ServiceHealthDto(
                name=service_name,
                active_state="UNAVAILABLE",
                sub_state="TIMEOUT",
                main_pid=None,
                restart_count=None,
                active_since=None,
                observed_at=observed_at,
                health="UNAVAILABLE",
            )
        except Exception as e:
            logger.debug(f"Failed to inspect {service_name}: {e}")
            return ServiceHealthDto(
                name=service_name,
                active_state="UNKNOWN",
                sub_state="UNKNOWN",
                main_pid=None,
                restart_count=None,
                active_since=None,
                observed_at=observed_at,
                health="UNKNOWN",
            )

    def _sync_inspect_all(self) -> list[ServiceHealthDto]:
        observed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return [self._sync_inspect_service(s, observed_at) for s in MONITORED_SERVICES]

    async def list_services(self) -> list[ServiceHealthDto]:
        now = time.time()
        if self._cached_services is not None and (now - self._cache_time) < self._ttl_seconds:
            return [s.model_copy(deep=True) for s in self._cached_services]

        services = await asyncio.to_thread(self._sync_inspect_all)
        self._cached_services = services
        self._cache_time = now
        return [s.model_copy(deep=True) for s in services]

    async def get_service(self, name: str) -> Optional[ServiceHealthDto]:
        services = await self.list_services()
        for s in services:
            if s.name == name or s.name == f"{name}.service":
                return s.model_copy(deep=True)
        return None
