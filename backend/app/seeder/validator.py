"""
Seed Validation Pipeline.
Implements complete validation across all dimensions:
1. Parse & Schema Validate
2. Profile Uniqueness & Slugs
3. Skill Resolution against effective SkillRegistry (RESOLVED, UNRESOLVED, DUPLICATE, DOMAIN_WARNING)
4. Domain Taxonomy Checks
5. Model Policy & Tier Validation
6. Channel Route Resolution
7. Workspace Governance & Sensitive Read-Only Enforcement
8. SOUL Template Mandatory Section & Secret Checks
9. Semantic Hash Generation (SHA-256)
10. Strict Source Mode & Fixture Contamination Guard (Prompt 14.1B Sections 50-55)
"""
import hashlib
import json
import logging
from pathlib import Path
import re
from typing import Any, Optional
import yaml

from app.seeder.models import (
    ChannelRoutesSeedFile,
    ModelPolicySeedFile,
    PresentationSeedFile,
    ProfileSkillSummary,
    ProfilesSeedFile,
    ProfileSkillsSeedFile,
    SchedulePolicySeedFile,
    SeedManifestFile,
    ValidationReport,
    WorkspacePolicySeedFile,
)

logger = logging.getLogger("sagara.mission_control.seeder.validator")

MANDATORY_SOUL_SECTIONS = [
    "Identity",
    "Mission",
    "Responsibilities",
    "Working Style",
    "Decision Boundaries",
    "Delegation Policy",
    "Tool/Skill Boundaries",
    "Approval Requirements",
    "Data Handling",
    "Memory Policy",
    "Escalation Policy",
    "Failure Behavior",
    "Prohibited Actions",
]

SECRET_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}", re.IGNORECASE),
    re.compile(r"ghp_[a-zA-Z0-9]{20,}", re.IGNORECASE),
    re.compile(r"Bearer\s+[a-zA-Z0-9_\-\.]{25,}", re.IGNORECASE),
    re.compile(r"client_secret[=:]\s*[\"']?[a-zA-Z0-9_\-]{16,}", re.IGNORECASE),
    re.compile(r"password[=:]\s*[\"']?[a-zA-Z0-9_\-]{8,}", re.IGNORECASE),
]

FORBIDDEN_FIXTURE_PROFILES = {
    "dyn-custom-98765",
    "incomplete-agent",
    "retired-bot",
}

FORBIDDEN_FIXTURE_SKILLS = {
    "skill-hermes-agent",
    "skill-systematic-debugging",
    "skill-google-workspace",
    "skill-baoyu-infographic",
    "skill-unreferenced-tool",
}

PRODUCTION_COMMIT = "bad9d7d2495685531c5e533d5a2e9f4a2674b6a5"


def compute_semantic_hash(data: Any) -> str:
    """Compute deterministic SHA-256 hash over normalized JSON representation."""
    canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


