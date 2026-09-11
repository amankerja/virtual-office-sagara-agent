from typing import Optional, Protocol
from app.schemas.skills import SkillDto


class SkillCatalogAdapter(Protocol):
    """Clean seam for future Sagara SkillRegistry/SkillSync integration."""

    async def list_skills(
        self,
        registration: Optional[str] = None,
        health: Optional[str] = None,
    ) -> list[SkillDto]:
        """List skills with multi-dimensional status."""
        ...

    async def get_skill(self, skill_id: str) -> Optional[SkillDto]:
        """Get skill details by opaque ID."""
        ...
