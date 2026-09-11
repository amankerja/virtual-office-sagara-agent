import asyncio
import importlib.util
import logging
from pathlib import Path
import sys
import time
from typing import Any, Optional

from app.adapters.sagara_diagnostics import SourceDiagnostic
from app.api.errors import SagaraSourceUnavailableError
from app.schemas.profiles import ProfileDto

logger = logging.getLogger("sagara.mission_control.adapters.profiles")


def validate_sagara_project_root(root_path: Optional[str | Path]) -> Path:
    """
    Validate that the configured Sagara project root is absolute, exists,
    is a directory, and contains expected Sagara project markers.

    Raises SagaraSourceUnavailableError (503) without leaking full paths to client.
    """
    if not root_path:
        logger.error("Sagara project root is not configured.")
        raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")

    try:
        path = Path(root_path)
    except Exception as e:
        logger.error(f"Invalid Sagara project root path format: {e}")
        raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")

    if not path.is_absolute():
        logger.error(f"Configured Sagara project root is not absolute: '{path}'")
        raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")

    if not path.exists() or not path.is_dir():
        logger.error(f"Configured Sagara project root does not exist or is not a directory: '{path}'")
        raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")

    # Validate project markers (Section 31)
    has_profile_registry = (path / "core" / "registry" / "profile.py").is_file()
    has_profiles_dir = (path / "profiles").is_dir()
    has_config_dir = (path / "config").is_dir()

    if not (has_profile_registry or (has_profiles_dir and has_config_dir)):
        logger.error(f"Configured Sagara project root missing expected project markers: '{path}'")
        raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")

    return path


