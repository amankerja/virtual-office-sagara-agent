import asyncio
from datetime import datetime, timezone
import json
import logging
import time
from typing import Optional
import urllib.request

from app.adapters.service_health import ServiceHealthAdapter
from app.schemas.runtime import NineRouterHealthDto

logger = logging.getLogger("sagara.mission_control.adapters.router_health")

DEFAULT_ROUTER_ENDPOINT = "http://127.0.0.1:20128"


class NineRouterHealthAdapter:
    """
    Read-only observation adapter for 9Router AI Gateway (Section 20).
    Probes process health and local HTTP endpoint reachability safely.
    Strictly forbids exposing credentials, tokens, or provider API keys.
    """

    def __init__(
        self,
        service_health_adapter: Optional[ServiceHealthAdapter] = None,
        endpoint: str = DEFAULT_ROUTER_ENDPOINT,
        ttl_seconds: float = 10.0,
    ) -> None:
        self._service_adapter = service_health_adapter or ServiceHealthAdapter(ttl_seconds=ttl_seconds)
        self._endpoint = endpoint.rstrip("/")
        self._ttl_seconds = ttl_seconds
        self._cache_time: float = 0.0
        self._cached_health: Optional[NineRouterHealthDto] = None

    def _sync_check_router(self) -> NineRouterHealthDto:
        now_dt = datetime.now(timezone.utc)
        observed_at = now_dt.isoformat().replace("+00:00", "Z")

        # 1. Inspect service state
        svc = self._service_adapter._sync_inspect_service("9router.service", observed_at)
        service_active = svc.health == "HEALTHY"

        # 2. Probe HTTP endpoint
        status_code: Optional[int] = None
        models_count: Optional[int] = None
        endpoint_reachable = False

        try:
            req = urllib.request.Request(
                f"{self._endpoint}/v1/models",
                headers={"User-Agent": "SagaraMissionControl/1.0"},
            )
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                status_code = resp.status
                if 200 <= resp.status < 300:
                    endpoint_reachable = True
                    try:
                        raw_data = json.loads(resp.read().decode("utf-8"))
                        data_list = raw_data.get("data", [])
                        if isinstance(data_list, list):
                            models_count = len(data_list)
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"9Router probe failed on {self._endpoint}: {e}")

        # If /v1/models failed, try fallback root
        if not endpoint_reachable:
            try:
                req_root = urllib.request.Request(
                    self._endpoint,
                    headers={"User-Agent": "SagaraMissionControl/1.0"},
                )
                with urllib.request.urlopen(req_root, timeout=1.5) as resp:
                    status_code = resp.status
                    if 200 <= resp.status < 400:
                        endpoint_reachable = True
            except Exception:
                pass

        # Health determination
        available = endpoint_reachable or service_active
        if endpoint_reachable and (service_active or svc.active_state in ("UNKNOWN", "active")):
            health = "HEALTHY"
        elif service_active or endpoint_reachable:
            health = "DEGRADED"
        elif svc.health == "UNAVAILABLE":
            health = "UNAVAILABLE"
        else:
            health = "UNKNOWN"

        return NineRouterHealthDto(
            available=available,
            endpoint=self._endpoint,
            status_code=status_code,
            models_count=models_count,
            active_state=svc.active_state,
            main_pid=svc.main_pid,
            observed_at=observed_at,
            health=health,
        )

    async def get_health(self) -> NineRouterHealthDto:
        now = time.time()
        if self._cached_health is not None and (now - self._cache_time) < self._ttl_seconds:
            return self._cached_health.model_copy(deep=True)

        health = await asyncio.to_thread(self._sync_check_router)
        self._cached_health = health
        self._cache_time = now
        return health.model_copy(deep=True)
