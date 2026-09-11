from typing import Optional, Protocol
from app.schemas.profiles import ProfileDto


class ProfileCatalogAdapter(Protocol):
    """Clean seam for future Sagara ProfileRegistry integration."""

    async def list_profiles(self) -> list[ProfileDto]:
        """List registered agent profiles."""
        ...

    async def get_profile(self, profile_id: str) -> Optional[ProfileDto]:
        """Get profile definition by opaque ID."""
        ...
