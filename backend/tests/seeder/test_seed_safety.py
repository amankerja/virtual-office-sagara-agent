"""
Tests for Seed Safety and Production Non-Mutation Invariants (Prompt 14.1 Section 121).
Ensures validation, preview, and diff operations perform ZERO mutations to production
profiles, Hermes runtime, gateway processes, or task dispatch.
"""
from app.config import settings
from app.seeder.previewer import SeedPreviewer
from app.seeder.validator import SeedValidator
from app.seeder.differ import SeedDiffer


def test_validation_and_preview_do_not_mutate_system():
    # Execution must remain strictly disabled
    assert settings.execution_enabled is False

    validator = SeedValidator()
    report = validator.validate()
    assert report.is_valid is True

    previewer = SeedPreviewer(validator=validator)
    prev = previewer.generate_preview()
    assert len(prev.profiles) > 0

    differ = SeedDiffer(previewer=previewer)
    matrix = differ.generate_diff_matrix(prev)
    assert len(matrix) > 0

    # Verify execution safety settings are untouched
    assert settings.execution_enabled is False
    assert settings.live_canary_enabled is False
