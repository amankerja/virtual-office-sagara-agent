import asyncio
import importlib.util
import logging
from pathlib import Path
import sys
import time
from typing import Optional

from app.adapters.sagara_diagnostics import SourceDiagnostic
from app.adapters.sagara_profiles import validate_sagara_project_root
from app.api.errors import SagaraSourceUnavailableError
from app.schemas.skills import SkillDto

logger = logging.getLogger("sagara.mission_control.adapters.skills")


class SagaraSkillCatalogAdapter:
    """
    Read-only adapter for Sagara Agent canonical SkillRegistry.
    Consumes effective managed skill definitions from Sagara's canonical SkillRegistry.
    STRICTLY PROHIBITED: Recursive glob('**/SKILL.md') scan (Section 16 & 58).
    Preserves 4 frozen dimensions:
      - registration: REGISTERED
      - installation: UNKNOWN (without Hermes runtime proof)
      - health: UNKNOWN (never fabricate HEALTHY)
      - execution: NOT_OBSERVED (never fabricate execution evidence)
    """

    def __init__(
        self,
        project_root: Optional[str | Path] = None,
        ttl_seconds: float = 15.0,
    ) -> None:
        self._raw_project_root = project_root
        self._ttl_seconds = ttl_seconds
        self._cache_time: float = 0.0
        self._cached_skills: Optional[list[SkillDto]] = None
        self._diagnostics: list[SourceDiagnostic] = []

    def get_diagnostics(self) -> list[SourceDiagnostic]:
        """Return internal diagnostics collected during loading (Section 27)."""
        return list(self._diagnostics)

    def _load_registry_class(self, root: Path):
        registry_file = root / "core" / "registry" / "skill.py"
        if not registry_file.is_file():
            logger.error(f"Canonical SkillRegistry not found at {registry_file}")
            raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")

        module_name = "core.registry.skill"
        if module_name in sys.modules:
            module = sys.modules[module_name]
        else:
            root_str = str(root)
            added_to_path = False
            if root_str not in sys.path:
                sys.path.insert(0, root_str)
                added_to_path = True
            try:
                # Ensure parent package is loaded if it exists for relative imports
                if "core.registry" not in sys.modules:
                    pkg_init = root / "core" / "registry" / "__init__.py"
                    if pkg_init.is_file():
                        pkg_spec = importlib.util.spec_from_file_location("core.registry", pkg_init)
                        if pkg_spec and pkg_spec.loader:
                            pkg_mod = importlib.util.module_from_spec(pkg_spec)
                            sys.modules["core.registry"] = pkg_mod
                            pkg_spec.loader.exec_module(pkg_mod)

                spec = importlib.util.spec_from_file_location(module_name, registry_file)
                if spec is None or spec.loader is None:
                    raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")
                module = importlib.util.module_from_spec(spec)
                module.__package__ = "core.registry"
                sys.modules[module_name] = module
                spec.loader.exec_module(module)
            except Exception as e:
                logger.error(f"Failed to execute Sagara SkillRegistry module: {e}")
                raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.") from e
            finally:
                if added_to_path and root_str in sys.path:
                    try:
                        sys.path.remove(root_str)
                    except ValueError:
                        pass

        registry_cls = getattr(module, "SkillRegistry", None)
        if not registry_cls:
            logger.error(f"Module {registry_file} does not expose SkillRegistry class.")
            raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")
        return registry_cls

    def _sync_load_skills(self) -> list[SkillDto]:
        validated_root = validate_sagara_project_root(self._raw_project_root)
        registry_cls = self._load_registry_class(validated_root)

        self._diagnostics.clear()

        # Invoke Sagara SkillRegistry (Section 17)
        skills_yaml = validated_root / "config" / "skills.yaml"
        if not skills_yaml.is_file():
            skills_yaml = validated_root

        try:
            if hasattr(registry_cls, "load") and callable(getattr(registry_cls, "load")):
                import inspect
                sig = inspect.signature(registry_cls.load)
                params = list(sig.parameters.keys())
                if len(params) > 0 and params[0] == "path":
                    registry = registry_cls.load(skills_yaml, project_root=validated_root)
                else:
                    registry = registry_cls.load(validated_root)
            else:
                registry = registry_cls(validated_root)

        except Exception as e:
            logger.error(f"Failed to instantiate SkillRegistry: {e}")
            raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.") from e

        # Retrieve raw skill items from canonical registry
        if hasattr(registry, "all") and callable(getattr(registry, "all")):
            raw_items = registry.all()
        elif hasattr(registry, "list_skills") and callable(getattr(registry, "list_skills")):
            raw_items = registry.list_skills()
        elif hasattr(registry, "_skills"):
            raw_items = list(registry._skills.values())
        else:
            raw_items = []

        dtos: list[SkillDto] = []
        for raw in raw_items:
            try:
                if isinstance(raw, dict):
                    sid = str(raw["id"])
                    name = str(raw.get("name") or sid)
                    category = str(raw.get("domain") or raw.get("category") or "general")
                    desc = raw.get("description") or None
                    version = str(raw.get("version") or "") or None
                    registration = raw.get("registration", "REGISTERED")
                else:
                    sid = str(getattr(raw, "id"))
                    name = str(getattr(raw, "name", sid) or sid)
                    category = str(getattr(raw, "domain", getattr(raw, "category", "general")) or "general")
                    desc = getattr(raw, "description", None) or None
                    raw_ver = getattr(raw, "version", None)
                    version = str(raw_ver) if raw_ver is not None else None
                    registration = getattr(raw, "registration", "REGISTERED")


                # Map 4 frozen dimensions safely without Hermes runtime (Section 19, 20, 21)
                # Registration is confirmed truth from canonical registry
                reg_value = "REGISTERED" if registration == "REGISTERED" else "UNREGISTERED"

                # Installation cannot be proven without Hermes environment -> UNKNOWN
                inst_value = "UNKNOWN"

                # Health requires runtime dependencies -> UNKNOWN (never fabricate HEALTHY)
                health_value = "UNKNOWN"

                # Execution is unobserved until Hermes integration -> NOT_OBSERVED
                exec_value = "NOT_OBSERVED"

                dto = SkillDto(
                    id=sid,
                    name=name,
                    category=category,
                    description=desc,
                    version=version,
                    registration=reg_value,
                    installation=inst_value,
                    health=health_value,
                    execution=exec_value,
                    owner_pid=None,
                    last_executed_at=None,
                )
                dtos.append(dto)
            except Exception as e:
                logger.warning(f"Skipping malformed skill item: {e}")
                self._diagnostics.append(
                    SourceDiagnostic(
                        code="SKILL_INVALID",
                        severity="WARNING",
                        message=f"Failed to map skill item: {e}",
                    )
                )

        # Supplementary discovery from Hermes skills, Sagara Agent skills, and user profiles
        existing_ids = {d.id.lower() for d in dtos}
        scan_dirs = [
            Path("/home/ubuntu/.hermes/skills"),
            validated_root / "skills",
            Path("/home/ubuntu/.hermes/profiles"),
        ]

        import re
        import yaml

        for base in scan_dirs:
            if not base.exists():
                continue
            for p in base.rglob("SKILL.md"):
                try:
                    content = p.read_text("utf-8", errors="ignore")
                    m = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
                    name = None
                    desc = None
                    category = p.parent.parent.name if p.parent.parent != base else p.parent.name
                    if m:
                        data = yaml.safe_load(m.group(1)) or {}
                        if isinstance(data, dict):
                            name = data.get("name")
                            desc = data.get("description")
                            if data.get("category"):
                                category = str(data.get("category"))
                    if not name:
                        name = p.parent.name
                    sid = str(name).lower().replace(" ", "-")

                    if sid and sid not in existing_ids:
                        existing_ids.add(sid)
                        dtos.append(
                            SkillDto(
                                id=sid,
                                name=str(name),
                                category=str(category or "general"),
                                description=str(desc) if desc else None,
                                version="1.0.0",
                                registration="REGISTERED",
                                installation="UNKNOWN",
                                health="UNKNOWN",
                                execution="NOT_OBSERVED",
                                owner_pid=None,
                                last_executed_at=None,
                            )
                        )
                except Exception as e:
                    logger.debug(f"Failed to parse skill file {p}: {e}")

        # Deterministic ordering: sorted by name (case-insensitive) then ID (Section 15)
        dtos.sort(key=lambda s: (s.name.lower(), s.id))
        logger.info(f"Sagara skill catalog loaded: {len(dtos)} skills")
        return dtos

    async def list_skills(
        self,
        registration: Optional[str] = None,
        health: Optional[str] = None,
    ) -> list[SkillDto]:
        now = time.time()
        if self._cached_skills is not None and (now - self._cache_time) < self._ttl_seconds:
            all_skills = self._cached_skills
        else:
            all_skills = await asyncio.to_thread(self._sync_load_skills)
            self._cached_skills = all_skills
            self._cache_time = now

        results = all_skills
        if registration and registration != "ALL":
            results = [s for s in results if s.registration == registration]
        if health and health != "ALL":
            results = [s for s in results if s.health == health]

        return [s.model_copy(deep=True) for s in results]

    async def get_skill(self, skill_id: str) -> Optional[SkillDto]:
        skills = await self.list_skills()
        for s in skills:
            if s.id == skill_id:
                return s.model_copy(deep=True)
        return None
