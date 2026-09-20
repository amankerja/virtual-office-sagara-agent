import os
import uuid
from typing import Optional
from fastapi import Header, Request
from app.adapters.hermes_runtime import HermesSqliteRuntimeAdapter
from app.adapters.mock_adapters import (
    MockProfileAdapter,
    MockRuntimeAdapter,
    MockSkillAdapter,
)
from app.adapters.sagara_profiles import SagaraProfileCatalogAdapter
from app.adapters.sagara_skills import SagaraSkillCatalogAdapter
from app.config import settings
from app.repositories.memory.activity_repo import InMemoryActivityRepository
from app.repositories.memory.approval_repo import InMemoryApprovalRepository
from app.repositories.memory.artifact_repo import InMemoryArtifactRepository
from app.repositories.memory.audit_repo import InMemoryAuditRepository
from app.repositories.memory.governance_repo import InMemoryGovernanceRepository
from app.repositories.memory.idempotency import InMemoryIdempotencyStore, idempotency_store
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.adapters.sagara_jobs import SagaraJobRepository
from app.adapters.sagara_governance import SagaraHermesGovernanceRepository
from app.services.activity_service import ActivityService
from app.services.agent_service import AgentProjectionService
from app.services.approval_service import ApprovalService
from app.services.artifact_service import ArtifactService
from app.services.audit_service import AuditService
from app.services.governance_service import GovernanceService
from app.services.mission_control import MissionControlSnapshotService
from app.services.profile_service import ProfileService
from app.services.runtime_service import RuntimeService
from app.services.skill_service import SkillService
from app.services.task_service import TaskService

from app.realtime.manager import RealtimeConnectionManager
from app.realtime.sampler import RealtimeSampler
from app.realtime.snapshot import CanonicalSnapshotService

from app.db.connection import init_db, get_db_connection
from app.repositories.sqlite.audit_repo import SqliteAuditRepository
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.services.action_intent_service import ActionIntentService
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.preflight_service import ActionPreflightService
from app.services.executor import (
    DisabledActionExecutor,
    FakeHermesTaskDispatchExecutor,
    HermesTaskDispatchExecutor,
    TaskDispatchExecutor,
)
from app.services.task_dispatch_coordinator import TaskDispatchCoordinator

# Singleton instances for local lifecycle
_task_repo = SagaraJobRepository()
_approval_repo = InMemoryApprovalRepository()
_activity_repo = InMemoryActivityRepository()
_sqlite_audit_repo = SqliteAuditRepository()
_audit_repo = _sqlite_audit_repo
_persistent_idempotency_store = PersistentIdempotencyStore()
_authorization_service = AuthorizationService()
_governance_repo = SagaraHermesGovernanceRepository()
_artifact_repo = InMemoryArtifactRepository()

_profile_adapter = None
_skill_adapter = None
_runtime_adapter = None
_profile_service = None
_skill_service = None
_runtime_service = None
_agent_service = None
_activity_service = None
_audit_service = None
_governance_service = None
_artifact_service = None
_task_service = None
_approval_service = None
_snapshot_service = None
_realtime_manager = None
_realtime_snapshot_service = None
_realtime_sampler = None
_preflight_service = None
_action_intent_service = None
_executor = None
_task_dispatch_coordinator = None