class SeedValidator:
    """Comprehensive, non-mutating validator for Sagara seed files."""

    def __init__(
        self,
        seed_dir: Optional[Path | str] = None,
        soul_dir: Optional[Path | str] = None,
        project_root: Optional[Path | str] = None,
        skill_registry: Any = None,
        source_mode: str = "production-readonly",
    ) -> None:
        self.source_mode = source_mode

        # Resolve seed_dir across candidate locations
        target_seed = Path(seed_dir) if seed_dir else Path("config/seeds")
        seed_candidates = [
            target_seed,
            Path.cwd() / target_seed,
            Path.cwd().parent / target_seed,
            Path(__file__).parent.parent.parent.parent / "config" / "seeds",
            Path(__file__).parent.parent.parent.parent / "sagara-mission-control" / "config" / "seeds",
        ]
        self.seed_dir = next((c.resolve() for c in seed_candidates if (c / "seed-manifest.yaml").is_file()), target_seed.resolve())

        # Resolve soul_dir across candidate locations
        if soul_dir:
            self.soul_dir = Path(soul_dir).resolve()
        else:
            soul_candidates = [
                self.seed_dir.parent.parent / "profiles" / "templates" / "soul",
                self.seed_dir.parent / "profiles" / "templates" / "soul",
                Path.cwd() / "profiles" / "templates" / "soul",
                Path.cwd().parent / "profiles" / "templates" / "soul",
                Path(__file__).parent.parent.parent.parent / "profiles" / "templates" / "soul",
                Path(__file__).parent.parent.parent.parent / "sagara-mission-control" / "profiles" / "templates" / "soul",
            ]
            self.soul_dir = next((c.resolve() for c in soul_candidates if c.is_dir()), soul_candidates[0].resolve())

        self.project_root = Path(project_root).resolve() if project_root else None
        self._external_skill_registry = skill_registry

    def _load_yaml(self, filename: str) -> dict[str, Any]:
        filepath = self.seed_dir / filename
        if not filepath.is_file():
            raise FileNotFoundError(f"Required seed file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data or {}

    def _resolve_skill_registry(self) -> dict[str, Any]:
        """
        Load registered skills according to source_mode.
        Returns mapping of skill_id -> skill metadata dictionary.
        """
        if self._external_skill_registry is not None:
            if hasattr(self._external_skill_registry, "all"):
                items = self._external_skill_registry.all()
                res = {}
                for s in items:
                    sid = getattr(s, "id", None) or s.get("id")
                    cat = getattr(s, "category", None) or getattr(s, "domain", None) or s.get("category") or s.get("domain", "general")
                    res[str(sid)] = {"id": str(sid), "category": str(cat)}
                return res
            elif isinstance(self._external_skill_registry, dict):
                return self._external_skill_registry

        if self.source_mode == "production-readonly":
            # 1. Check local production snapshot file
            snapshot_path = Path(__file__).parent / "production_snapshot.json"
            if snapshot_path.is_file():
                try:
                    with open(snapshot_path, "r", encoding="utf-8") as f:
                        snap_data = json.load(f)
                    skills_dict = snap_data.get("skills", {})
                    res = {}
                    for sid, sinfo in skills_dict.items():
                        res[str(sid)] = {
                            "id": str(sid),
                            "category": str(sinfo.get("domain", "general")),
                            "side_effect_level": str(sinfo.get("side_effect_level", "read")),
                        }
                    return res
                except Exception as e:
                    logger.warning(f"Failed to read production snapshot: {e}")

            # 2. Check project root if provided and production-structured
            if self.project_root:
                skills_yaml = self.project_root / "config" / "skills.yaml"
                if skills_yaml.is_file():
                    try:
                        with open(skills_yaml, "r", encoding="utf-8") as f:
                            data = yaml.safe_load(f) or {}
                        skills_raw = data.get("skills", {})
                        if isinstance(skills_raw, dict) and len(skills_raw) > 10:
                            res = {}
                            for sid, item in skills_raw.items():
                                res[str(sid)] = {
                                    "id": str(sid),
                                    "category": str(item.get("domain") or item.get("category") or "general"),
                                    "side_effect_level": str(item.get("side_effect_level", "read")),
                                }
                            return res
                    except Exception as e:
                        logger.warning(f"Failed to read skills from project root skills.yaml: {e}")

            # FAIL CLOSED: Do not fall back to fixture in production-readonly mode!
            raise RuntimeError(
                "PRODUCTION_REGISTRY_UNAVAILABLE: Canonical production SkillRegistry could not be loaded "
                "in production-readonly mode. Silent fallback to fixtures is prohibited."
            )

        elif self.source_mode == "fixture":
            # Check standard fixture locations
            fixture_skills = Path(__file__).parent.parent.parent / "tests" / "fixtures" / "sagara_project" / "config" / "skills.yaml"
            if fixture_skills.is_file():
                try:
                    with open(fixture_skills, "r", encoding="utf-8") as f:
                        data = yaml.safe_load(f) or {}
                    skills_list = data.get("skills", [])
                    res = {}
                    for item in skills_list:
                        sid = item.get("id")
                        if sid:
                            res[str(sid)] = {
                                "id": str(sid),
                                "category": str(item.get("category") or item.get("domain") or "general"),
                            }
                    return res
                except Exception as e:
                    logger.warning(f"Failed to read fallback fixture skills: {e}")

        return {}

    def validate(self) -> ValidationReport:
        errors: list[str] = []
        warnings: list[str] = []
        normalized_contents: dict[str, Any] = {}

        # 1. Manifest Validation
        try:
            raw_manifest = self._load_yaml("seed-manifest.yaml")
            manifest = SeedManifestFile(**raw_manifest)
            normalized_contents["manifest"] = manifest.model_dump()
        except Exception as e:
            errors.append(f"Failed to parse seed-manifest.yaml: {e}")
            return ValidationReport(
                is_valid=False,
                errors=errors,
                warnings=warnings,
                source_mode=self.source_mode,
            )

        # 2. Profiles Seed
        profile_map: dict[str, Any] = {}
        try:
            raw_profiles = self._load_yaml(manifest.components.get("profiles", "profiles.seed.yaml"))
            profiles_seed = ProfilesSeedFile(**raw_profiles)
            normalized_contents["profiles"] = profiles_seed.model_dump()

            seen_ids = set()
            for p in profiles_seed.profiles:
                if p.id in seen_ids:
                    errors.append(f"Duplicate profile ID found in profiles seed: '{p.id}'")
                seen_ids.add(p.id)

                # Fixture Contamination Guard (Prompt 14.1B Section 50)
                if self.source_mode == "production-readonly" and p.id in FORBIDDEN_FIXTURE_PROFILES:
                    errors.append(
                        f"FIXTURE CONTAMINATION: Profile ID '{p.id}' is a known fixture/test entity "
                        "and must not exist in production blueprint."
                    )

                if not re.match(r"^[a-z0-9][a-z0-9_\-]*$", p.id):
                    errors.append(f"Invalid slug format for profile ID: '{p.id}'")

                if not p.role or not p.role.strip():
                    errors.append(f"Profile '{p.id}' is missing required role description.")

                if not p.memory_namespace:
                    errors.append(f"Profile '{p.id}' is missing required memory namespace.")

                profile_map[p.id] = p
        except Exception as e:
            errors.append(f"Profiles seed validation failure: {e}")

        # 3. Profile Skills Seed & Registry Cross-Reference
        skill_catalog = self._resolve_skill_registry()
        skill_summaries: dict[str, ProfileSkillSummary] = {}
        capability_gaps_count = 0

        try:
            raw_skills = self._load_yaml(manifest.components.get("profile_skills", "profile-skills.seed.yaml"))
            skills_seed = ProfileSkillsSeedFile(**raw_skills)
            normalized_contents["profile_skills"] = skills_seed.model_dump()

            for pid, caps in skills_seed.proposed_capabilities.items():
                capability_gaps_count += len(caps)

            for pid in profile_map.keys():
                assigned = skills_seed.assignments.get(pid, [])
                allowed_domains = skills_seed.profile_domains.get(pid, [])
                seen_skills = set()
                unresolved = []
                domain_warns = []
                to_add = []

                for sid in assigned:
                    # Fixture Skill Guard (Prompt 14.1B Section 51)
                    if self.source_mode == "production-readonly" and sid in FORBIDDEN_FIXTURE_SKILLS:
                        errors.append(
                            f"FIXTURE SKILL CONTAMINATION: Skill ID '{sid}' on profile '{pid}' is a synthetic fixture entity."
                        )

                    if sid in seen_skills:
                        warnings.append(f"Duplicate skill assignment '{sid}' on profile '{pid}' (DUPLICATE).")
                    seen_skills.add(sid)

                    if skill_catalog:
                        if sid not in skill_catalog:
                            unresolved.append(sid)
                            errors.append(f"Active skill assignment '{sid}' on profile '{pid}' is UNRESOLVED in canonical SkillRegistry.")
                        else:
                            sk_cat = skill_catalog[sid]["category"]
                            if allowed_domains and sk_cat not in allowed_domains and "general" not in allowed_domains:
                                domain_warns.append(sid)
                                warnings.append(
                                    f"Domain mismatch for skill '{sid}' (domain '{sk_cat}') on profile '{pid}' (DOMAIN_WARNING)."
                                )
                    to_add.append(sid)

                summary = ProfileSkillSummary(
                    profile_id=pid,
                    current_count=len(assigned),
                    recommended_count=len(assigned),
                    add_count=0,
                    remove_count=0,
                    unresolved_count=len(unresolved),
                    domain_warning_count=len(domain_warns),
                    skills_to_add=[],
                    skills_to_remove=[],
                    warnings=[f"UNRESOLVED: {s}" for s in unresolved] + [f"DOMAIN_MISMATCH: {s}" for s in domain_warns],
                )
                skill_summaries[pid] = summary

        except Exception as e:
            errors.append(f"Profile skills seed validation failure: {e}")

        # 4. Model Policy Seed
        try:
            raw_models = self._load_yaml(manifest.components.get("model_policy", "model-policy.seed.yaml"))
            models_seed = ModelPolicySeedFile(**raw_models)
            normalized_contents["model_policy"] = models_seed.model_dump()

            for pid, policy in models_seed.profiles.items():
                if pid not in profile_map:
                    errors.append(f"Model policy references unknown profile ID: '{pid}'")
                if policy.primary_tier not in models_seed.supported_tiers:
                    errors.append(f"Model policy for '{pid}' specifies unrecognized primary tier '{policy.primary_tier}'")
                if policy.fallback_tier and policy.fallback_tier not in models_seed.supported_tiers:
                    errors.append(f"Model policy for '{pid}' specifies unrecognized fallback tier '{policy.fallback_tier}'")
        except Exception as e:
            errors.append(f"Model policy seed validation failure: {e}")

        # 5. Channel Routes Seed
        channel_routes_count = 0
        try:
            raw_channels = self._load_yaml(manifest.components.get("channel_routes", "channel-routes.seed.yaml"))
            channels_seed = ChannelRoutesSeedFile(**raw_channels)
            normalized_contents["channel_routes"] = channels_seed.model_dump()
            channel_routes_count = len(channels_seed.routes)

            seen_channels: dict[str, str] = {}
            for route in channels_seed.routes:
                if route.target_profile not in profile_map:
                    errors.append(f"Channel '{route.channel_name}' routes to unknown profile ID '{route.target_profile}'")

                # Channel name duplicate check
                if route.channel_name in seen_channels:
                    existing_target = seen_channels[route.channel_name]
                    if existing_target != route.target_profile:
                        errors.append(
                            f"Channel conflict: '{route.channel_name}' routes to both '{existing_target}' and '{route.target_profile}'"
                        )
                else:
                    seen_channels[route.channel_name] = route.target_profile

            if channels_seed.telegram.default_route_target not in profile_map:
                errors.append(f"Telegram default route target '{channels_seed.telegram.default_route_target}' is not a valid profile.")
        except Exception as e:
            errors.append(f"Channel routes seed validation failure: {e}")

        # 6. Workspace Policy Seed
        workspace_resources_count = 0
        try:
            raw_workspaces = self._load_yaml(manifest.components.get("workspace_policy", "workspace-policy.seed.yaml"))
            workspaces_seed = WorkspacePolicySeedFile(**raw_workspaces)
            normalized_contents["workspace_policy"] = workspaces_seed.model_dump()
            workspace_resources_count = len(workspaces_seed.resources)

            for res in workspaces_seed.resources:
                for pid, mode in res.permissions.items():
                    if pid not in profile_map:
                        errors.append(f"Workspace resource '{res.resource_id}' references unknown profile '{pid}'")
                    if mode not in workspaces_seed.valid_modes:
                        errors.append(
                            f"Workspace resource '{res.resource_id}' specifies invalid permission mode '{mode}' for profile '{pid}'"
                        )
                    if res.is_sensitive_read_only and mode not in ["READ_ONLY", "NO_ACCESS"]:
                        errors.append(
                            f"Sensitive read-only resource '{res.resource_id}' violated: profile '{pid}' assigned '{mode}'"
                        )
        except Exception as e:
            errors.append(f"Workspace policy seed validation failure: {e}")

        # 7. Schedule Policy Seed
        try:
            raw_schedules = self._load_yaml(manifest.components.get("schedule_policy", "schedule-policy.seed.yaml"))
            schedules_seed = SchedulePolicySeedFile(**raw_schedules)
            normalized_contents["schedule_policy"] = schedules_seed.model_dump()

            for pid, sched in schedules_seed.policies.items():
                if pid not in profile_map:
                    errors.append(f"Schedule policy references unknown profile '{pid}'")
                for st in sched.allowed_schedule_types:
                    if st not in schedules_seed.supported_schedule_types:
                        errors.append(f"Profile '{pid}' references unrecognized schedule type '{st}'")
        except Exception as e:
            errors.append(f"Schedule policy seed validation failure: {e}")

        # 8. Presentation Seed
        try:
            raw_pres = self._load_yaml(manifest.components.get("presentation", "presentation.seed.yaml"))
            pres_seed = PresentationSeedFile(**raw_pres)
            normalized_contents["presentation"] = pres_seed.model_dump()

            for item in pres_seed.profiles:
                if item.id not in profile_map:
                    errors.append(f"Presentation metadata references unknown profile ID: '{item.id}'")
        except Exception as e:
            errors.append(f"Presentation seed validation failure: {e}")

        # 9. SOUL Template Validation
        valid_soul_count = 0
        legacy_names = {"sagara-dev", "sagara-scout"}
        for pid, p in profile_map.items():
            template_name = p.soul_template
            template_path = self.soul_dir / template_name
            if not template_path.is_file():
                errors.append(f"SOUL template file '{template_name}' for profile '{pid}' not found at '{template_path}'")
                continue

            valid_soul_count += 1
            try:
                content = template_path.read_text(encoding="utf-8")
                # Section check
                for sec in MANDATORY_SOUL_SECTIONS:
                    header_pattern = re.compile(rf"^##\s+{re.escape(sec)}\b", re.MULTILINE)
                    if not header_pattern.search(content):
                        errors.append(f"SOUL template '{template_name}' is missing mandatory section: '## {sec}'")

                # Secret pattern check
                for pat in SECRET_PATTERNS:
                    match = pat.search(content)
                    if match:
                        errors.append(f"CRITICAL: Potential secret credential detected in SOUL template '{template_name}': '{match.group(0)[:8]}...'")

                # Legacy profile references check (Prompt 14.1B Section 27)
                for leg in legacy_names:
                    if leg in content:
                        errors.append(f"Legacy profile name '{leg}' referenced in SOUL template '{template_name}'.")

            except Exception as e:
                errors.append(f"Error reading SOUL template '{template_name}': {e}")

        # Compute deterministic semantic hash over normalized seed contents
        seed_hash = compute_semantic_hash(normalized_contents)

        return ValidationReport(
            is_valid=len(errors) == 0,
            schema_version=manifest.schema_version,
            seed_version=manifest.seed_version,
            seed_hash=seed_hash,
            source_mode=self.source_mode,
            production_commit=PRODUCTION_COMMIT if self.source_mode == "production-readonly" else "FIXTURE",
            profile_ids=sorted(list(profile_map.keys())),
            skill_summaries=skill_summaries,
            errors=errors,
            warnings=warnings,
            total_profiles=len(profile_map),
            total_routes=channel_routes_count,
            total_resources=workspace_resources_count,
            total_soul_templates=valid_soul_count,
            effective_skill_count=len(skill_catalog),
            capability_gaps_count=capability_gaps_count,
        )
