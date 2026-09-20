from pathlib import Path
import pytest
from app.adapters.mock_adapters import MockRuntimeAdapter
from app.adapters.sagara_profiles import SagaraProfileCatalogAdapter
from app.adapters.sagara_skills import SagaraSkillCatalogAdapter
from app.services.agent_service import AgentProjectionService

FIXTURE_ROOT = Path(__file__).parent.parent / "fixtures" / "sagara_project"


@pytest.mark.asyncio
async def test_hybrid_agent_projection_unknown_runtime():
    """
    Section 35 & 36: Real profile definitions combine with runtime source.
    When runtime evidence is absent for a real profile identity:
      definition = REAL SAGARA
      runtime.state = UNKNOWN
      runtime.confidence = UNKNOWN
    Must NOT make real profiles look ACTIVE or IDLE.
    """
    profile_adapter = SagaraProfileCatalogAdapter(project_root=FIXTURE_ROOT)
    skill_adapter = SagaraSkillCatalogAdapter(project_root=FIXTURE_ROOT)
    runtime_reader = MockRuntimeAdapter()

    service = AgentProjectionService(
        profile_catalog=profile_adapter,
        skill_catalog=skill_adapter,
        runtime_reader=runtime_reader,
        is_mock=False,
    )

    agents = await service.list_agents()
    assert len(agents) >= 6

    by_id = {a.id: a for a in agents}

    # Lead agent (has real definition, but no matching runtime in MockRuntimeAdapter)
    lead_agent = by_id["lead"]
    assert lead_agent.definition.name == "Sagara Lead Orchestrator"
    assert lead_agent.definition.role == "Operations Lead"
    assert lead_agent.runtime.state == "UNKNOWN"
    assert lead_agent.runtime.confidence == "UNKNOWN"
    assert lead_agent.runtime.session_count is None
    assert lead_agent.runtime.active_delegations is None

    # Capabilities cross-checked against registered skills
    # lead has ["skill-hermes-agent", "skill-systematic-debugging"], both in skills.yaml
    assert lead_agent.capabilities.total == 2
    assert lead_agent.capabilities.missing == 0
    # Health is unverified/UNKNOWN in Prompt 09 -> healthy and degraded remain None (Section 38)
    assert lead_agent.capabilities.healthy is None
    assert lead_agent.capabilities.degraded is None


@pytest.mark.asyncio
async def test_hybrid_agent_capabilities_missing_and_zero():
    """
    Section 38, 49, 62:
    - Profile without skills -> total = 0, missing = None or 0
    - Profile with uncataloged skill reference -> missing = 1
    - Profile with null allowed_skills -> total = None
    """
    profile_adapter = SagaraProfileCatalogAdapter(project_root=FIXTURE_ROOT)
    skill_adapter = SagaraSkillCatalogAdapter(project_root=FIXTURE_ROOT)
    runtime_reader = MockRuntimeAdapter()

    service = AgentProjectionService(
        profile_catalog=profile_adapter,
        skill_catalog=skill_adapter,
        runtime_reader=runtime_reader,
        is_mock=False,
    )

    agents = await service.list_agents()
    by_id = {a.id: a for a in agents}

    # Business profile has allowed_skills: []
    biz = by_id["business"]
    assert biz.capabilities.total == 0, "Confirmed no skills must be 0 (Section 49 & 62)"

    # Marketing profile has ["skill-baoyu-infographic", "skill-unregistered-external"]
    # "skill-unregistered-external" is not in skills.yaml -> missing count = 1
    mkt = by_id["marketing"]
    assert mkt.capabilities.total == 2
    assert mkt.capabilities.missing == 1, "Uncataloged skill reference must be counted as missing (Section 22 & 38)"

    # Incomplete agent has allowed_skills: None
    inc = by_id["incomplete-agent"]
    assert inc.capabilities.total is None, "Unavailable allowed_skills relationship must be None (Section 49 & 62)"


@pytest.mark.asyncio
async def test_hybrid_agent_configuration_incomplete():
    """Section 37: Configuration-incomplete profile maps to CONFIGURATION_INCOMPLETE with CONFIRMED confidence."""
    profile_adapter = SagaraProfileCatalogAdapter(project_root=FIXTURE_ROOT)
    skill_adapter = SagaraSkillCatalogAdapter(project_root=FIXTURE_ROOT)
    runtime_reader = MockRuntimeAdapter()

    service = AgentProjectionService(
        profile_catalog=profile_adapter,
        skill_catalog=skill_adapter,
        runtime_reader=runtime_reader,
        is_mock=False,
    )

    inc_agent = await service.get_agent("incomplete-agent")
    assert inc_agent.runtime.state == "CONFIGURATION_INCOMPLETE"
    assert inc_agent.runtime.confidence == "CONFIRMED"
