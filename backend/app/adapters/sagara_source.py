import asyncio
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import subprocess
import time
from typing import Optional

from app.config import settings
from app.schemas.runtime import (
    HermesSourceDto,
    ReleaseMetadataDto,
    SagaraSourceDto,
    SourceDiscoveryStatusDto,
)

logger = logging.getLogger("sagara.mission_control.adapters.source_discovery")

HISTORICAL_FREEZE_COMMIT = "babbd61618f6eb3db99109ba24e0d49b2c9b97d7"
RUNTIME_CONTRACT_V1 = "SAGARA_HERMES_RUNTIME_CONTRACT_V1"
CANONICAL_POLICY_V3 = "PRODUCTION_EXECUTION_POLICY_V3"
CANONICAL_POLICY_V3_HASH = "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"


class SourceDiscoveryAdapter:
    """
    PnP Native Discovery Status Adapter (Section 35, 64, 65).
    Inspects configured Sagara and Hermes runtime roots safely.
    Distinguishes deployed Sagara HEAD from the historical freeze baseline commit.
    Never leaks internal absolute paths or secrets.
    """

    def __init__(self, ttl_seconds: float = 30.0) -> None:
        self._ttl_seconds = ttl_seconds
        self._cache_time: float = 0.0
        self._cached_status: Optional[SourceDiscoveryStatusDto] = None
        self._cached_release: Optional[ReleaseMetadataDto] = None

    def _detect_git_commit(self, path: Optional[Path]) -> Optional[str]:
        if not path or not path.exists():
            return None
        try:
            res = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=str(path),
                capture_output=True,
                text=True,
                timeout=2.0,
            )
            if res.returncode == 0:
                return res.stdout.strip()
        except Exception:
            pass
        return None

    def _sync_discover_sagara(self, observed_at: str) -> SagaraSourceDto:
        configured = bool(settings.sagara_project_root)
        if not configured:
            return SagaraSourceDto(
                configured=False,
                discovered=False,
                observed_at=observed_at,
                health="UNAVAILABLE",
            )

        root = Path(settings.sagara_project_root)
        discovered = root.is_dir() and (root / "core" / "registry" / "profile.py").is_file()

        commit = self._detect_git_commit(root) if discovered else None

        profiles_count = 0
        skills_count = 0
        channels_count = 0

        if discovered:
            # Count canonical profiles (excluding private profiles)
            profiles_dir = root / "profiles"
            if profiles_dir.is_dir():
                for p in profiles_dir.iterdir():
                    if p.is_dir() and (p / "profile.yaml").is_file() and p.name not in ("private_profile", "private"):
                        profiles_count += 1

            # Count skills in config/skills.yaml or deploy
            skills_file = root / "config" / "skills.yaml"
            if skills_file.is_file():
                try:
                    import yaml
                    with open(skills_file, "r", encoding="utf-8") as f:
                        data = yaml.safe_load(f)
                    if isinstance(data, dict):
                        skills_count = len(data.get("skills", {}))
                except Exception:
                    pass

            # Count channels
            channels_file = root / "config" / "channels.yaml"
            if channels_file.is_file():
                try:
                    import yaml
                    with open(channels_file, "r", encoding="utf-8") as f:
                        cdata = yaml.safe_load(f)
                    if isinstance(cdata, dict) and "platforms" in cdata:
                        for p_info in cdata["platforms"].values():
                            if isinstance(p_info, dict) and "channels" in p_info:
                                channels_count += len(p_info["channels"])
                except Exception:
                    pass

        health = "HEALTHY" if discovered and profiles_count > 0 else ("DEGRADED" if discovered else "UNAVAILABLE")

        return SagaraSourceDto(
            configured=configured,
            discovered=discovered,
            source_version="v1",
            commit=commit,
            freeze_commit=HISTORICAL_FREEZE_COMMIT,
            profiles_loaded=profiles_count,
            skills_loaded=skills_count,
            channels_loaded=channels_count,
            observed_at=observed_at,
            health=health,
        )

    def _sync_discover_hermes(self, observed_at: str) -> HermesSourceDto:
        hermes_home = settings.hermes_home_dir or (os.path.dirname(settings.hermes_state_db_path) if settings.hermes_state_db_path else None)
        if not hermes_home and Path("/home/ubuntu/.hermes").is_dir():
            hermes_home = "/home/ubuntu/.hermes"

        configured = bool(hermes_home or settings.hermes_state_db_path)
        hpath = Path(hermes_home) if hermes_home else None
        discovered = bool(hpath and hpath.is_dir())

        version = None
        gateway_status = None
        state_store_status = None
        profile_stores = 0

        if discovered and hpath:
            # 1. State DB check
            state_db = hpath / "state.db"
            if state_db.is_file():
                state_store_status = "READY"
            else:
                state_store_status = "MISSING"

            # 2. Count profile stores
            profiles_root = hpath / "profiles"
            if profiles_root.is_dir():
                for pdir in profiles_root.iterdir():
                    if pdir.is_dir() and (pdir / "state.db").is_file():
                        profile_stores += 1

            # 3. Read gateway state if present
            gw_json = hpath / "gateway_state.json"
            if gw_json.is_file():
                try:
                    with open(gw_json, "r", encoding="utf-8") as f:
                        gw_data = json.load(f)
                    version = gw_data.get("code_version")
                    gateway_status = gw_data.get("gateway_state", "UNKNOWN")
                except Exception:
                    pass

        health = "HEALTHY" if discovered and state_store_status == "READY" else ("DEGRADED" if discovered else "UNAVAILABLE")

        return HermesSourceDto(
            configured=configured,
            discovered=discovered,
            version=version,
            gateway=gateway_status,
            state_store=state_store_status,
            profile_stores=profile_stores,
            observed_at=observed_at,
            health=health,
        )

    def _sync_discover_all(self) -> SourceDiscoveryStatusDto:
        observed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        sagara = self._sync_discover_sagara(observed_at)
        hermes = self._sync_discover_hermes(observed_at)
        return SourceDiscoveryStatusDto(
            sagara=sagara,
            hermes=hermes,
            runtime_contract=RUNTIME_CONTRACT_V1,
            observed_at=observed_at,
        )

    async def get_source_status(self) -> SourceDiscoveryStatusDto:
        now = time.time()
        if self._cached_status is not None and (now - self._cache_time) < self._ttl_seconds:
            return self._cached_status.model_copy(deep=True)

        status = await asyncio.to_thread(self._sync_discover_all)
        self._cached_status = status
        self._cache_time = now
        return status.model_copy(deep=True)

    async def get_release_metadata(self) -> ReleaseMetadataDto:
        now = time.time()
        if self._cached_release is not None and (now - self._cache_time) < self._ttl_seconds:
            return self._cached_release.model_copy(deep=True)

        sources = await self.get_source_status()
        observed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Detect Mission Control git commit
        mc_root = Path(__file__).resolve().parent.parent.parent
        mc_commit = self._detect_git_commit(mc_root)

        meta = ReleaseMetadataDto(
            platform="Sagara Mission Control",
            mission_control_version="1.0.0",
            mission_control_commit=mc_commit,
            sagara_deployed_commit=sources.sagara.commit,
            sagara_freeze_commit=HISTORICAL_FREEZE_COMMIT,
            hermes_version=sources.hermes.version,
            runtime_contract=RUNTIME_CONTRACT_V1,
            production_policy=CANONICAL_POLICY_V3,
            policy_hash=CANONICAL_POLICY_V3_HASH,
            observed_at=observed_at,
        )
        self._cached_release = meta
        return meta.model_copy(deep=True)
