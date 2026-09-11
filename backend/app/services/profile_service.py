from typing import Optional
from app.adapters.profiles import ProfileCatalogAdapter
from app.api.errors import ResourceNotFoundError
from app.schemas.profiles import ProfileDto


class ProfileService:
    def __init__(self, catalog: ProfileCatalogAdapter) -> None:
        self._catalog = catalog

    async def list_profiles(self) -> list[ProfileDto]:
        return await self._catalog.list_profiles()

    async def get_profile(self, profile_id: str) -> ProfileDto:
        profile = await self._catalog.get_profile(profile_id)
        if not profile:
            raise ResourceNotFoundError(f"Profile with ID '{profile_id}' was not found.")
        return profile
