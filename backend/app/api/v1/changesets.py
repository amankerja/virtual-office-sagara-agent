import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, Header, status
from pydantic import BaseModel, ConfigDict, Field
from app.api.auth import get_current_principal
from app.api.dependencies import get_action_intent_service, get_correlation_id
from app.db.connection import get_db_connection
from app.domain.principal import OperatorPrincipal
from app.schemas.action_intents import ActionIntentDto, CreateActionIntentDto
from app.services.action_intent_service import ActionIntentService

router = APIRouter(prefix="/changesets", tags=["ChangeSets"])


class CreateConfigChangeSetDto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str
    title: str
    description: Optional[str] = None
    changes: dict[str, Any]
    base_revision: int = 1
    create_action_intent: bool = True


class ConfigChangeSetResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    changeset_id: str
    profile_id: str
    title: str
    status: str
    action_intent: Optional[ActionIntentDto] = None


@router.post("/configuration", response_model=ConfigChangeSetResponse, status_code=status.HTTP_201_CREATED)
async def stage_configuration_changeset(
    payload: CreateConfigChangeSetDto,
    correlation_id: str = Depends(get_correlation_id),
    principal: OperatorPrincipal = Depends(get_current_principal),
    intent_service: ActionIntentService = Depends(get_action_intent_service),
) -> ConfigChangeSetResponse:
    """
    Stage local draft changes into a persistent ConfigurationChangeSet.
    Section 74 & 75: Prepare Draft -> ConfigurationChangeSet -> ActionIntent.
    Strict safety: Does NOT apply to Sagara runtime or profile YAML yet!
    """
    changeset_id = f"cs-cfg-{uuid.uuid4().hex[:12]}"
    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    changes_json = json.dumps(payload.changes, sort_keys=True)

    conn = get_db_connection()
    try:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO configuration_change_sets (
                id, profile_id, title, description, changes, base_revision, status, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                changeset_id,
                payload.profile_id,
                payload.title,
                payload.description,
                changes_json,
                payload.base_revision,
                "ATTACHED_TO_INTENT" if payload.create_action_intent else "DRAFT",
                principal.id,
                now_str,
                now_str,
            ),
        )
        conn.execute("COMMIT;")
    except Exception:
        conn.execute("ROLLBACK;")
        raise
    finally:
        conn.close()

    action_intent = None
    if payload.create_action_intent:
        intent_dto = CreateActionIntentDto(
            action_type="PROFILE_CHANGE_APPLY",
            target_type="PROFILE",
            target_id=payload.profile_id,
            payload={
                "changeset_id": changeset_id,
                "profile_id": payload.profile_id,
                "changes": payload.changes,
            },
            resource_revision=payload.base_revision,
            reason=payload.description or f"Apply configuration change set: {payload.title}",
        )
        action_intent = await intent_service.create_intent(
            dto=intent_dto,
            principal=principal,
            correlation_id=correlation_id,
        )

    return ConfigChangeSetResponse(
        changeset_id=changeset_id,
        profile_id=payload.profile_id,
        title=payload.title,
        status="ATTACHED_TO_INTENT" if payload.create_action_intent else "DRAFT",
        action_intent=action_intent,
    )


@router.get("", response_model=list[dict[str, Any]])
async def list_changesets() -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='configuration_change_sets';")
        if not cursor.fetchone():
            return []
        cursor.execute("SELECT * FROM configuration_change_sets ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []
    finally:
        conn.close()
