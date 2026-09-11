from fastapi import APIRouter
from app.api.v1 import (
    activity,
    agents,
    approvals,
    artifacts,
    audit,
    delegations,
    governance,
    mission_control,
    profiles,
    runtime,
    sessions,
    skills,
    tasks,
    action_intents,
    action_safety,
    changesets,
)
from app.config import settings
from app.realtime.router import realtime_router

api_v1_router = APIRouter(prefix="/api/v1")


@api_v1_router.get("", tags=["API Root"])
async def get_api_root():
    return {
        "name": "Sagara Mission Control API",
        "version": "v1",
        "data_mode": settings.data_mode,
        "environment": settings.environment,
    }


# Include all sub-routers
api_v1_router.include_router(mission_control.router)
api_v1_router.include_router(profiles.router)
api_v1_router.include_router(agents.router)
api_v1_router.include_router(skills.router)
api_v1_router.include_router(runtime.router)
api_v1_router.include_router(sessions.router)
api_v1_router.include_router(delegations.router)
api_v1_router.include_router(tasks.router)
api_v1_router.include_router(approvals.router)
api_v1_router.include_router(activity.router)
api_v1_router.include_router(audit.router)
api_v1_router.include_router(governance.router)
api_v1_router.include_router(artifacts.router)
api_v1_router.include_router(realtime_router)
api_v1_router.include_router(action_intents.router)
api_v1_router.include_router(action_safety.router)
api_v1_router.include_router(changesets.router)
