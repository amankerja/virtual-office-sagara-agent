import asyncio
from datetime import datetime, timezone
import logging
import os
import platform
import shutil
import socket
import time
from typing import Optional

from app.schemas.runtime import VpsHealthDto

logger = logging.getLogger("sagara.mission_control.adapters.vps_telemetry")


class VpsTelemetryAdapter:
    """
    Bounded, read-only system telemetry adapter.
    Uses safe Python OS APIs and /proc files on Linux.
    Strictly prohibits generic shell/exec commands (Section 18).
    Maintains bounded in-memory cache with TTL.
    """

    def __init__(self, ttl_seconds: float = 10.0) -> None:
        self._ttl_seconds = ttl_seconds
        self._cache_time: float = 0.0
        self._cached_telemetry: Optional[VpsHealthDto] = None
        self._last_cpu_sample: Optional[tuple[float, float]] = None

    def _sample_linux_cpu(self) -> Optional[float]:
        try:
            with open("/proc/stat", "r", encoding="utf-8") as f:
                fields = [float(col) for col in f.readline().strip().split()[1:5]]
            idle, total = fields[3], sum(fields)
            if self._last_cpu_sample is not None:
                last_idle, last_total = self._last_cpu_sample
                diff_total = total - last_total
                diff_idle = idle - last_idle
                self._last_cpu_sample = (idle, total)
                if diff_total > 0:
                    usage = 100.0 * (1.0 - diff_idle / diff_total)
                    return round(max(0.0, min(100.0, usage)), 1)
            self._last_cpu_sample = (idle, total)
            return None
        except Exception as e:
            logger.debug(f"Failed to read /proc/stat: {e}")
            return None

    def _sync_read_telemetry(self) -> VpsHealthDto:
        now_dt = datetime.now(timezone.utc)
        observed_at = now_dt.isoformat().replace("+00:00", "Z")
        hostname = socket.gethostname()
        is_linux = platform.system().lower() == "linux"

        uptime_seconds = 0
        cpu_percent: Optional[float] = None
        load_1m: Optional[float] = None
        load_5m: Optional[float] = None
        load_15m: Optional[float] = None
        ram_total_mb: Optional[int] = None
        ram_used_mb: Optional[int] = None
        ram_percent: Optional[float] = None
        swap_total_mb: Optional[int] = None
        swap_used_mb: Optional[int] = None
        disk_total_gb: Optional[float] = None
        disk_used_gb: Optional[float] = None
        disk_free_gb: Optional[float] = None
        disk_percent: Optional[float] = None

        if is_linux:
            # 1. Uptime from /proc/uptime
            try:
                with open("/proc/uptime", "r", encoding="utf-8") as f:
                    uptime_seconds = int(float(f.readline().split()[0]))
            except Exception as e:
                logger.debug(f"Error reading /proc/uptime: {e}")

            # 2. CPU usage from /proc/stat
            cpu_percent = self._sample_linux_cpu()
            if cpu_percent is None:
                time.sleep(0.05)
                cpu_percent = self._sample_linux_cpu()

            # 3. Load averages
            try:
                l1, l5, l15 = os.getloadavg()
                load_1m = round(l1, 2)
                load_5m = round(l5, 2)
                load_15m = round(l15, 2)
            except Exception:
                pass

            # 4. RAM & Swap from /proc/meminfo
            try:
                meminfo: dict[str, int] = {}
                with open("/proc/meminfo", "r", encoding="utf-8") as f:
                    for line in f:
                        parts = line.split(":")
                        if len(parts) == 2:
                            meminfo[parts[0].strip()] = int(parts[1].split()[0]) * 1024  # bytes

                total_b = meminfo.get("MemTotal", 0)
                avail_b = meminfo.get("MemAvailable", 0)
                used_b = total_b - avail_b
                if total_b > 0:
                    ram_total_mb = total_b // (1024 * 1024)
                    ram_used_mb = used_b // (1024 * 1024)
                    ram_percent = round((used_b / total_b) * 100.0, 1)

                sw_total_b = meminfo.get("SwapTotal", 0)
                sw_free_b = meminfo.get("SwapFree", 0)
                sw_used_b = sw_total_b - sw_free_b
                if sw_total_b > 0:
                    swap_total_mb = sw_total_b // (1024 * 1024)
                    swap_used_mb = sw_used_b // (1024 * 1024)
            except Exception as e:
                logger.debug(f"Error reading /proc/meminfo: {e}")

            # 5. Disk from os.statvfs('/')
            try:
                st = os.statvfs("/")
                d_total_b = st.f_frsize * st.f_blocks
                d_free_b = st.f_frsize * st.f_bavail
                d_used_b = d_total_b - d_free_b
                if d_total_b > 0:
                    disk_total_gb = round(d_total_b / (1024 ** 3), 1)
                    disk_used_gb = round(d_used_b / (1024 ** 3), 1)
                    disk_free_gb = round(d_free_b / (1024 ** 3), 1)
                    disk_percent = round((d_used_b / d_total_b) * 100.0, 1)
            except Exception as e:
                logger.debug(f"Error reading statvfs: {e}")

        else:
            # Fallback for Windows / macOS development environments
            try:
                du = shutil.disk_usage(os.getcwd())
                disk_total_gb = round(du.total / (1024 ** 3), 1)
                disk_used_gb = round(du.used / (1024 ** 3), 1)
                disk_free_gb = round(du.free / (1024 ** 3), 1)
                disk_percent = round((du.used / du.total) * 100.0, 1)
            except Exception:
                pass
            uptime_seconds = 7200

        health = "HEALTHY"
        if cpu_percent is not None and cpu_percent > 95.0:
            health = "DEGRADED"
        if ram_percent is not None and ram_percent > 95.0:
            health = "DEGRADED"
        if disk_percent is not None and disk_percent > 95.0:
            health = "DEGRADED"

        return VpsHealthDto(
            hostname=hostname,
            uptime_seconds=uptime_seconds,
            cpu_percent=cpu_percent,
            load_1m=load_1m,
            load_5m=load_5m,
            load_15m=load_15m,
            ram_total_mb=ram_total_mb,
            ram_used_mb=ram_used_mb,
            ram_percent=ram_percent,
            swap_total_mb=swap_total_mb,
            swap_used_mb=swap_used_mb,
            disk_total_gb=disk_total_gb,
            disk_used_gb=disk_used_gb,
            disk_free_gb=disk_free_gb,
            disk_percent=disk_percent,
            observed_at=observed_at,
            health=health,
        )

    async def get_telemetry(self) -> VpsHealthDto:
        now = time.time()
        if self._cached_telemetry is not None and (now - self._cache_time) < self._ttl_seconds:
            return self._cached_telemetry

        telemetry = await asyncio.to_thread(self._sync_read_telemetry)
        self._cached_telemetry = telemetry
        self._cache_time = now
        return telemetry
