import asyncio
import logging
import time
from typing import Optional

from app.realtime.manager import RealtimeConnectionManager
from app.realtime.snapshot import CanonicalSnapshotService

logger = logging.getLogger("mission_control.realtime")


class RealtimeSampler:
    """Background sampling worker that periodically produces canonical snapshots.

    Guarantees:
    - Single sampler: query load never multiplies with number of connected clients.
    - Single-flight sampling: overlapping sample iterations are strictly prevented.
    - Safe error containment: failures in a read cycle log diagnostics and never crash server.
    """

    def __init__(
        self,
        snapshot_service: CanonicalSnapshotService,
        connection_manager: RealtimeConnectionManager,
        interval_seconds: float = 2.0,
        heartbeat_interval_seconds: float = 20.0,
    ) -> None:
        self._snapshot_service = snapshot_service
        self._manager = connection_manager
        self._interval_seconds = max(1.0, interval_seconds)
        self._heartbeat_interval_seconds = heartbeat_interval_seconds
        self._single_flight_lock = asyncio.Lock()
        self._task: Optional[asyncio.Task] = None
        self._is_running: bool = False
        self._last_heartbeat_time: float = 0.0

        # Diagnostics
        self.sample_count: int = 0
        self.last_sample_duration_ms: float = 0.0
        self.sample_error_count: int = 0

    @property
    def is_running(self) -> bool:
        return self._is_running

    async def sample_once(self) -> None:
        """Execute a single-flight sample iteration."""
        if self._single_flight_lock.locked():
            logger.warning("Sampler tick skipped: previous sample iteration is still running")
            return

        async with self._single_flight_lock:
            start_time = time.perf_counter()
            try:
                snapshot = await self._snapshot_service.get_snapshot()
                await self._manager.handle_new_snapshot(snapshot)
                self.sample_count += 1
            except Exception as exc:
                self.sample_error_count += 1
                logger.error(f"Error during realtime sampling iteration: {exc}", exc_info=True)
            finally:
                self.last_sample_duration_ms = (time.perf_counter() - start_time) * 1000.0

    async def _run_loop(self) -> None:
        logger.info(f"Realtime sampler started (interval={self._interval_seconds}s)")
        self._last_heartbeat_time = time.monotonic()

        while self._is_running:
            try:
                await self.sample_once()

                # Check if transport heartbeat is due
                now = time.monotonic()
                if now - self._last_heartbeat_time >= self._heartbeat_interval_seconds:
                    if self._manager.connected_clients_count > 0:
                        await self._manager.send_heartbeat()
                    self._last_heartbeat_time = now

                await asyncio.sleep(self._interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Unexpected error in sampler loop: {exc}")
                await asyncio.sleep(self._interval_seconds)

        logger.info("Realtime sampler loop terminated")

    def start(self) -> None:
        if self._is_running:
            return
        self._is_running = True
        self._task = asyncio.create_task(self._run_loop(), name="realtime-sampler")

    async def stop(self) -> None:
        if not self._is_running:
            return
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await asyncio.wait_for(self._task, timeout=2.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass
        self._task = None
        logger.info("Realtime sampler stopped cleanly")
