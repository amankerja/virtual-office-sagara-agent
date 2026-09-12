"""
Tests for Seed Parsing and Schema Validation (Prompt 14.1 Section 114).
Validates schema rules, slug formats, duplicate detection, and cross-reference integrity.
"""
from pathlib import Path
import tempfile
import pytest
import yaml

from app.seeder.validator import SeedValidator


def test_canonical_seeds_parse_and_validate_successfully():
    validator = SeedValidator()
    report = validator.validate()

    assert report.is_valid is True, f"Validation errors: {report.errors}"
    assert report.total_profiles == 8
    assert report.total_routes == 17
    assert report.total_resources == 16
    assert report.total_soul_templates == 8
    assert len(report.errors) == 0
    assert len(report.seed_hash) == 64

    # Verify all 8 canonical profile IDs are present
    expected_ids = {"lead", "personal", "business", "marketing", "cs", "it-support", "it-coding", "sagara-lab"}
    assert set(report.profile_ids) == expected_ids


def test_invalid_profile_slug_rejected():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        # Copy canonical seeds except modify profiles.seed.yaml with invalid slug
        canonical_seed_dir = SeedValidator().seed_dir
        for f in canonical_seed_dir.glob("*.yaml"):
            (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

        # Corrupt profile ID with uppercase and invalid characters
        profiles_data = yaml.safe_load((tmp_path / "profiles.seed.yaml").read_text(encoding="utf-8"))
        profiles_data["profiles"][0]["id"] = "INVALID SLUG Profile"
        (tmp_path / "profiles.seed.yaml").write_text(yaml.safe_dump(profiles_data), encoding="utf-8")

        validator = SeedValidator(seed_dir=tmp_path)
        report = validator.validate()

        assert report.is_valid is False
        assert any("Invalid slug format" in err for err in report.errors)


def test_duplicate_profile_id_rejected():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        canonical_seed_dir = SeedValidator().seed_dir
        for f in canonical_seed_dir.glob("*.yaml"):
            (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

        profiles_data = yaml.safe_load((tmp_path / "profiles.seed.yaml").read_text(encoding="utf-8"))
        # Duplicate first profile
        profiles_data["profiles"].append(dict(profiles_data["profiles"][0]))
        (tmp_path / "profiles.seed.yaml").write_text(yaml.safe_dump(profiles_data), encoding="utf-8")

        validator = SeedValidator(seed_dir=tmp_path)
        report = validator.validate()

        assert report.is_valid is False
        assert any("Duplicate profile ID" in err for err in report.errors)


def test_unknown_profile_in_channel_route_rejected():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        canonical_seed_dir = SeedValidator().seed_dir
        for f in canonical_seed_dir.glob("*.yaml"):
            (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

        routes_data = yaml.safe_load((tmp_path / "channel-routes.seed.yaml").read_text(encoding="utf-8"))
        routes_data["routes"].append({
            "channel_name": "ghost-channel",
            "target_profile": "nonexistent-profile-xyz",
            "domain": "operations",
        })
        (tmp_path / "channel-routes.seed.yaml").write_text(yaml.safe_dump(routes_data), encoding="utf-8")

        validator = SeedValidator(seed_dir=tmp_path)
        report = validator.validate()

        assert report.is_valid is False
        assert any("routes to unknown profile ID 'nonexistent-profile-xyz'" in err for err in report.errors)


def test_sensitive_read_only_violation_rejected():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        canonical_seed_dir = SeedValidator().seed_dir
        for f in canonical_seed_dir.glob("*.yaml"):
            (tmp_path / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")

        ws_data = yaml.safe_load((tmp_path / "workspace-policy.seed.yaml").read_text(encoding="utf-8"))
        # Violate serial_number read-only rule by granting READ_WRITE to business
        for res in ws_data["resources"]:
            if res.get("resource_id") == "sheet:serial_number":
                res["permissions"]["business"] = "READ_WRITE"

        (tmp_path / "workspace-policy.seed.yaml").write_text(yaml.safe_dump(ws_data), encoding="utf-8")

        validator = SeedValidator(seed_dir=tmp_path)
        report = validator.validate()

        assert report.is_valid is False
        assert any("Sensitive read-only resource" in err for err in report.errors)
