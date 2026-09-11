from dataclasses import dataclass
from typing import Optional


@dataclass
class SourceDiagnostic:
    code: str
    severity: str  # "INFO", "WARNING", "ERROR"
    message: str
    entity_id: Optional[str] = None
