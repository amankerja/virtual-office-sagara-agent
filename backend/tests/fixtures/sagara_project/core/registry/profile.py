from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import yaml


@dataclass
class ProfileDefinition:
    id: str
    name: str
    role: Optional[str] = None
    description: Optional[str] = None
    enabled: bool = True
    memory_namespace: Optional[str] = None
    allowed_skills: Optional[list[str]] = None
    configuration_state: Optional[str] = "COMPLETE"
    model_tier: Optional[str] = None


class ProfileRegistry:
    """Canonical Sagara ProfileRegistry implementation."""

    def __init__(self, project_root: Path | str) -> None:
        self.project_root = Path(project_root)
        self._profiles: dict[str, ProfileDefinition] = {}
        self._load()

    @classmethod
    def load(cls, project_root: Path | str) -> "ProfileRegistry":
        return cls(project_root)

    def _load(self) -> None:
        profiles_dir = self.project_root / "profiles"
        if not profiles_dir.exists():
            return
        for item in sorted(profiles_dir.iterdir()):
            if item.is_dir():
                prof_yaml = item / "profile.yaml"
                if prof_yaml.exists():
                    with open(prof_yaml, "r", encoding="utf-8") as f:
                        data = yaml.safe_load(f) or {}
                    pid = data.get("id", item.name)
                    self._profiles[pid] = ProfileDefinition(
                        id=pid,
                        name=data.get("name", pid),
                        role=data.get("role"),
                        description=data.get("description"),
                        enabled=data.get("enabled", True),
                        memory_namespace=data.get("memory_namespace"),
                        allowed_skills=data.get("allowed_skills"),
                        configuration_state=data.get("configuration_state", "COMPLETE"),
                        model_tier=data.get("model_tier"),
                    )

    def all(self) -> list[ProfileDefinition]:
        return list(self._profiles.values())

    def get(self, profile_id: str) -> Optional[ProfileDefinition]:
        return self._profiles.get(profile_id)

    def enabled(self) -> list[ProfileDefinition]:
        return [p for p in self._profiles.values() if p.enabled]

    def ids(self) -> list[str]:
        return list(self._profiles.keys())
