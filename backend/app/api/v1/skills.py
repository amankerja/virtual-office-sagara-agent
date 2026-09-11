from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_skill_service
from app.schemas.skills import SkillDto
from app.services.skill_service import SkillService

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("", response_model=list[SkillDto])
async def list_skills(
    registration: Optional[str] = Query(None, description="Filter by registration dimension"),
    health: Optional[str] = Query(None, description="Filter by health dimension"),
    service: SkillService = Depends(get_skill_service),
) -> list[SkillDto]:
    return await service.list_skills(registration=registration, health=health)


@router.get("/{skill_id}", response_model=SkillDto)
async def get_skill_by_id(
    skill_id: str,
    service: SkillService = Depends(get_skill_service),
) -> SkillDto:
    return await service.get_skill(skill_id)
