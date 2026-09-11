from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import yaml


@dataclass
class SkillDefinition:
    id: str
    name: str
    category: str
    description: Optional[str] = None
    version: Optional[str] = None
    registration: str = "REGISTERED"
    health: str = "UNKNOWN"
    installation: str = "UNKNOWN"
    execution: str = "NOT_OBSERVED"


class SkillRegistry:
    """Canonical Sagara SkillRegistry implementation."""

    def __init__(self, project_root: Path | str) -> None:
        self.project_root = Path(project_root)
        self._skills: dict[str, SkillDefinition] = {}
        self._load()

    @classmethod
    def load(cls, project_root: Path | str) -> "SkillRegistry":
        return cls(project_root)

    def _load(self) -> None:
        # Load from canonical config/skills.yaml
        skills_yaml = self.project_root / "config" / "skills.yaml"
        if skills_yaml.exists():
            with open(skills_yaml, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            skills_list = data.get("skills", [])
            for item in skills_list:
                sid = item.get("id")
                if sid:
                    self._skills[sid] = SkillDefinition(
                        id=sid,
                        name=item.get("name", sid),
                        category=item.get("category", "general"),
                        description=item.get("description"),
                        version=item.get("version"),
                        registration=item.get("registration", "REGISTERED"),
                        health=item.get("health", "UNKNOWN"),
                        installation=item.get("installation", "UNKNOWN"),
                        execution=item.get("execution", "NOT_OBSERVED"),
                    )

    def all(self) -> list[SkillDefinition]:
        return list(self._skills.values())

    def get(self, skill_id: str) -> Optional[SkillDefinition]:
        return self._skills.get(skill_id)

    def registered(self) -> list[SkillDefinition]:
        return [s for s in self._skills.values() if s.registration == "REGISTERED"]

    def ids(self) -> list[str]:
        return list(self._skills.keys())
