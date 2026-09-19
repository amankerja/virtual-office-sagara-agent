import os
import shutil
from pathlib import Path
from typing import Any
from fastapi import APIRouter

router = APIRouter(prefix="/system", tags=["System"])


@router.post("/cache/clear", response_model=dict[str, Any])
async def clear_system_cache() -> dict[str, Any]:
    """Cleans temporary cache files across Hermes and Sagara Agentic runtime."""
    cleared_files = 0
    cleared_bytes = 0

    target_dirs = [
        Path.home() / ".hermes" / "cache" / "audio",
        Path.home() / ".hermes" / "cache" / "images",
        Path.home() / ".hermes" / "cache" / "documents",
        Path.home() / ".hermes" / "cache" / "screenshots",
        Path.home() / ".hermes" / "cache" / "videos",
        Path.home() / ".hermes" / "cache" / "vision",
        Path.home() / ".hermes" / "cache" / "terminal-output",
        Path.home() / ".hermes" / "cache" / "spillover",
    ]

    # Add profile caches
    profiles_base = Path.home() / ".hermes" / "profiles"
    if profiles_base.exists():
        for p in profiles_base.iterdir():
            if p.is_dir():
                target_dirs.extend([
                    p / "cache",
                    p / "audio_cache",
                    p / "image_cache",
                ])

    for target_dir in target_dirs:
        if not target_dir.exists():
            continue
        for item in target_dir.glob("*"):
            if item.is_file() and not item.name.startswith("."):
                try:
                    size = item.stat().st_size
                    item.unlink()
                    cleared_files += 1
                    cleared_bytes += size
                except Exception:
                    pass

    mb_freed = round(cleared_bytes / (1024 * 1024), 2)
    return {
        "success": True,
        "cleared_files": cleared_files,
        "bytes_freed": cleared_bytes,
        "mb_freed": mb_freed,
        "message": f"Successfully cleared {cleared_files} cached items ({mb_freed} MB freed)",
    }
