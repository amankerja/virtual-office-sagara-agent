from typing import Optional
from app.adapters.skills import SkillCatalogAdapter
from app.api.errors import ResourceNotFoundError
from app.schemas.skills import SkillDto


class SkillService:
    def __init__(self, catalog: SkillCatalogAdapter) -> None:
        self._catalog = catalog

    async def list_skills(
        self,
        registration: Optional[str] = None,
        health: Optional[str] = None,
    ) -> list[SkillDto]:
        return await self._catalog.list_skills(registration=registration, health=health)

    async def get_skill(self, skill_id: str) -> SkillDto:
        skill = await self._catalog.get_skill(skill_id)
        if not skill:
            raise ResourceNotFoundError(f"Skill with ID '{skill_id}' was not found.")
        return skill
