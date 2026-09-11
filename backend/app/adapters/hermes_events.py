from typing import Optional
from app.adapters.hermes_diagnostics import HermesRuntimeDiagnostics
from app.schemas.runtime import RuntimeEventDto


class RuntimeEventReader:
    """
    Reader for runtime events in Hermes mode.
    Since Hermes state.db does not contain an authoritative canonical events log,
    this returns an empty list [] and records RUNTIME_EVENT_SOURCE_UNAVAILABLE.
    It strictly avoids fabricating fake production events.
    """

    def __init__(self, diagnostics: Optional[HermesRuntimeDiagnostics] = None) -> None:
        self._diagnostics = diagnostics
        self._diagnostic_recorded = False

    async def list_events(self, limit: int = 100) -> list[RuntimeEventDto]:
        if not self._diagnostic_recorded and self._diagnostics:
            self._diagnostics.record(
                code="RUNTIME_EVENT_SOURCE_UNAVAILABLE",
                message="Hermes SQLite schema does not contain an authoritative runtime_events table.",
                severity="INFO",
            )
            self._diagnostic_recorded = True
        return []