class SagaraProfileCatalogAdapter:
    """
    Read-only adapter for Sagara Agent canonical ProfileRegistry.
    Loads profile definitions directly via Sagara's ProfileRegistry class.
    Deterministic ordering: sorted by name (case-insensitive) then ID.
    """

    def __init__(
        self,
        project_root: Optional[str | Path] = None,
        ttl_seconds: float = 15.0,
    ) -> None:
        self._raw_project_root = project_root
        self._ttl_seconds = ttl_seconds
        self._cache_time: float = 0.0
        self._cached_profiles: Optional[list[ProfileDto]] = None
        self._diagnostics: list[SourceDiagnostic] = []

    def get_diagnostics(self) -> list[SourceDiagnostic]:
        """Return internal diagnostics collected during loading (Section 27)."""
        return list(self._diagnostics)

    def _load_registry_class(self, root: Path):
        registry_file = root / "core" / "registry" / "profile.py"
        if not registry_file.is_file():
            logger.error(f"Canonical ProfileRegistry not found at {registry_file}")
            raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")

        module_name = "core.registry.profile"
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
                logger.error(f"Failed to execute Sagara ProfileRegistry module: {e}")
                raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.") from e
            finally:
                if added_to_path and root_str in sys.path:
                    try:
                        sys.path.remove(root_str)
                    except ValueError:
                        pass

        registry_cls = getattr(module, "ProfileRegistry", None)
        if not registry_cls:
            logger.error(f"Module {registry_file} does not expose ProfileRegistry class.")
            raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.")
        return registry_cls

    def _sync_load_profiles(self) -> list[ProfileDto]:
        validated_root = validate_sagara_project_root(self._raw_project_root)
        registry_cls = self._load_registry_class(validated_root)

        self._diagnostics.clear()

        # Invoke Sagara ProfileRegistry (Section 9)
        profiles_target = validated_root / "profiles" if (validated_root / "profiles").is_dir() else validated_root
        try:
            if hasattr(registry_cls, "load") and callable(getattr(registry_cls, "load")):
                try:
                    registry = registry_cls.load(validated_root)
                    if hasattr(registry, "all") and callable(getattr(registry, "all")) and not registry.all() and profiles_target != validated_root:
                        registry = registry_cls.load(profiles_target)
                except Exception:
                    registry = registry_cls.load(profiles_target)
            else:
                try:
                    registry = registry_cls(validated_root)
                    if hasattr(registry, "all") and callable(getattr(registry, "all")) and not registry.all() and profiles_target != validated_root:
                        registry = registry_cls(profiles_target)
                except Exception:
                    registry = registry_cls(profiles_target)
        except Exception as e:
            logger.error(f"Failed to instantiate ProfileRegistry: {e}")
            raise SagaraSourceUnavailableError("Configured Sagara source is unavailable.") from e


        # Retrieve raw profile items
        if hasattr(registry, "all") and callable(getattr(registry, "all")):
            raw_items = registry.all()
        elif hasattr(registry, "list_profiles") and callable(getattr(registry, "list_profiles")):
            raw_items = registry.list_profiles()
        elif hasattr(registry, "_profiles"):
            raw_items = list(registry._profiles.values())
        else:
            raw_items = []

        dtos: list[ProfileDto] = []
        for raw in raw_items:
            try:
                if isinstance(raw, dict):
                    pid = str(raw["id"])
                    name = str(raw.get("name") or pid)
                    role = raw.get("role") or None
                    desc = raw.get("description") or None
                    enabled = bool(raw.get("enabled", True))
                    memory_ns = raw.get("memory_namespace") or None
                    raw_skills = raw.get("allowed_skills")
                    allowed_skills = list(raw_skills) if raw_skills is not None else None
                    config_state = raw.get("configuration_state")
                    model_tier = raw.get("model_tier")
                else:
                    pid = str(getattr(raw, "id"))
                    name = str(getattr(raw, "name", pid) or pid)
                    role = getattr(raw, "role", None) or None
                    desc = getattr(raw, "description", None) or None
                    enabled = bool(getattr(raw, "enabled", True))
                    memory_ns = getattr(raw, "memory_namespace", None) or None
                    raw_skills = getattr(raw, "allowed_skills", None)
                    allowed_skills = list(raw_skills) if raw_skills is not None else None
                    config_state = getattr(raw, "configuration_state", None)
                    model_tier = getattr(raw, "model_tier", None)


                # Collect non-fatal diagnostics for optional missing fields
                if role is None:
                    self._diagnostics.append(
                        SourceDiagnostic(
                            code="PROFILE_OPTIONAL_FIELD_MISSING",
                            severity="INFO",
                            message=f"Profile '{pid}' has no role configured.",
                            entity_id=pid,
                        )
                    )
                if desc is None:
                    self._diagnostics.append(
                        SourceDiagnostic(
                            code="PROFILE_OPTIONAL_FIELD_MISSING",
                            severity="INFO",
                            message=f"Profile '{pid}' has no description configured.",
                            entity_id=pid,
                        )
                    )

                dto = ProfileDto(
                    id=pid,
                    name=name,
                    role=role,
                    description=desc,
                    enabled=enabled,
                    memory_namespace=memory_ns,
                    allowed_skills=allowed_skills,
                    configuration_state=config_state,
                    model_tier=model_tier,
                )
                dtos.append(dto)
            except Exception as e:
                logger.warning(f"Skipping malformed profile item: {e}")
                self._diagnostics.append(
                    SourceDiagnostic(
                        code="PROFILE_INVALID",
                        severity="WARNING",
                        message=f"Failed to map profile item: {e}",
                    )
                )

        # Deterministic ordering: sorted by name (case-insensitive) then ID (Section 15)
        dtos.sort(key=lambda p: (p.name.lower(), p.id))
        logger.info(f"Sagara profile catalog loaded: {len(dtos)} profiles")
        return dtos

    async def list_profiles(self) -> list[ProfileDto]:
        now = time.time()
        if self._cached_profiles is not None and (now - self._cache_time) < self._ttl_seconds:
            return [p.model_copy(deep=True) for p in self._cached_profiles]

        # Blocking file IO via asyncio.to_thread (Section 54)
        profiles = await asyncio.to_thread(self._sync_load_profiles)
        self._cached_profiles = profiles
        self._cache_time = now
        return [p.model_copy(deep=True) for p in profiles]

    async def get_profile(self, profile_id: str) -> Optional[ProfileDto]:
        profiles = await self.list_profiles()
        for p in profiles:
            if p.id == profile_id:
                return p.model_copy(deep=True)
        return None
