import os
import pytest
from app.adapters.hermes_runtime import HermesSqliteRuntimeAdapter
from app.adapters.sagara_profiles import SagaraProfileCatalogAdapter
from app.adapters.sagara_skills import SagaraSkillCatalogAdapter
from app.services.agent_service import AgentProjectionService

from tests.fixtures.create_synthetic_hermes_db import build_synthetic_hermes_db

SAGARA_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "sagara_project")
HERMES_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "hermes_state.db")


@pytest.fixture
def hybrid_projection_service() -> AgentProjectionService:
    build_synthetic_hermes_db(HERMES_FIXTURE_PATH)
    profile_catalog = SagaraProfileCatalogAdapter(project_root=SAGARA_FIXTURE_PATH)
    skill_catalog = SagaraSkillCatalogAdapter(project_root=SAGARA_FIXTURE_PATH)
    runtime_reader = HermesSqliteRuntimeAdapter(db_path=HERMES_FIXTURE_PATH)

    return AgentProjectionService(
        profile_catalog=profile_catalog,
        skill_catalog=skill_catalog,
        runtime_reader=runtime_reader,
        is_mock=False,
    )


@pytest.mark.asyncio
async def test_agent_projection_with_hermes_runtime(hybrid_projection_service: AgentProjectionService):
    agents = await hybrid_projection_service.list_agents()
    assert len(agents) > 0

    agent_map = {a.id: a for a in agents}

    # 1. lead: has active turn lease session + running delegation
    # Precedence: ACTIVE, confidence: CONFIRMED
    lead = agent_map.get("lead")
    assert lead is not None
    assert lead.runtime.state == "ACTIVE"
    assert lead.runtime.confidence == "CONFIRMED"
    assert lead.runtime.current_session_id == "sess_active_01"
    assert lead.runtime.model == "gemini-1.5-pro"
    assert lead.runtime.session_count == 1
    assert lead.runtime.active_delegations >= 1
    assert lead.usage is not None
    assert lead.usage.input_tokens == 15000

    # 2. marketing: has recent unclosed session (120s ago), no active lease
    # Precedence: RECENTLY_ACTIVE, confidence: INFERRED
    mkt = agent_map.get("marketing")
    assert mkt is not None
    assert mkt.runtime.state == "RECENTLY_ACTIVE"
    assert mkt.runtime.confidence == "INFERRED"
    assert mkt.runtime.model == "claude-3-5-sonnet"
    assert mkt.runtime.current_session_id is None

    # 3. business: has completed session, gateway healthy
    # Precedence: IDLE, confidence: INFERRED
    biz = agent_map.get("business")
    assert biz is not None
    assert biz.runtime.state == "IDLE"
    assert biz.runtime.confidence == "INFERRED"

    # 4. Incomplete profile: incomplete-agent has CONFIGURATION_INCOMPLETE
    # Must preserve CONFIGURATION_INCOMPLETE with CONFIRMED confidence regardless of runtime
    broken = agent_map.get("incomplete-agent")
    assert broken is not None
    assert broken.runtime.state == "CONFIGURATION_INCOMPLETE"
    assert broken.runtime.confidence == "CONFIRMED"

    # 5. Profile with no sessions or delegations in Hermes runtime -> UNKNOWN
    # Must NOT assume OFFLINE!
    personal = agent_map.get("personal")
    assert personal is not None
    assert personal.runtime.state == "UNKNOWN"
    assert personal.runtime.confidence == "UNKNOWN"
    assert personal.runtime.session_count is None



@pytest.mark.asyncio
async def test_unregistered_runtime_profile_diagnostic(hybrid_projection_service: AgentProjectionService):
    """Verifies that an unknown runtime profile_name logs UNREGISTERED_RUNTIME_PROFILE without inventing a profile."""
    agents = await hybrid_projection_service.list_agents()
    agent_ids = {a.id for a in agents}
    assert "prof-unregistered-ghost" not in agent_ids

    adapter = hybrid_projection_service._runtime_reader
    assert isinstance(adapter, HermesSqliteRuntimeAdapter)
    diagnostics = adapter.diagnostics.get_records()
    codes = [d.code for d in diagnostics]
    assert "UNREGISTERED_RUNTIME_PROFILE" in codes
