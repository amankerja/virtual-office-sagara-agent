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


# ---------------------------------------------------------------------------
# Prompt 14.1C Canonical Profile Materialization Parity Tests (Sections 21, 28, 29)
# ---------------------------------------------------------------------------

def test_canonical_profile_fields_exact_parity_round_trip():
    """Prompt 14.1C Section 21 & 28: Full field parity between seed, staging materialization, and ProfileRegistry.load()."""
    materializer = SeedMaterializer(source_mode="production-readonly")

    with tempfile.TemporaryDirectory() as tmp_dir:
        staging_dir = Path(tmp_dir) / "staging"
        res = materializer.materialize(staging_dir)
        assert res["total_materialized"] == 8

        registry = ProfileRegistry.load(staging_dir)
        by_id = {p.id: p for p in registry.all()}
        assert len(by_id) == 8

        # Expected canonical profiles and their exact production-verified namespaces
        expected_canonical = {
            "lead": "profile:lead",
            "personal": "profile:personal",
            "business": "profile:business",
            "marketing": "profile:marketing",
            "cs": "profile:cs",
            "it-support": "profile:it-support",
            "it-coding": "profile:it-coding",
            "sagara-lab": "profile:sagara-lab",
        }

        # Load authoritative production snapshot to verify exact field-by-field equality
        import json
        snapshot_path = Path(__file__).parent.parent.parent / "app" / "seeder" / "production_snapshot.json"
        with open(snapshot_path, "r", encoding="utf-8") as f:
            snap_data = json.load(f)
        prod_profiles = snap_data["profiles"]

        for pid, expected_ns in expected_canonical.items():
            assert pid in by_id, f"Missing canonical profile '{pid}'"
            p = by_id[pid]
            prod = prod_profiles[pid]

            # 1. Identity & Role Parity
            assert p.id == pid
            assert p.role == prod["role"]
            assert p.enabled is True
            assert prod["enabled"] is True

            # 2. Memory Namespace Parity (Prompt 14.1C Section 6)
            assert p.memory_namespace == expected_ns, f"Profile '{pid}' namespace mismatch: {p.memory_namespace} != {expected_ns}"
            assert p.memory_namespace == prod["memory_namespace"]
            assert p.memory_namespace != "default", f"Profile '{pid}' memory_namespace must not be 'default'!"

            # 3. Allowed Skills Semantic Parity (Prompt 14.1C Section 9 & 10)
            assert sorted(p.allowed_skills) == sorted(prod["allowed_skills"])

            # Verify profile.yaml on disk in staging
            yaml_path = staging_dir / "profiles" / pid / "profile.yaml"
            assert yaml_path.is_file()
            with open(yaml_path, "r", encoding="utf-8") as yf:
                raw_disk = yaml.safe_load(yf)
            assert raw_disk["id"] == pid
            assert raw_disk["memory_namespace"] == expected_ns
            assert raw_disk["enabled"] is True
            assert raw_disk["permissions_policy"] == prod["permissions_policy"]
            assert raw_disk["allowed_domains"] == prod["allowed_domains"]


