import subprocess

script = """
import os
import sys

os.environ["SAGARA_PROJECT_ROOT"] = "/home/ubuntu/sagara-agent"
os.environ["HERMES_STATE_DB_PATH"] = "/home/ubuntu/.hermes/state.db"
os.environ["HERMES_BINARY"] = "/home/ubuntu/.local/bin/hermes"
os.environ["HERMES_HOME_DIR"] = "/home/ubuntu/.hermes"
os.environ["PROFILE_SOURCE"] = "sagara"
os.environ["SKILL_SOURCE"] = "sagara"
os.environ["RUNTIME_SOURCE"] = "hermes"
os.environ["FRONTEND_DIST_PATH"] = "/home/ubuntu/sagara-mission-control/frontend/dist"
os.environ["MISSION_CONTROL_DATABASE_URL"] = "sqlite:////home/ubuntu/sagara-mission-control/backend/data/mission-control.db"
os.environ["MISSION_CONTROL_EXECUTION_ENABLED"] = "false"
os.environ["MISSION_CONTROL_LIVE_CANARY_ENABLED"] = "false"

sys.path.insert(0, '/home/ubuntu/sagara-mission-control/backend')

from app.config import settings
from app.api.dependencies import reconfigure_dependencies, get_agent_service, get_skill_service, get_runtime_service

reconfigure_dependencies()

import asyncio

async def probe():
    agent_service = get_agent_service()
    skill_service = get_skill_service()
    runtime_service = get_runtime_service()

    agents = await agent_service.list_agents()
    print(f"CANONICAL_AGENTS_COUNT:{len(agents)}")
    print(f"AGENT_IDS:{','.join([a.id for a in agents])}")

    skills = await skill_service.list_skills()
    print(f"SKILLS_COUNT:{len(skills)}")

    overview = await runtime_service.get_overview()
    print(f"RUNTIME_OVERVIEW_STATUS:{overview.status}")
    print(f"SESSIONS_TOTAL:{overview.metrics.total_sessions}")

asyncio.run(probe())
"""

res = subprocess.run(
    ["ssh", "sagara", "/home/ubuntu/sagara-mission-control/backend/.venv/bin/python"],
    input=script.encode("utf-8"),
    capture_output=True,
)
print("STDOUT:")
print(res.stdout.decode("utf-8", errors="replace"))
print("STDERR:")
print(res.stderr.decode("utf-8", errors="replace"))
