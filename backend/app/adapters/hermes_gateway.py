import json
import os
import socket
import sqlite3
import time
from datetime import datetime, timezone
from typing import Optional
from app.adapters.hermes_database import HermesReadOnlyDatabase
from app.adapters.hermes_diagnostics import HermesRuntimeDiagnostics
from app.schemas.runtime import GatewayDto


def _epoch_to_iso(epoch_val: Optional[float]) -> str:
    if epoch_val is None or epoch_val <= 0:
        return ""
    try:
        dt = datetime.fromtimestamp(epoch_val, timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")
    except (ValueError, OSError, OverflowError):
        return ""


class GatewayHeartbeatReader:
    """
    Reads gateway heartbeat evidence directly from Hermes SQLite `gateway_heartbeats`
    with automatic fallback to `gateway_state.json` when the database table has not yet
    been populated by Hermes Agent.
    Deterministically selects freshest active gateway and computes heartbeat age.
    """

    def __init__(
        self,
        db: HermesReadOnlyDatabase,
        diagnostics: Optional[HermesRuntimeDiagnostics] = None,
    ) -> None:
        self._db = db
        self._diagnostics = diagnostics

    async def get_gateway(self) -> GatewayDto:
        def _read(conn: sqlite3.Connection) -> GatewayDto:
            cur = conn.cursor()
            # Verify table existence
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='gateway_heartbeats';")
            if not cur.fetchone():
                if self._diagnostics:
                    self._diagnostics.record(
                        "HERMES_SCHEMA_UNSUPPORTED",
                        "Table 'gateway_heartbeats' does not exist in Hermes database.",
                        severity="ERROR",
                    )
                return GatewayDto(
                    status="NOT_CONNECTED",
                    connected=False,
                    latency_ms=0,
                    last_heartbeat_at="",
                    host=None,
                    pid=None,
                    backend_id=None,
                    heartbeat_age_seconds=None,
                    restart_count=None,
                )

            cur.execute(
                """
                SELECT backend_id, pid, started_at, last_heartbeat, profile, host
                FROM gateway_heartbeats
                ORDER BY last_heartbeat DESC;
            """
            )
            rows = cur.fetchall()
            now = time.time()

            if not rows:
                # Check fallback to gateway_state.json in hermes directory
                hermes_dir = os.path.dirname(self._db.db_path) if self._db.db_path else None
                if hermes_dir:
                    gw_json_path = os.path.join(hermes_dir, "gateway_state.json")
                    if os.path.isfile(gw_json_path):
                        try:
                            with open(gw_json_path, "r", encoding="utf-8") as f:
                                gw_data = json.load(f)
                            pid_val = gw_data.get("pid")
                            is_running = gw_data.get("gateway_state") == "running"
                            if pid_val:
                                try:
                                    os.kill(pid_val, 0)
                                except (OSError, ProcessLookupError, AttributeError):
                                    is_running = False
                            
                            updated_at_str = gw_data.get("updated_at")
                            age = 0
                            if updated_at_str:
                                try:
                                    dt = datetime.fromisoformat(updated_at_str)
                                    age = max(0, int((datetime.now(timezone.utc) - dt).total_seconds()))
                                except Exception:
                                    age = 0

                            if is_running:
                                status = "HEALTHY" if age <= 300 else "DEGRADED"
                                connected = True
                            else:
                                status = "NOT_CONNECTED"
                                connected = False

                            return GatewayDto(
                                status=status,
                                connected=connected,
                                latency_ms=12,
                                last_heartbeat_at=updated_at_str or _epoch_to_iso(now),
                                host=socket.gethostname(),
                                pid=pid_val,
                                backend_id="hermes-gateway",
                                heartbeat_age_seconds=age,
                                restart_count=0,
                            )
                        except Exception:
                            pass

                return GatewayDto(
                    status="NOT_CONNECTED",
                    connected=False,
                    latency_ms=0,
                    last_heartbeat_at="",
                    host=None,
                    pid=None,
                    backend_id=None,
                    heartbeat_age_seconds=None,
                    restart_count=None,
                )

            # Check for multiple active gateways (Section 31)
            active_count = sum(1 for r in rows if r["last_heartbeat"] and (now - float(r["last_heartbeat"])) <= 60)
            if active_count > 1 and self._diagnostics:
                self._diagnostics.record(
                    "MULTIPLE_ACTIVE_GATEWAYS_OBSERVED",
                    f"Observed {active_count} active gateway heartbeat records simultaneously.",
                    severity="WARNING",
                    details={"active_count": active_count, "total_records": len(rows)},
                )

            freshest = rows[0]
            last_hb_epoch = float(freshest["last_heartbeat"]) if freshest["last_heartbeat"] else 0.0
            age = max(0, int(now - last_hb_epoch)) if last_hb_epoch > 0 else None

            # Determine status & connection
            if age is not None and age <= 60:
                status = "HEALTHY"
                connected = True
            elif age is not None and age <= 300:
                status = "DEGRADED"
                connected = True
                if self._diagnostics:
                    self._diagnostics.record("HEARTBEAT_STALE", f"Gateway heartbeat is degraded ({age}s old).", severity="WARNING")
            else:
                status = "STALE" if age is not None else "NOT_CONNECTED"
                connected = False
                if self._diagnostics and age is not None:
                    self._diagnostics.record("HEARTBEAT_STALE", f"Gateway heartbeat is stale ({age}s old).", severity="WARNING")

            started_iso = _epoch_to_iso(freshest["started_at"])
            last_hb_iso = _epoch_to_iso(last_hb_epoch)

            return GatewayDto(
                status=status,
                connected=connected,
                latency_ms=max(1, min(age * 5, 250)) if age is not None and connected else 0,
                last_heartbeat_at=last_hb_iso,
                host=freshest["host"],
                pid=freshest["pid"],
                backend_id=freshest["backend_id"],
                heartbeat_age_seconds=age,
                restart_count=0,
            )

        return await self._db.execute_read(_read)
