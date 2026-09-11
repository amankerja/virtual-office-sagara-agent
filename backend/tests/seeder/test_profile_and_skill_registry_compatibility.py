"""
Tests for Canonical ProfileRegistry and SkillRegistry Compatibility (Prompt 14.1 Section 117-119).
Validates that materialized output loads directly into core.registry.profile.ProfileRegistry,
skills resolve against SkillRegistry, arbitrary profiles work dynamically, and no second registry is created.
"""
from pathlib import Path
import sys
import tempfile
import pytest
import yaml

from app.seeder.materializer import SeedMaterializer
from app.seeder.validator import SeedValidator

FIXTURE_ROOT = Path(__file__).parent.parent / "fixtures" / "sagara_project"
sys.path.insert(0, str(FIXTURE_ROOT))

from core.registry.profile import ProfileRegistry, ProfileDefinition
from core.registry.skill import SkillRegistry


def test_materialized_profiles_load_cleanly_into_canonical_profile_registry():
    """Section 117: All generated profiles load successfully into ProfileRegistry.load()."""
    materializer = SeedMaterializer()

    with tempfile.TemporaryDirectory() as tmp_dir:
        staging_dir = Path(tmp_dir) / "staging"
        res = materializer.materialize(staging_dir)

        assert res["total_materialized"] == 8

        # Ingest directly using canonical Sagara ProfileRegistry
        registry = ProfileRegistry.load(staging_dir)
        profiles = registry.all()

        assert len(profiles) == 8
        by_id = {p.id: p for p in profiles}

        # Verify all 8 profiles exist with exact fields
        assert "lead" in by_id
        assert by_id["lead"].name == "Lead Coordinator"
        assert by_id["lead"].role == "Lead Agent / AI Team Manager"
        assert by_id["lead"].model_tier == "flagship"
        assert "skill-hermes-agent" in by_id["lead"].allowed_skills
        assert "skill-systematic-debugging" in by_id["lead"].allowed_skills

        assert "personal" in by_id
        assert by_id["personal"].name == "Personal Assistant"
        assert by_id["personal"].role == "Personal Assistant / Secretary"
        assert by_id["personal"].model_tier == "balanced"
        assert by_id["personal"].allowed_skills == ["skill-google-workspace"]

        assert "business" in by_id
        assert by_id["business"].model_tier == "flagship"

        assert "marketing" in by_id
        assert by_id["marketing"].model_tier == "balanced"
        assert by_id["marketing"].allowed_skills == ["skill-baoyu-infographic"]

        assert "cs" in by_id
        assert by_id["cs"].model_tier == "fast"

        assert "it-support" in by_id
        assert by_id["it-support"].model_tier == "balanced"

        assert "it-coding" in by_id
        assert by_id["it-coding"].model_tier == "coding"

        assert "sagara-lab" in by_id
        assert by_id["sagara-lab"].model_tier == "research"


def test_recommended_skills_resolve_against_canonical_skill_registry():
    """Section 118: All final recommended assignments resolve against fixture/current catalog."""
    skill_registry = SkillRegistry.load(FIXTURE_ROOT)
    registered_ids = set(skill_registry.ids())

    # Ensure fixture registry has the canonical skills
    assert len(registered_ids) == 5

    validator = SeedValidator(skill_registry=skill_registry)
    report = validator.validate()

    assert report.is_valid is True

    # Check each profile's skill summary: all assigned skills must be resolved
    for pid, summary in report.skill_summaries.items():
        assert summary.unresolved_count == 0, f"Profile '{pid}' has unresolved skills: {summary.warnings}"
        assert summary.domain_warning_count == 0, f"Profile '{pid}' has domain warnings: {summary.warnings}"


def test_arbitrary_profile_test_dynamic_support():
    """Section 91: Synthetic profile-x9-random supported dynamically without code changes."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        canonical_seed_dir = SeedValidator().seed_dir
        for f in canonical_seed_dir.glob("*.yaml"):
            (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

        # Inject arbitrary profile into seed
        profiles_data = yaml.safe_load((tmp_path / "profiles.seed.yaml").read_text(encoding="utf-8"))
        arbitrary_item = {
            "id": "profile-x9-random",
            "name": "Experimental Agent X9",
            "role": "Autonomous Exploration Specialist",
            "description": "Dynamic testing profile",
            "enabled": True,
            "memory_namespace": "profile:x9-random",
            "soul_template": "lead.md",  # reuse valid template
            "delegation": {"can_delegate": False, "allowed_targets": []},
            "configuration": {"risk_tier": "LOW", "approval_class": "STANDARD", "configuration_state": "COMPLETE"},
        }
        profiles_data["profiles"].append(arbitrary_item)
        (tmp_path / "profiles.seed.yaml").write_text(yaml.safe_dump(profiles_data), encoding="utf-8")

        # Materialize
        staging_dir = tmp_path / "staging"
        materializer = SeedMaterializer(seed_dir=tmp_path)
        res = materializer.materialize(staging_dir)

        assert res["total_materialized"] == 9
        assert "profile-x9-random" in res["materialized_profiles"]

        # Canonical registry loads arbitrary profile without issues
        registry = ProfileRegistry.load(staging_dir)
        p = registry.get("profile-x9-random")
        assert p is not None
        assert p.id == "profile-x9-random"
        assert p.name == "Experimental Agent X9"


def test_no_second_registry_created():
    """Section 119: Static check ensures no alternate/second registry classes are introduced."""
    forbidden_class_names = [
        "SeedProfileRegistry",
        "MissionControlProfileRegistry",
        "SeederSkillRegistry",
        "SeederProfileRegistry",
    ]

    import app.seeder
    for attr in dir(app.seeder):
        assert attr not in forbidden_class_names, f"Forbidden second registry found in app.seeder: {attr}"

    import app.seeder.models
    for attr in dir(app.seeder.models):
        assert attr not in forbidden_class_names, f"Forbidden second registry found in app.seeder.models: {attr}"

    import app.seeder.validator
    for attr in dir(app.seeder.validator):
        assert attr not in forbidden_class_names, f"Forbidden second registry found in app.seeder.validator: {attr}"
