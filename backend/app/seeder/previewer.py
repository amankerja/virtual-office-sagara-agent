"""
Seed Preview Engine.
Performs strictly read-only comparison between current canonical configuration
and recommended seed specifications.
Produces idempotent previews categorized into:
- UNCHANGED / MATCH
- WOULD_CREATE
- WOULD_UPDATE
- WOULD_REMOVE
- CONFLICT
- UNRESOLVED
- WARNING
Strictly prevents fixture profiles from leaking into production preview (Prompt 14.1B Section 50).
"""
import json
import logging
from pathlib import Path
from typing import Any, Optional

from app.seeder.models import (
    PreviewReport,
    ProfilePreviewItem,
)
from app.seeder.validator import (
    FORBIDDEN_FIXTURE_PROFILES,
    FORBIDDEN_FIXTURE_SKILLS,
    PRODUCTION_COMMIT,
    SeedValidator,
)

logger = logging.getLogger("sagara.mission_control.seeder.previewer")


class SeedPreviewer:
    """Computes non-mutating preview diffs against canonical registry state."""

    def __init__(
        self,
        validator: Optional[SeedValidator] = None,
        seed_dir: Optional[Path | str] = None,
        soul_dir: Optional[Path | str] = None,
        project_root: Optional[Path | str] = None,
        profile_registry: Any = None,
        skill_registry: Any = None,
        source_mode: str = "production-readonly",
    ) -> None:
        self.validator = validator or SeedValidator(
            seed_dir=seed_dir,
            soul_dir=soul_dir,
            project_root=project_root,
            skill_registry=skill_registry,
            source_mode=source_mode,
        )
        self._external_profile_registry = profile_registry

    def _load_current_profiles(self) -> dict[str, Any]:
        """Load current canonical profiles in read-only mode."""
        if self._external_profile_registry is not None:
            if hasattr(self._external_profile_registry, "all"):
                items = self._external_profile_registry.all()
                res = {}
                for p in items:
                    pid = getattr(p, "id", None) or p.get("id")
                    res[str(pid)] = p
                return res
            elif isinstance(self._external_profile_registry, dict):
                return self._external_profile_registry

        if self.validator.source_mode == "production-readonly":
            # 1. Load from verified production snapshot
            snapshot_path = Path(__file__).parent / "production_snapshot.json"
            if snapshot_path.is_file():
                try:
                    with open(snapshot_path, "r", encoding="utf-8") as f:
                        snap_data = json.load(f)
                    profiles_dict = snap_data.get("profiles", {})
                    # Ensure no fixture profiles exist in snapshot
                    for f_id in FORBIDDEN_FIXTURE_PROFILES:
                        if f_id in profiles_dict:
                            raise RuntimeError(f"FIXTURE CONTAMINATION: Found fixture profile '{f_id}' in production snapshot!")
                    return profiles_dict
                except Exception as e:
                    logger.warning(f"Failed to read production snapshot profiles: {e}")

            # 2. Check project root if provided
            root = self.validator.project_root
            if root:
                try:
                    from core.registry.profile import ProfileRegistry
                    reg = ProfileRegistry.load(root / "profiles" if (root / "profiles").is_dir() else root)
                    profiles = {p.id: p for p in reg.all()}
                    for f_id in FORBIDDEN_FIXTURE_PROFILES:
                        if f_id in profiles:
                            raise RuntimeError(f"FIXTURE CONTAMINATION: Found fixture profile '{f_id}' in project root profiles!")
                    return profiles
                except Exception as e:
                    logger.warning(f"Could not load canonical ProfileRegistry from project root: {e}")

            # Fail closed in production mode
            raise RuntimeError(
                "PRODUCTION_REGISTRY_UNAVAILABLE: Canonical production ProfileRegistry could not be loaded "
                "in production-readonly mode. Silent fallback to fixtures is prohibited."
            )

        elif self.validator.source_mode == "fixture":
            # Fallback check standard fixture locations
            fixture_root = Path(__file__).parent.parent.parent / "tests" / "fixtures" / "sagara_project"
            if fixture_root.is_dir() and (fixture_root / "profiles").is_dir():
                try:
                    import sys
                    root_str = str(fixture_root)
                    if root_str not in sys.path:
                        sys.path.insert(0, root_str)
                    from core.registry.profile import ProfileRegistry
                    reg = ProfileRegistry.load(fixture_root)
                    return {p.id: p for p in reg.all()}
                except Exception as e:
                    logger.warning(f"Could not load fallback fixture ProfileRegistry: {e}")

        return {}

    def generate_preview(self) -> PreviewReport:
        validation_report = self.validator.validate()
        if not validation_report.is_valid:
            return PreviewReport(
                seed_id="invalid",
                seed_version=validation_report.seed_version,
                seed_hash=validation_report.seed_hash,
                source_mode=self.validator.source_mode,
                warnings=validation_report.errors,
            )

        # Load seed specifications
        profiles_raw = self.validator._load_yaml("profiles.seed.yaml").get("profiles", [])
        skills_seed = self.validator._load_yaml("profile-skills.seed.yaml")
        models_seed = self.validator._load_yaml("model-policy.seed.yaml").get("profiles", {})
        channels_seed = self.validator._load_yaml("channel-routes.seed.yaml").get("routes", [])
        workspaces_seed = self.validator._load_yaml("workspace-policy.seed.yaml").get("resources", [])

        seed_assignments = skills_seed.get("assignments", {})
        seed_domains = skills_seed.get("profile_domains", {})

        current_profiles = self._load_current_profiles()
        registered_skills = self.validator._resolve_skill_registry()

        preview_items: list[ProfilePreviewItem] = []
        seed_pids = set()

        total_would_create = 0
        total_would_update = 0
        total_would_remove = 0
        total_unchanged = 0

        # Process seed profiles (sorted deterministically)
        for p_data in sorted(profiles_raw, key=lambda x: x["id"]):
            pid = p_data["id"]
            seed_pids.add(pid)
            recommended_role = p_data.get("role")
            rec_skills = sorted(seed_assignments.get(pid, []))

            # Channel routing
            routes = [
                r["channel_name"] for r in channels_seed if r.get("target_profile") == pid
            ]

            # Workspace resources summary
            wp_resources = [
                f"{r['resource_id']}:{r['permissions'][pid]}"
                for r in workspaces_seed
                if pid in r.get("permissions", {})
            ]
            wp_str = ", ".join(wp_resources) if wp_resources else "DEFAULT_DENY"

            # Model policy
            m_pol = models_seed.get(pid, {})
            model_str = f"primary={m_pol.get('primary_tier', 'unknown')}, fallback={m_pol.get('fallback_tier', 'none')}"

            # SOUL template check
            template_path = self.validator.soul_dir / p_data.get("soul_template", f"{pid}.md")
            soul_status = "CUSTOM_TEMPLATE" if template_path.is_file() else "MISSING"

            # Skill diff & checks
            cur_p = current_profiles.get(pid)
            if cur_p:
                cur_role = getattr(cur_p, "role", None) or (cur_p.get("role") if isinstance(cur_p, dict) else None)
                cur_skills_raw = getattr(cur_p, "allowed_skills", []) or (cur_p.get("allowed_skills") if isinstance(cur_p, dict) else []) or []
                cur_skills = sorted(cur_skills_raw)
            else:
                cur_role = None
                cur_skills = []

            skills_to_add = [s for s in rec_skills if s not in cur_skills]
            skills_to_remove = [s for s in cur_skills if s not in rec_skills]

            unresolved = [s for s in rec_skills if s not in registered_skills] if registered_skills else []
            domain_warns = []
            allowed_doms = seed_domains.get(pid, [])
            for s in rec_skills:
                if s in registered_skills and allowed_doms:
                    cat = registered_skills[s]["category"]
                    if cat not in allowed_doms and "general" not in allowed_doms:
                        domain_warns.append(s)

            item_warnings = []
            if unresolved:
                item_warnings.append(f"UNRESOLVED_SKILLS: {unresolved}")
            if domain_warns:
                item_warnings.append(f"DOMAIN_WARNINGS: {domain_warns}")

            # Categorize profile action
            if not cur_p:
                action = "WOULD_CREATE"
                total_would_create += 1
            else:
                # Compare fields: if role, enabled, and skills match, it is UNCHANGED (MATCH)
                role_diff = cur_role != recommended_role
                skills_diff = cur_skills != rec_skills

                if role_diff or skills_diff:
                    action = "WOULD_UPDATE"
                    total_would_update += 1
                else:
                    action = "UNCHANGED"
                    total_unchanged += 1

            preview_items.append(
                ProfilePreviewItem(
                    profile_id=pid,
                    action=action,
                    current_role=cur_role,
                    recommended_role=recommended_role,
                    current_skills=cur_skills,
                    recommended_skills=rec_skills,
                    skills_to_add=skills_to_add,
                    skills_to_remove=skills_to_remove,
                    unresolved_skills=unresolved,
                    domain_warnings=domain_warns,
                    soul_status=soul_status,
                    model_policy=model_str,
                    channel_routes=sorted(routes),
                    workspace_policy=wp_str,
                    warnings=item_warnings,
                )
            )

        # Check for profiles in current registry that are NOT in seed
        for pid, cur_p in sorted(current_profiles.items()):
            if pid not in seed_pids:
                # In production-readonly mode, fixture entities must NEVER appear
                if self.validator.source_mode == "production-readonly" and pid in FORBIDDEN_FIXTURE_PROFILES:
                    continue

                cur_role = getattr(cur_p, "role", None) or (cur_p.get("role") if isinstance(cur_p, dict) else None)
                cur_skills = getattr(cur_p, "allowed_skills", []) or (cur_p.get("allowed_skills") if isinstance(cur_p, dict) else []) or []
                total_would_remove += 1
                preview_items.append(
                    ProfilePreviewItem(
                        profile_id=pid,
                        action="WOULD_REMOVE",
                        current_role=cur_role,
                        recommended_role=None,
                        current_skills=cur_skills,
                        recommended_skills=[],
                        skills_to_add=[],
                        skills_to_remove=cur_skills,
                        unresolved_skills=[],
                        domain_warnings=[],
                        soul_status="NOT_IN_BLUEPRINT",
                        model_policy=None,
                        channel_routes=[],
                        workspace_policy="DECOMMISSIONED",
                        warnings=[f"Profile '{pid}' is in canonical registry but omitted from blueprint."],
                    )
                )

        return PreviewReport(
            seed_id=validation_report.schema_version,
            seed_version=validation_report.seed_version,
            seed_hash=validation_report.seed_hash,
            source_mode=self.validator.source_mode,
            production_commit=PRODUCTION_COMMIT if self.validator.source_mode == "production-readonly" else "FIXTURE",
            profiles=preview_items,
            total_would_create=total_would_create,
            total_would_update=total_would_update,
            total_would_remove=total_would_remove,
            total_unchanged=total_unchanged,
            warnings=validation_report.warnings,
        )
