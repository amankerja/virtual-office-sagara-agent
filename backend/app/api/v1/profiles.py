from fastapi import APIRouter, Depends
from app.api.dependencies import get_profile_service
from app.schemas.profiles import ProfileDto
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("", response_model=list[ProfileDto])
async def list_profiles(
    service: ProfileService = Depends(get_profile_service),
) -> list[ProfileDto]:
    return await service.list_profiles()


@router.get("/recommended")
async def get_recommended_profile_blueprint():
    """
    Read-only endpoint returning the recommended profile blueprint and diff preview.
    Prompt 14.1 Section 63-65. Purely read-only; zero mutations.
    """
    from app.seeder.validator import SeedValidator
    from app.seeder.previewer import SeedPreviewer

    validator = SeedValidator()
    val_report = validator.validate()
    previewer = SeedPreviewer(validator=validator)
    prev_report = previewer.generate_preview()
    return {
        "blueprint_id": "sagara-default-profile-blueprint",
        "schema_version": val_report.schema_version,
        "seed_version": val_report.seed_version,
        "seed_hash": val_report.seed_hash,
        "is_valid": val_report.is_valid,
        "preview": prev_report.model_dump(),
        "profiles": [p.model_dump() for p in prev_report.profiles if p.action != "WOULD_REMOVE"],
    }


@router.get("/{profile_id}", response_model=ProfileDto)
async def get_profile_by_id(
    profile_id: str,
    service: ProfileService = Depends(get_profile_service),
) -> ProfileDto:
    return await service.get_profile(profile_id)


@router.put("/{profile_id}", response_model=ProfileDto)
async def update_profile(
    profile_id: str,
    updates: dict,
    service: ProfileService = Depends(get_profile_service),
) -> ProfileDto:
    return await service.update_profile(profile_id, updates)