def reconfigure_dependencies() -> None:
    """Initialize or reconfigure adapters and services based on active settings."""
    global _profile_adapter, _skill_adapter, _runtime_adapter
    global _profile_service, _skill_service, _runtime_service, _agent_service
    global _activity_service, _audit_service, _governance_service, _artifact_service
    global _task_service, _approval_service, _snapshot_service
    global _realtime_manager, _realtime_snapshot_service, _realtime_sampler
    global _preflight_service, _action_intent_service

    # Initialize Mission Control SQLite database & run migrations
    try:
        init_db()
    except Exception as e:
        # In testing environments, ensure clean fallback or error logging
        pass

    if settings.profile_source == "sagara":
        _profile_adapter = SagaraProfileCatalogAdapter(settings.sagara_project_root)
    else:
        _profile_adapter = MockProfileAdapter()

    if settings.skill_source == "sagara":
        _skill_adapter = SagaraSkillCatalogAdapter(settings.sagara_project_root)
    else:
        _skill_adapter = MockSkillAdapter()

    if settings.runtime_source == "hermes":
        _runtime_adapter = HermesSqliteRuntimeAdapter(db_path=settings.hermes_state_db_path)
    else:
        _runtime_adapter = MockRuntimeAdapter()

    is_mock_agent = (settings.profile_source == "mock" and settings.runtime_source == "mock")
    _agent_service = AgentProjectionService(
        profile_catalog=_profile_adapter,
        skill_catalog=_skill_adapter,
        runtime_reader=_runtime_adapter,
        task_repo=_task_repo,
        approval_repo=_approval_repo,
        is_mock=is_mock_agent,
    )


    _profile_service = ProfileService(_profile_adapter)
    _skill_service = SkillService(_skill_adapter)
    _runtime_service = RuntimeService(_runtime_adapter)
    _activity_service = ActivityService(_activity_repo)
    _audit_service = AuditService(_audit_repo)
    _governance_service = GovernanceService(_governance_repo)
    _artifact_service = ArtifactService(_artifact_repo)

    _task_service = TaskService(_task_repo, _audit_repo, _activity_repo)
    _approval_service = ApprovalService(_approval_repo, _audit_repo, _activity_repo)
    _snapshot_service = MissionControlSnapshotService(
        _agent_service,
        _task_repo,
        _approval_repo,
        _runtime_adapter,
        _activity_repo,
    )
    _realtime_manager = RealtimeConnectionManager(
        replay_size=settings.realtime_replay_size,
        client_queue_size=settings.realtime_client_queue_size,
        max_connections=settings.realtime_max_connections,
    )
    _realtime_snapshot_service = CanonicalSnapshotService(
        _agent_service,
        _task_repo,
        _approval_repo,
        _runtime_adapter,
        _activity_repo,
    )
    _realtime_sampler = RealtimeSampler(
        _realtime_snapshot_service,
        _realtime_manager,
        interval_seconds=settings.realtime_interval_seconds,
        heartbeat_interval_seconds=settings.realtime_heartbeat_interval_seconds,
    )

    _preflight_service = ActionPreflightService(
        profile_catalog=_profile_adapter,
        skill_catalog=_skill_adapter,
        agent_service=_agent_service,
        task_repo=_task_repo,
    )
    _action_intent_service = ActionIntentService(
        auth_service=_authorization_service,
        preflight_service=_preflight_service,
    )

    global _executor, _task_dispatch_coordinator
    if settings.execution_enabled:
        if settings.hermes_binary and os.path.isfile(settings.hermes_binary):
            _executor = HermesTaskDispatchExecutor(
                binary_path=settings.hermes_binary,
                hermes_home_dir=settings.hermes_home_dir,
            )
        else:
            _executor = FakeHermesTaskDispatchExecutor()
    else:
        _executor = DisabledActionExecutor()

    _task_dispatch_coordinator = TaskDispatchCoordinator(
        conn=get_db_connection(),
        executor=_executor,
        profile_registry=_profile_adapter,
        task_repository=_task_repo,
        idempotency_store=_persistent_idempotency_store,
        realtime_service=_realtime_manager,
        action_intent_service=_action_intent_service,
    )


# Initial bootstrap
reconfigure_dependencies()



def get_correlation_id(
    request: Request,
    x_correlation_id: Optional[str] = Header(None, alias="X-Correlation-ID"),
) -> str:
    # Validate length and format; fallback to clean generated uuid
    if x_correlation_id and 4 <= len(x_correlation_id) <= 64:
        request.state.correlation_id = x_correlation_id
        return x_correlation_id
    corr = f"corr-{uuid.uuid4().hex[:12]}"
    request.state.correlation_id = corr
    return corr


def get_profile_service() -> ProfileService:
    return _profile_service


def get_skill_service() -> SkillService:
    return _skill_service


def get_runtime_service() -> RuntimeService:
    return _runtime_service


def get_agent_service() -> AgentProjectionService:
    return _agent_service


def get_task_service() -> TaskService:
    return _task_service


def get_approval_service() -> ApprovalService:
    return _approval_service


def get_activity_service() -> ActivityService:
    return _activity_service


def get_audit_service() -> AuditService:
    return _audit_service


def get_governance_service() -> GovernanceService:
    return _governance_service


def get_artifact_service() -> ArtifactService:
    return _artifact_service


def get_snapshot_service() -> MissionControlSnapshotService:
    return _snapshot_service


def get_idempotency_store() -> PersistentIdempotencyStore:
    return _persistent_idempotency_store


def get_sqlite_audit_repo() -> SqliteAuditRepository:
    return _sqlite_audit_repo


def get_authorization_service() -> AuthorizationService:
    return _authorization_service


def get_preflight_service() -> ActionPreflightService:
    return _preflight_service


def get_action_intent_service() -> ActionIntentService:
    return _action_intent_service


def get_realtime_manager() -> RealtimeConnectionManager:
    return _realtime_manager


def get_realtime_snapshot_service() -> CanonicalSnapshotService:
    return _realtime_snapshot_service


def get_realtime_sampler() -> RealtimeSampler:
    return _realtime_sampler


def get_executor() -> TaskDispatchExecutor:
    return _executor


def get_task_dispatch_coordinator() -> TaskDispatchCoordinator:
    return _task_dispatch_coordinator

