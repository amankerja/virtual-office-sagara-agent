"""
Tests for Canonical ProfileRegistry and SkillRegistry Compatibility (Prompt 14.1 & 14.1B).
Validates that materialized output loads directly into core.registry.profile.ProfileRegistry,
skills resolve against production SkillRegistry (73 skills), arbitrary profiles work dynamically,
and fixture contamination guards strictly protect production freeze.
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
    """Prompt 14.1B: All 8 generated profiles load successfully into ProfileRegistry.load()."""
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

        # Verify all 8 profiles exist with reconciled canonical fields
        assert "lead" in by_id
        assert by_id["lead"].name == "Lead Manager Agent"
        assert by_id["lead"].role == "lead"
        assert by_id["lead"].model_tier == "flagship"
        assert "hermes-agent" in by_id["lead"].allowed_skills
        assert "systematic-debugging" in by_id["lead"].allowed_skills

        assert "personal" in by_id
        assert by_id["personal"].name == "Personal Assistant Agent"
        assert by_id["personal"].role == "personal"
        assert by_id["personal"].model_tier == "balanced"
        assert "google-workspace" in by_id["personal"].allowed_skills

        assert "business" in by_id
        assert by_id["business"].model_tier == "flagship"
        assert "xlsx" in by_id["business"].allowed_skills

        assert "marketing" in by_id
        assert by_id["marketing"].model_tier == "balanced"
        assert "baoyu-infographic" in by_id["marketing"].allowed_skills

        assert "cs" in by_id
        assert by_id["cs"].model_tier == "fast"
        assert "docx" in by_id["cs"].allowed_skills

        assert "it-support" in by_id
        assert by_id["it-support"].model_tier == "balanced"
        assert "codebase-inspection" in by_id["it-support"].allowed_skills

        assert "it-coding" in by_id
        assert by_id["it-coding"].model_tier == "coding"
        assert "github" in by_id["it-coding"].allowed_skills

        assert "sagara-lab" in by_id
        assert by_id["sagara-lab"].model_tier == "research"
        assert "arxiv" in by_id["sagara-lab"].allowed_skills


def test_recommended_skills_resolve_against_production_skill_registry():
    """Prompt 14.1B Section 9 & 11: All active assignments resolve against 73 production skills."""
    validator = SeedValidator(source_mode="production-readonly")
    report = validator.validate()

    assert report.is_valid is True, f"Validation errors: {report.errors}"
    assert report.effective_skill_count == 73
    assert report.capability_gaps_count == 10

    # Check each profile's skill summary: all active assigned skills must be resolved (0 unresolved)
    for pid, summary in report.skill_summaries.items():
        assert summary.unresolved_count == 0, f"Profile '{pid}' has unresolved skills: {summary.warnings}"


def test_arbitrary_profile_test_dynamic_support():
    """Prompt 14.1B Section 48: Synthetic profile-x9-random supported dynamically."""
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
            "allowed_domains": ["general"],
            "permissions_policy": "standard-default",
            "delegation": {"can_delegate": False, "allowed_targets": []},
            "configuration": {"risk_tier": "LOW", "approval_class": "STANDARD", "configuration_state": "COMPLETE"},
        }
        profiles_data["profiles"].append(arbitrary_item)
        (tmp_path / "profiles.seed.yaml").write_text(yaml.safe_dump(profiles_data), encoding="utf-8")

        # Materialize (proving extensibility without code change)
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
    """Prompt 14.1 Section 119: Static check ensures no alternate/second registry classes are introduced."""
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


# ---------------------------------------------------------------------------
# Prompt 14.1B Specific Regression & Freeze Safety Tests (Section 63)
# ---------------------------------------------------------------------------

def test_production_source_no_mock_fallback_fails_closed(monkeypatch):
    """Prompt 14.1B Section 53: If production registry cannot be read, fail closed without falling back."""
    validator = SeedValidator(source_mode="production-readonly")
    monkeypatch.setattr(
        "app.seeder.validator.Path.is_file",
        lambda self: False if "production_snapshot.json" in str(self) else Path.is_file(self)
    )
    with pytest.raises(RuntimeError, match="PRODUCTION_REGISTRY_UNAVAILABLE"):
        validator._resolve_skill_registry()


def test_fixture_contamination_guard_rejects_synthetic_profiles():
    """Prompt 14.1B Section 50: Synthetic profile IDs cannot appear in production blueprint."""
    for fixture_id in ["dyn-custom-98765", "incomplete-agent", "retired-bot"]:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            canonical_seed_dir = SeedValidator().seed_dir
            for f in canonical_seed_dir.glob("*.yaml"):
                (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

            profiles_data = yaml.safe_load((tmp_path / "profiles.seed.yaml").read_text(encoding="utf-8"))
            profiles_data["profiles"].append({
                "id": fixture_id,
                "name": f"Fake {fixture_id}",
                "role": "testing",
                "memory_namespace": f"profile:{fixture_id}",
                "soul_template": "lead.md",
            })
            (tmp_path / "profiles.seed.yaml").write_text(yaml.safe_dump(profiles_data), encoding="utf-8")

            validator = SeedValidator(seed_dir=tmp_path, source_mode="production-readonly")
            report = validator.validate()
            assert report.is_valid is False
            assert any("FIXTURE CONTAMINATION" in err for err in report.errors)


def test_fixture_skill_guard_rejects_synthetic_skills():
    """Prompt 14.1B Section 51: Synthetic fixture skill IDs cannot appear in production active assignments."""
    for fixture_skill in ["skill-hermes-agent", "skill-systematic-debugging", "skill-unreferenced-tool"]:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            canonical_seed_dir = SeedValidator().seed_dir
            for f in canonical_seed_dir.glob("*.yaml"):
                (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

            skills_data = yaml.safe_load((tmp_path / "profile-skills.seed.yaml").read_text(encoding="utf-8"))
            skills_data["assignments"]["lead"].append(fixture_skill)
            (tmp_path / "profile-skills.seed.yaml").write_text(yaml.safe_dump(skills_data), encoding="utf-8")

            validator = SeedValidator(seed_dir=tmp_path, source_mode="production-readonly")
            report = validator.validate()
            assert report.is_valid is False
            assert any("FIXTURE SKILL CONTAMINATION" in err for err in report.errors)


def test_channel_count_reconciliation_and_consolidation_provenance():
    """Prompt 14.1B Section 19-21: 17 Discord channels validated with commit 197a1ec provenance."""
    validator = SeedValidator(source_mode="production-readonly")
    raw_channels = validator._load_yaml("channel-routes.seed.yaml")

    assert len(raw_channels["routes"]) == 17
    assert raw_channels["source_validation"]["canonical_route_count"] == 17
    assert raw_channels["source_validation"]["discrepancy_status"] == "EXPLAINED"
    assert "197a1ec" in raw_channels["source_validation"]["consolidation_commit"]
    assert len(raw_channels["consolidated_routes"]) == 3


def test_model_policy_tier_and_runtime_resolver_separation():
    """Prompt 14.1B Section 23-25: Model tier policy defined but runtime resolver marked pending."""
    validator = SeedValidator(source_mode="production-readonly")
    raw_models = validator._load_yaml("model-policy.seed.yaml")

    assert raw_models["source_validation"]["policy_status"] == "MODEL_TIER_POLICY_DEFINED"
    assert raw_models["source_validation"]["runtime_resolver_status"] == "MODEL_TIER_RUNTIME_RESOLVER_PENDING"
    assert raw_models["source_validation"]["production_runtime_configuration"]["active_default_model"] == "gratisan_and_googlepro"
    assert raw_models["source_validation"]["production_runtime_configuration"]["provider"] == "custom:9router"


def test_previewer_fixture_profile_exclusion():
    """Prompt 14.1B Section 7 & 50: Previewer excludes fixture profiles from WOULD_REMOVE."""
    from app.seeder.previewer import SeedPreviewer
    
    # Mock current profiles including a fixture profile
    mock_profiles = {
        "lead": {"id": "lead", "role": "lead", "allowed_skills": ["hermes-agent", "grounded-citations", "weekly-review-planning", "systematic-debugging"]},
        "dyn-custom-98765": {"id": "dyn-custom-98765", "role": "custom", "allowed_skills": []},
        "retired-bot": {"id": "retired-bot", "role": "retired", "allowed_skills": []},
    }
    previewer = SeedPreviewer(profile_registry=mock_profiles, source_mode="production-readonly")
    rep = previewer.generate_preview()
    
    # The fixture profiles must NOT appear in WOULD_REMOVE
    for p in rep.profiles:
        assert p.profile_id not in ["dyn-custom-98765", "retired-bot"], f"Fixture profile {p.profile_id} leaked into preview!"
