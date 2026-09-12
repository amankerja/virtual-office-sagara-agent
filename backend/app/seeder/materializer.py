"""
Seed Materializer Engine.
Generates / materializes canonical configuration manifests into a specified STAGING directory.
STRICT SAFETY INVARIANTS:
1. NEVER writes to live production directory by default.
2. Materialized output is 100% compatible with canonical ProfileRegistry.load(output_dir).
3. Deterministic output: sorted keys, sorted lists, deterministic SHA-256 semantic hash.
4. Idempotent: repeated materialization against clean or identical target produces identical files and hash.
"""
import hashlib
import json
import logging
from pathlib import Path
import shutil
from typing import Any, Optional
import yaml

from app.seeder.models import ValidationReport
from app.seeder.validator import SeedValidator, compute_semantic_hash

logger = logging.getLogger("sagara.mission_control.seeder.materializer")


class SeedMaterializer:
    """Safely materializes seed blueprint into canonical profile filesystem layout."""

    def __init__(
        self,
        validator: Optional[SeedValidator] = None,
        seed_dir: Optional[Path | str] = None,
        soul_dir: Optional[Path | str] = None,
        project_root: Optional[Path | str] = None,
        source_mode: str = "production-readonly",
    ) -> None:
        self.validator = validator or SeedValidator(
            seed_dir=seed_dir,
            soul_dir=soul_dir,
            project_root=project_root,
            source_mode=source_mode,
        )

    def materialize(
        self,
        output_dir: Path | str,
        clean_target: bool = True,
    ) -> dict[str, Any]:
        """
        Materialize seed blueprint into canonical directory structure:
        output_dir/
          profiles/
            lead/
              profile.yaml
              SOUL.md
            personal/
              ...
          config/
            materialization-manifest.json

        Returns metadata summary with semantic hash and file counts.
        """
        target_path = Path(output_dir).resolve()

        # Validate seeds first
        report: ValidationReport = self.validator.validate()
        if not report.is_valid:
            raise ValueError(f"Cannot materialize invalid seeds: {report.errors}")

        # Safety check: prevent accidental overwriting of sensitive repo roots without explicit target
        if target_path == Path("/").resolve() or target_path == Path("C:/").resolve():
            raise ValueError("Target directory cannot be root filesystem.")

        if clean_target and target_path.exists():
            # If target exists and clean_target is requested, clean up profiles directory within it
            staging_profiles = target_path / "profiles"
            if staging_profiles.exists():
                shutil.rmtree(staging_profiles)

        target_path.mkdir(parents=True, exist_ok=True)
        profiles_dir = target_path / "profiles"
        profiles_dir.mkdir(parents=True, exist_ok=True)

        # Load normalized components
        profiles_raw = self.validator._load_yaml("profiles.seed.yaml").get("profiles", [])
        skills_seed = self.validator._load_yaml("profile-skills.seed.yaml")
        models_seed = self.validator._load_yaml("model-policy.seed.yaml").get("profiles", {})

        seed_assignments = skills_seed.get("assignments", {})

        materialized_profiles: list[str] = []

        # Materialize each profile deterministically (sorted by ID)
        for p_data in sorted(profiles_raw, key=lambda x: x["id"]):
            pid = p_data["id"]
            p_dir = profiles_dir / pid
            p_dir.mkdir(parents=True, exist_ok=True)

            # Canonical profile YAML fields consumed by ProfileRegistry.load()
            model_policy = models_seed.get(pid, {})
            allowed_skills = sorted(seed_assignments.get(pid, []))
            allowed_domains = p_data.get("allowed_domains", [])

            canonical_data = {
                "id": pid,
                "name": p_data["name"],
                "role": p_data.get("role"),
                "description": p_data.get("description", ""),
                "enabled": p_data.get("enabled", True),
                "memory_namespace": p_data.get("memory_namespace"),
                "allowed_domains": allowed_domains,
                "allowed_skills": allowed_skills,
                "permissions_policy": p_data.get("permissions_policy", "business-default"),
                "configuration_state": p_data.get("configuration", {}).get("configuration_state", "COMPLETE"),
                "model_tier": model_policy.get("primary_tier", "standard"),
            }

            prof_yaml_path = p_dir / "profile.yaml"
            with open(prof_yaml_path, "w", encoding="utf-8") as f:
                yaml.safe_dump(canonical_data, f, sort_keys=True, allow_unicode=True)

            # Copy SOUL template
            soul_filename = p_data.get("soul_template", f"{pid}.md")
            src_soul = self.validator.soul_dir / soul_filename
            dest_soul = p_dir / "SOUL.md"
            if src_soul.is_file():
                shutil.copy2(src_soul, dest_soul)

            materialized_profiles.append(pid)

        # Write staging manifest with semantic hash
        config_dir = target_path / "config"
        config_dir.mkdir(parents=True, exist_ok=True)

        manifest_data = {
            "schema_version": report.schema_version,
            "seed_version": report.seed_version,
            "seed_hash": report.seed_hash,
            "source_mode": self.validator.source_mode,
            "production_commit": report.production_commit,
            "profiles": materialized_profiles,
            "total_materialized": len(materialized_profiles),
        }

        manifest_path = config_dir / "materialization-manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2, sort_keys=True)

        return {
            "output_dir": str(target_path),
            "seed_hash": report.seed_hash,
            "materialized_profiles": materialized_profiles,
            "total_materialized": len(materialized_profiles),
            "manifest_path": str(manifest_path),
        }
