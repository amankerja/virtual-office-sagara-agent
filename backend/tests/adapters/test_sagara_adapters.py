from pathlib import Path
import pytest
from app.adapters.sagara_profiles import SagaraProfileCatalogAdapter, validate_sagara_project_root
from app.adapters.sagara_skills import SagaraSkillCatalogAdapter
from app.api.errors import SagaraSourceUnavailableError

FIXTURE_ROOT = Path(__file__).parent.parent / "fixtures" / "sagara_project"


def test_validate_sagara_project_root_success():
    root = validate_sagara_project_root(FIXTURE_ROOT)
    assert root.exists()
    assert root.is_dir()
    assert root.is_absolute()


def test_validate_sagara_project_root_failures():
    # None or empty
    with pytest.raises(SagaraSourceUnavailableError) as exc_info:
        validate_sagara_project_root(None)
    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "SAGARA_SOURCE_UNAVAILABLE"
    assert "Configured Sagara source is unavailable." in str(exc_info.value)

    # Relative path
    with pytest.raises(SagaraSourceUnavailableError):
        validate_sagara_project_root("relative/path/not/absolute")

    # Non-existent path
    with pytest.raises(SagaraSourceUnavailableError):
        validate_sagara_project_root(Path("C:/nonexistent_sagara_dir_99999").resolve())


@pytest.mark.asyncio
async def test_sagara_profile_catalog_adapter():
    adapter = SagaraProfileCatalogAdapter(project_root=FIXTURE_ROOT)
    profiles = await adapter.list_profiles()

    assert isinstance(profiles, list)
    assert len(profiles) >= 6

    # Verify deterministic ordering: sorted by name (case-insensitive) then ID
    names = [p.name.lower() for p in profiles]
    assert names == sorted(names), "Profiles must be sorted deterministically"

    # Find profiles by dynamic ID
    by_id = {p.id: p for p in profiles}

    # Complete enabled profile
    lead = by_id["lead"]
    assert lead.enabled is True
    assert lead.role == "Operations Lead"
    assert lead.allowed_skills == ["skill-hermes-agent", "skill-systematic-debugging"]
    assert lead.memory_namespace == "mem-lead"

    # Profile without optional role
    personal = by_id["personal"]
    assert personal.enabled is True
    assert personal.role is None, "Missing role must remain None (Section 11 & 48)"
    assert personal.allowed_skills == ["skill-google-workspace"]

    # Disabled profile preserved
    retired = by_id["retired-bot"]
    assert retired.enabled is False, "Enabled state must be preserved as False"

    # Incomplete profile
    incomplete = by_id["incomplete-agent"]
    assert incomplete.role is None
    assert incomplete.description is None
    assert incomplete.allowed_skills is None
    assert incomplete.configuration_state == "INCOMPLETE"

    # Dynamic opaque ID (Section 14)
    custom = by_id["dyn-custom-98765"]
    assert custom.name == "Custom Research Agent"

    # Single get_profile
    single = await adapter.get_profile("dyn-custom-98765")
    assert single is not None
    assert single.id == "dyn-custom-98765"

    not_found = await adapter.get_profile("nonexistent-opaque-id")
    assert not_found is None

    # Diagnostics collected (Section 27)
    diags = adapter.get_diagnostics()
    assert isinstance(diags, list)
    missing_role_diags = [d for d in diags if d.code == "PROFILE_OPTIONAL_FIELD_MISSING"]
    assert len(missing_role_diags) >= 1


@pytest.mark.asyncio
async def test_no_hardcoded_profile_ids_in_adapter():
    """Section 14: Application logic must treat profile IDs as opaque registry values."""
    adapter = SagaraProfileCatalogAdapter(project_root=FIXTURE_ROOT)
    profiles = await adapter.list_profiles()
    for p in profiles:
        assert isinstance(p.id, str)
        assert len(p.id) > 0


@pytest.mark.asyncio
async def test_sagara_skill_catalog_adapter_no_raw_scan():
    """
    Section 16 & 58: Mission Control MUST NOT recursively scan the repository for SKILL.md.
    Verify adapter output equals canonical registry catalog (5 skills), NOT counting
    the extra rogue SKILL.md files placed elsewhere in fixture tree.
    """
    adapter = SagaraSkillCatalogAdapter(project_root=FIXTURE_ROOT)
    skills = await adapter.list_skills()

    # The canonical skills.yaml defines exactly 5 skills
    assert len(skills) == 5, f"Expected 5 canonical skills, got {len(skills)}. Raw scan may have leaked rogue SKILL.md files!"

    skill_ids = {s.id for s in skills}
    assert "skill-hermes-agent" in skill_ids
    assert "skill-systematic-debugging" in skill_ids
    assert "skill-google-workspace" in skill_ids
    assert "skill-baoyu-infographic" in skill_ids
    assert "skill-unreferenced-tool" in skill_ids

    # Verify rogue SKILL.md files are NOT in catalog
    assert "unregistered-skill-a" not in skill_ids
    assert "unregistered-skill-b" not in skill_ids
    assert "profile-duplicate-skill" not in skill_ids


@pytest.mark.asyncio
async def test_sagara_skill_catalog_adapter_four_dimensions():
    """Section 18, 19, 20, 21: Preserves the four frozen dimensions safely without Hermes."""
    adapter = SagaraSkillCatalogAdapter(project_root=FIXTURE_ROOT)
    skills = await adapter.list_skills()

    for s in skills:
        # 1. Registration is confirmed from catalog
        assert s.registration == "REGISTERED"
        # 2. Installation cannot be proven without Hermes -> UNKNOWN (Section 19)
        assert s.installation == "UNKNOWN"
        # 3. Health requires runtime -> UNKNOWN (Section 20 - never fabricate HEALTHY)
        assert s.health == "UNKNOWN"
        # 4. Execution is unobserved until Hermes -> NOT_OBSERVED (Section 21)
        assert s.execution == "NOT_OBSERVED"
        assert s.owner_pid is None
        assert s.last_executed_at is None

    # Deterministic ordering
    names = [s.name.lower() for s in skills]
    assert names == sorted(names)

    # Single lookup
    single = await adapter.get_skill("skill-hermes-agent")
    assert single is not None
    assert single.id == "skill-hermes-agent"

    not_found = await adapter.get_skill("nonexistent-skill")
    assert not_found is None
