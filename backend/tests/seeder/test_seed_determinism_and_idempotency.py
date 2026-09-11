"""
Tests for Seed Determinism and Idempotency (Prompt 14.1 Section 115 & 116).
Verifies semantic hashing stability and zero phantom changes across repeated executions.
"""
from pathlib import Path
import tempfile
import pytest

from app.seeder.materializer import SeedMaterializer
from app.seeder.previewer import SeedPreviewer
from app.seeder.validator import SeedValidator


def test_seed_validation_determinism():
    validator1 = SeedValidator()
    report1 = validator1.validate()

    validator2 = SeedValidator()
    report2 = validator2.validate()

    assert report1.is_valid is True
    assert report2.is_valid is True
    assert report1.seed_hash == report2.seed_hash
    assert report1.profile_ids == report2.profile_ids
    assert len(report1.seed_hash) == 64


def test_seed_preview_idempotency():
    previewer = SeedPreviewer()
    preview1 = previewer.generate_preview()
    preview2 = previewer.generate_preview()

    assert preview1.seed_hash == preview2.seed_hash
    assert preview1.total_would_create == preview2.total_would_create
    assert preview1.total_would_update == preview2.total_would_update
    assert preview1.total_would_remove == preview2.total_would_remove
    assert preview1.total_unchanged == preview2.total_unchanged

    # Compare exact items
    p1_items = [(p.profile_id, p.action, tuple(p.skills_to_add), tuple(p.skills_to_remove)) for p in preview1.profiles]
    p2_items = [(p.profile_id, p.action, tuple(p.skills_to_add), tuple(p.skills_to_remove)) for p in preview2.profiles]
    assert p1_items == p2_items


def test_seed_materialization_idempotency():
    materializer = SeedMaterializer()

    with tempfile.TemporaryDirectory() as tmp_dir:
        staging1 = Path(tmp_dir) / "staging1"
        staging2 = Path(tmp_dir) / "staging2"

        res1 = materializer.materialize(staging1)
        res2 = materializer.materialize(staging2)

        assert res1["seed_hash"] == res2["seed_hash"]
        assert res1["materialized_profiles"] == res2["materialized_profiles"]
        assert res1["total_materialized"] == 8

        # Compare generated profile YAML files content byte-for-byte
        for pid in res1["materialized_profiles"]:
            f1 = (staging1 / "profiles" / pid / "profile.yaml").read_text(encoding="utf-8")
            f2 = (staging2 / "profiles" / pid / "profile.yaml").read_text(encoding="utf-8")
            assert f1 == f2, f"Materialized profile.yaml for {pid} diverged between runs"

            soul1 = (staging1 / "profiles" / pid / "SOUL.md").read_text(encoding="utf-8")
            soul2 = (staging2 / "profiles" / pid / "SOUL.md").read_text(encoding="utf-8")
            assert soul1 == soul2, f"Materialized SOUL.md for {pid} diverged between runs"
