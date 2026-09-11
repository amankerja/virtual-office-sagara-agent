import pytest
from app.repositories.memory.fixtures import PROFILES_FIXTURE, SKILLS_FIXTURE
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.services.preflight_service import ActionPreflightService


class StubProfileCatalog:
    async def get_profile(self, profile_id: str):
        for p in PROFILES_FIXTURE:
            if p.id == profile_id:
                return p
        return None


class StubSkillCatalog:
    def __init__(self, skill_status_override=None):
        self.skill_status_override = skill_status_override or {}

    async def get_skill(self, skill_id: str):
        class DummySkill:
            def __init__(self, s_id, status_dict):
                self.id = s_id
                self.registration = "REGISTERED"
                self.installation = "INSTALLED"
                self.health = status_dict.get(s_id, "HEALTHY")
                self.status = status_dict.get(s_id, "HEALTHY")
        return DummySkill(skill_id, self.skill_status_override)


class StubAgentService:
    def __init__(self, runtime_state="UNKNOWN"):
        self.runtime_state = runtime_state

    async def get_agent(self, agent_id: str):
        class DummyRuntime:
            state = self.runtime_state
            confidence = "LOW" if self.runtime_state == "UNKNOWN" else "HIGH"

        class DummyAgent:
            runtime = DummyRuntime()

        return DummyAgent()


@pytest.mark.asyncio
async def test_unknown_runtime_blocks_task_dispatch():
    """Section 4, 35, 121: UNKNOWN runtime state strictly blocks TASK_DISPATCH."""
    task_repo = InMemoryTaskRepository()
    agent_svc = StubAgentService(runtime_state="UNKNOWN")
    preflight = ActionPreflightService(
        profile_catalog=StubProfileCatalog(),
        skill_catalog=StubSkillCatalog(),
        agent_service=agent_svc,
        task_repo=task_repo,
    )

    res = await preflight.evaluate_preflight(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-001",
        payload={"task_id": "task-001", "agent_id": "agent-001"},
    )
    assert res.result == "BLOCKED"
    assert any("UNKNOWN" in b for b in res.blocking_reasons)


@pytest.mark.asyncio
async def test_unknown_or_unhealthy_capability_blocks_preflight():
    """Section 36, 37, 122: Required skill with UNKNOWN health blocks execution preflight."""
    task_repo = InMemoryTaskRepository()
    agent_svc = StubAgentService(runtime_state="IDLE")
    skill_catalog = StubSkillCatalog(skill_status_override={"skill-001": "UNKNOWN"})

    preflight = ActionPreflightService(
        profile_catalog=StubProfileCatalog(),
        skill_catalog=skill_catalog,
        agent_service=agent_svc,
        task_repo=task_repo,
    )

    res = await preflight.evaluate_preflight(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-001",
        payload={
            "task_id": "task-001",
            "agent_id": "agent-001",
            "required_skills": ["skill-001"],
        },
    )
    assert res.result == "BLOCKED"
    assert any("installation/health is UNKNOWN" in b for b in res.blocking_reasons)


@pytest.mark.asyncio
async def test_dry_run_preflight_produces_structured_plan():
    """Section 107, 108, 109, 110: Dry run produces typed action plan without shell commands."""
    task_repo = InMemoryTaskRepository()
    agent_svc = StubAgentService(runtime_state="IDLE")
    preflight = ActionPreflightService(
        profile_catalog=StubProfileCatalog(),
        skill_catalog=StubSkillCatalog(),
        agent_service=agent_svc,
        task_repo=task_repo,
    )

    res = await preflight.evaluate_preflight(
        action_type="TASK_CANCEL",
        target_type="TASK",
        target_id="task-001",
        payload={"task_id": "task-001"},
        is_dry_run=True,
    )
    assert res.runtime_evidence["dry_run"] is True
    assert res.action_plan is not None
    assert "command" not in res.action_plan
    assert res.action_plan["action_type"] == "TASK_CANCEL"