def test_default_value_guard_rejects_normalization_to_default():
    """Prompt 14.1C Section 29: Materializer and validator strictly reject normalizing namespace to 'default'."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        canonical_seed_dir = SeedValidator().seed_dir
        for f in canonical_seed_dir.glob("*.yaml"):
            (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

        # Corrupt one profile to use 'default' namespace
        profiles_data = yaml.safe_load((tmp_path / "profiles.seed.yaml").read_text(encoding="utf-8"))
        for p in profiles_data["profiles"]:
            if p["id"] == "lead":
                p["memory_namespace"] = "default"
        (tmp_path / "profiles.seed.yaml").write_text(yaml.safe_dump(profiles_data), encoding="utf-8")

        # 1. Validator Guard catches it
        validator = SeedValidator(seed_dir=tmp_path, source_mode="production-readonly")
        report = validator.validate()
        assert report.is_valid is False
        assert any("DEFAULT VALUE GUARD" in err for err in report.errors)

        # 2. Materializer Guard fails closed
        staging_dir = tmp_path / "staging"
        materializer = SeedMaterializer(seed_dir=tmp_path, source_mode="production-readonly")
        with pytest.raises(ValueError, match="DEFAULT VALUE GUARD"):
            materializer.materialize(staging_dir)


def test_strict_production_profile_registry_validation_invariants():
    """Prompt 14.1C: Test materialized profiles against strict production ProfileRegistry validation rules."""
    materializer = SeedMaterializer(source_mode="production-readonly")

    with tempfile.TemporaryDirectory() as tmp_dir:
        staging_dir = Path(tmp_dir) / "staging"
        materializer.materialize(staging_dir)

        seen_namespaces = set()
        for p_dir in (staging_dir / "profiles").iterdir():
            if not p_dir.is_dir():
                continue
            with open(p_dir / "profile.yaml", "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            pid = data["id"]
            ns = data["memory_namespace"]

            # Invariant: directory name matches profile ID
            assert p_dir.name == pid

            # Invariant: memory namespace matches profile:<id> exactly
            assert ns == f"profile:{pid}"

            # Invariant: no duplicate namespaces across profiles
            assert ns not in seen_namespaces
            seen_namespaces.add(ns)

            # Invariant: allowed_domains is non-empty list of slugs
            assert isinstance(data["allowed_domains"], list)
            assert len(data["allowed_domains"]) > 0

            # Invariant: permissions_policy is defined
            assert isinstance(data["permissions_policy"], str)
            assert len(data["permissions_policy"]) > 0


# ---------------------------------------------------------------------------
# Prompt 14.1D Exact Skill Identity & Hash Guards (Sections 31, 32, 33)
# ---------------------------------------------------------------------------

CANONICAL_EXACT_SKILLS = {
    "lead": [
        "grounded-citations",
        "hermes-agent",
        "systematic-debugging",
        "weekly-review-planning",
    ],
    "personal": [
        "cek-email-penting",
        "follow-up",
        "google-workspace",
        "himalaya",
        "lamaran-kerja",
        "parse-transaksi",
        "sagara-obsidian-vault",
        "self-motivation",
        "weekly-review-planning",
    ],
    "business": [
        "competitor-analysis-shopee",
        "digital-product-inventory-management",
        "dual-pipeline-identity-architecture",
        "google-workspace",
        "grounded-citations",
        "online-business-management",
        "weekly-review-planning",
        "xlsx",
    ],
    "marketing": [
        "baoyu-infographic",
        "claude-design",
        "content-calendar-mingguan",
        "gif-search",
        "posting-multiplatform",
        "youtube-content",
    ],
    "cs": [
        "customer-service-reply",
        "docx",
        "email-inbox-triage",
        "google-workspace",
        "himalaya",
        "order-notification-draft",
        "parse-transaksi",
    ],
    "it-support": [
        "codebase-inspection",
        "requesting-code-review",
        "sdlc-review",
    ],
    "it-coding": [
        "github",
        "requesting-code-review",
        "sdlc-review",
        "systematic-debugging",
        "test-driven-development",
    ],
    "sagara-lab": [
        "architecture-diagram",
        "arxiv",
        "grounded-citations",
        "llm-wiki",
        "spike",
    ],
}

CANONICAL_SKILLSET_HASHES = {
    "lead": "4aeae6ec91d1c5f7710ba2a8a06a2f2d6c59f5855c8c4a1a5cc890e0242fc980",
    "personal": "1104c25403fcd124e6dc95ff88b35f6f0ce744cef425cf349dcced9b48f50d6a",
    "business": "c737e80f96e2b31ca831d0e733a4b8026b6a30aec7daa2af00a9c3ef6cbf38da",
    "marketing": "7c5a09fef56d587cfb9aa2a0df9ec6b59c96dd992be8ad58106fee09abf2774f",
    "cs": "2ae4b347eb49e8dcf1062a7cea246ff4948b9fa52abae7aa4b95abb57749e576",
    "it-support": "ce9fa53d0175a44ec60ca9e776ea5d0991c5078c97c5478a5b81d5d556c7d08f",
    "it-coding": "18b9d80b6c1b4bc37b95804eaf28edd813978f4c6b5995b5a7b57bd1e33edd6b",
    "sagara-lab": "79811d22055f28fedd7fba6bc99341c3c94f768c96c203c26532e179c6c443a8",
}

CANONICAL_FLEET_HASH_DICT = "c93038cf4a37fcb42fe20fca671e3fb89987a1af325874669e8fcad662f36797"
CANONICAL_FLEET_HASH_LIST = "0cceecf4c5e8716637878f585ca11c88c6ee8ddab3625b857f716e737e95334e"


def test_regression_guard_exact_profile_skill_identity_and_fingerprints():
    """Prompt 14.1D Section 31: Assert exact profile -> allowed_skills identity and SHA-256 fingerprints."""
    import hashlib
    import json

    materializer = SeedMaterializer(source_mode="production-readonly")

    with tempfile.TemporaryDirectory() as tmp_dir:
        staging_dir = Path(tmp_dir) / "staging"
        materializer.materialize(staging_dir)

        registry = ProfileRegistry.load(staging_dir)
        profiles = {p.id: p for p in registry.all()}

        assert len(profiles) == 8
        total_references = 0
        actual_fleet_dict = {}
        actual_fleet_list = []

        canonical_order = ["lead", "personal", "business", "marketing", "cs", "it-support", "it-coding", "sagara-lab"]

        for pid in canonical_order:
            assert pid in profiles, f"Missing canonical profile: {pid}"
            p = profiles[pid]
            expected_skills = CANONICAL_EXACT_SKILLS[pid]
            expected_hash = CANONICAL_SKILLSET_HASHES[pid]

            # Exact skill list equality (identity, not only count)
            sorted_actual = sorted(p.allowed_skills)
            sorted_expected = sorted(expected_skills)
            assert sorted_actual == sorted_expected, (
                f"Profile '{pid}' skill identity mismatch!\n"
                f"Actual: {sorted_actual}\nExpected: {sorted_expected}"
            )
            assert len(p.allowed_skills) == len(expected_skills)
            total_references += len(p.allowed_skills)

            # Exact SHA-256 skillset fingerprint
            skill_json = json.dumps(sorted_actual, separators=(",", ":"))
            actual_hash = hashlib.sha256(skill_json.encode("utf-8")).hexdigest()
            assert actual_hash == expected_hash, (
                f"Profile '{pid}' skillset hash mismatch!\n"
                f"Actual: {actual_hash}\nExpected: {expected_hash}"
            )

            actual_fleet_dict[pid] = sorted_actual
            actual_fleet_list.append({"profile_id": pid, "skills": sorted_actual})

        assert total_references == 47

        # Canonical fleet-level assignment hash verification
        dict_json = json.dumps(actual_fleet_dict, sort_keys=True, separators=(",", ":"))
        fleet_dict_hash = hashlib.sha256(dict_json.encode("utf-8")).hexdigest()
        assert fleet_dict_hash == CANONICAL_FLEET_HASH_DICT

        list_json = json.dumps(actual_fleet_list, separators=(",", ":"))
        fleet_list_hash = hashlib.sha256(list_json.encode("utf-8")).hexdigest()
        assert fleet_list_hash == CANONICAL_FLEET_HASH_LIST


def test_hash_guard_same_count_different_id_fails_parity():
    """Prompt 14.1D Section 32: Swapping skills while preserving total count MUST fail parity and change hash."""
    import hashlib
    import json

    # 1. Negative test: Prompt 14.1B hallucinated lead skills (4 skills -> 4 different skills)
    hallucinated_lead = ["lead-orchestrator", "task-decomposer", "decision-logger", "grounded-citations"]
    sorted_hallucinated = sorted(hallucinated_lead)
    assert len(sorted_hallucinated) == 4
    assert len(CANONICAL_EXACT_SKILLS["lead"]) == 4

    # Parity check must fail
    assert sorted_hallucinated != sorted(CANONICAL_EXACT_SKILLS["lead"])

    # Skillset hash must diverge
    hallucinated_hash = hashlib.sha256(json.dumps(sorted_hallucinated, separators=(",", ":")).encode("utf-8")).hexdigest()
    assert hallucinated_hash != CANONICAL_SKILLSET_HASHES["lead"]

    # 2. Negative test: Single skill swapped while preserving count
    single_swap_lead = ["grounded-citations", "hermes-agent", "systematic-debugging", "fake-skill-swap"]
    assert len(single_swap_lead) == 4
    swap_hash = hashlib.sha256(json.dumps(sorted(single_swap_lead), separators=(",", ":")).encode("utf-8")).hexdigest()
    assert swap_hash != CANONICAL_SKILLSET_HASHES["lead"]

    # 3. Fleet hash must diverge if any single profile has substituted skills
    corrupted_fleet_dict = dict(CANONICAL_EXACT_SKILLS)
    corrupted_fleet_dict["lead"] = sorted_hallucinated
    corrupted_fleet_json = json.dumps(corrupted_fleet_dict, sort_keys=True, separators=(",", ":"))
    corrupted_fleet_hash = hashlib.sha256(corrupted_fleet_json.encode("utf-8")).hexdigest()
    assert corrupted_fleet_hash != CANONICAL_FLEET_HASH_DICT


def test_materializer_preserves_exact_allowed_skills_without_alias_or_normalization():
    """Prompt 14.1D Section 33: Materializer preserves exact skill IDs without alias substitution or normalization."""
    materializer = SeedMaterializer(source_mode="production-readonly")

    with tempfile.TemporaryDirectory() as tmp_dir:
        staging_dir = Path(tmp_dir) / "staging"
        materializer.materialize(staging_dir)

        # Inspect raw YAML on disk for each profile
        for pid, expected_skills in CANONICAL_EXACT_SKILLS.items():
            manifest_path = staging_dir / "profiles" / pid / "profile.yaml"
            assert manifest_path.is_file()
            with open(manifest_path, "r", encoding="utf-8") as f:
                raw_data = yaml.safe_load(f)

            manifest_skills = raw_data.get("allowed_skills", [])
            assert sorted(manifest_skills) == sorted(expected_skills)

            # Check specific high-signal skills to guarantee NO alias substitution or prefix trimming
            if pid == "personal":
                assert "sagara-obsidian-vault" in manifest_skills
                assert "obsidian-vault" not in manifest_skills  # No alias substitution
                assert "cek-email-penting" in manifest_skills   # Exact hyphenated name
                assert "himalaya" in manifest_skills            # Kept despite domain warning
            elif pid == "business":
                assert "dual-pipeline-identity-architecture" in manifest_skills
                assert "competitor-analysis-shopee" in manifest_skills
            elif pid == "marketing":
                assert "baoyu-infographic" in manifest_skills
                assert "claude-design" in manifest_skills


