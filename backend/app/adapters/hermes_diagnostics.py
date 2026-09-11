from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


@dataclass
class HermesDiagnosticRecord:
    code: str
    message: str
    severity: str
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )
    details: Optional[dict[str, Any]] = None


class HermesRuntimeDiagnostics:
    """Collects runtime diagnostics without mutating public frozen contracts."""

    def __init__(self) -> None:
        self._records: list[HermesDiagnosticRecord] = []

    def record(
        self,
        code: str,
        message: str,
        severity: str = "WARNING",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        self._records.append(
            HermesDiagnosticRecord(
                code=code,
                message=message,
                severity=severity,
                details=details,
            )
        )

    def get_records(self) -> list[HermesDiagnosticRecord]:
        return list(self._records)

    def clear(self) -> None:
        self._records.clear()
