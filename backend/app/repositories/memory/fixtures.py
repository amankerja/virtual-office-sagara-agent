"""Backend-owned fictional fixtures for local mock development and testing.

Strictly adheres to:
- ISO 8601 UTC timestamps
- UNKNOWN != ZERO semantics
- Canonical enums
- Zero production data / credentials
"""

from typing import Any
from app.schemas.activity import ActivityDto
from app.schemas.agents import AgentDto
from app.schemas.approvals import ApprovalDto
from app.schemas.artifacts import ArtifactDto
from app.schemas.audit import AuditRecordDto
from app.schemas.common import EntityReference, RelatedEntities
from app.schemas.delegations import DelegationDto
from app.schemas.governance import (
    GovernanceBudgetDto,
    GovernanceCostDto,
    GovernanceSnapshotDto,
    GovernanceTokensDto,
    GovernanceUsageDto,
)
from app.schemas.profiles import ProfileDto
from app.schemas.runtime import GatewayDto, RuntimeEventDto, RuntimeOverviewDto
from app.schemas.sessions import SessionDto
from app.schemas.skills import SkillDto
from app.schemas.tasks import TaskDto, TaskProgressDto, TaskTimelineEventDto

REF_TIMESTAMP = "2026-09-09T05:30:00Z"

PROFILES_FIXTURE: list[ProfileDto] = [
    ProfileDto(
        id="prof-sagara-lead",
        name="Sagara Lead Orchestrator",
        role="Lead Autonomous Coordinator",
        description="Autonomous mission delegation, multi-agent scheduling and state orchestration",
        enabled=True,
        memory_namespace="sagara-lead-ns",
        allowed_skills=["skill-task-routing", "skill-code-executor", "skill-security-guard"],
        configuration_state="CONFIGURED",
        model_tier="FRONTIER",
    ),
    ProfileDto(
        id="prof-codex-engineer",
        name="Codex Core Engineer",
        role="Senior Systems Programmer",
        description="Full-stack implementation, refactoring, and code verification",
        enabled=True,
        memory_namespace="codex-eng-ns",
        allowed_skills=["skill-code-executor", "skill-git-tools", "skill-test-runner"],
        configuration_state="CONFIGURED",
        model_tier="ADVANCED",
    ),
    ProfileDto(
        id="prof-arch-reviewer",
        name="Architecture Reviewer",
        role="System Architect",
        description="Design pattern validation, contract boundary enforcement, and ADR synthesis",
        enabled=True,
        memory_namespace="arch-rev-ns",
        allowed_skills=["skill-diagram-builder", "skill-contract-validator"],
        configuration_state="CONFIGURED",
        model_tier="FRONTIER",
    ),
    ProfileDto(
        id="prof-sec-auditor",
        name="Security Sentinel",
        role="Security Compliance Officer",
        description="Redaction auditing, secret scanning, and permission boundary validation",
        enabled=True,
        memory_namespace="sec-audit-ns",
        allowed_skills=["skill-security-guard", "skill-secret-scanner"],
        configuration_state="CONFIGURED",
        model_tier="FAST",
    ),
    ProfileDto(
        id="prof-data-analyst",
        name="Data Intelligence Agent",
        role="Data & Metric Analyst",
        description="Telemetry aggregation, trend analysis, and governance modeling",
        enabled=True,
        memory_namespace="data-intel-ns",
        allowed_skills=["skill-sql-reader", "skill-metric-calculator"],
        configuration_state="CONFIGURED",
        model_tier="FAST",
    ),
    ProfileDto(
        id="prof-doc-writer",
        name="Documentation Specialist",
        role="Technical Writer",
        description="API documentation generation, changelog synthesis, and system manuals",
        enabled=False,
        memory_namespace="doc-writer-ns",
        allowed_skills=["skill-markdown-gen"],
        configuration_state="CONFIGURATION_INCOMPLETE",
        model_tier="STANDARD",
    ),
]

AGENTS_FIXTURE: list[AgentDto] = [
    AgentDto(
        id="agent-alpha",
        definition={
            "id": "prof-sagara-lead",
            "name": "Alpha Lead Orchestrator",
            "role": "Lead Autonomous Coordinator",
            "description": "Orchestrates multi-agent tasks and workflow lifecycles",
            "enabled": True,
            "memory_namespace": "sagara-lead-ns",
            "allowed_skills": ["skill-task-routing", "skill-code-executor"],
        },
        runtime={
            "state": "ACTIVE",
            "confidence": "CONFIRMED",
            "last_activity_at": "2026-09-09T05:28:10Z",
            "session_count": 3,
            "active_delegations": 2,
            "current_session_id": "sess-01",
            "current_task_id": "tsk-01",
            "model": "gemini-1.5-pro",
        },
        capabilities={"total": 5, "healthy": 5, "degraded": 0, "missing": 0},
        usage={"input_tokens": 124500, "output_tokens": 34200, "estimated_cost_usd": 0.42, "actual_cost_usd": 0.40},
    ),
    AgentDto(
        id="agent-bravo",
        definition={
            "id": "prof-codex-engineer",
            "name": "Bravo Core Engineer",
            "role": "Senior Systems Programmer",
            "description": "Autonomous TypeScript & Python implementation",
            "enabled": True,
            "memory_namespace": "codex-eng-ns",
            "allowed_skills": ["skill-code-executor", "skill-test-runner"],
        },
        runtime={
            "state": "ACTIVE",
            "confidence": "CONFIRMED",
            "last_activity_at": "2026-09-09T05:29:45Z",
            "session_count": 5,
            "active_delegations": 1,
            "current_session_id": "sess-02",
            "current_task_id": "tsk-02",
            "model": "claude-3-5-sonnet",
        },
        capabilities={"total": 8, "healthy": 7, "degraded": 1, "missing": 0},
        usage={"input_tokens": 280000, "output_tokens": 94000, "estimated_cost_usd": 1.85, "actual_cost_usd": 1.82},
    ),
    AgentDto(
        id="agent-charlie",
        definition={
            "id": "prof-arch-reviewer",
            "name": "Charlie Architecture Reviewer",
            "role": "System Architect",
            "description": "Validates boundary integrity and structural contracts",
            "enabled": True,
            "memory_namespace": "arch-rev-ns",
            "allowed_skills": ["skill-contract-validator"],
        },
        runtime={
            "state": "IDLE",
            "confidence": "CONFIRMED",
            "last_activity_at": "2026-09-09T05:15:00Z",
            "session_count": 0,  # Confirmed zero
            "active_delegations": 0,  # Confirmed zero
            "model": "gpt-4o",
        },
        capabilities={"total": 3, "healthy": 3, "degraded": 0, "missing": 0},
        usage={"input_tokens": 45000, "output_tokens": 12000, "estimated_cost_usd": 0.15, "actual_cost_usd": 0.14},
    ),
    AgentDto(
        id="agent-delta",
        definition={
            "id": "prof-sec-auditor",
            "name": "Delta Security Sentinel",
            "role": "Security Compliance Officer",
            "description": "Continuous inspection of runtime actions and secret redaction",
            "enabled": True,
            "memory_namespace": "sec-audit-ns",
            "allowed_skills": ["skill-security-guard"],
        },
        runtime={
            "state": "AWAITING_APPROVAL",
            "confidence": "CONFIRMED",
            "last_activity_at": "2026-09-09T05:22:30Z",
            "session_count": 1,
            "active_delegations": 1,
            "current_task_id": "tsk-04",
            "model": "claude-3-5-sonnet",
        },
        capabilities={"total": 4, "healthy": 4, "degraded": 0, "missing": 0},
        usage={"input_tokens": 82000, "output_tokens": 19000, "estimated_cost_usd": 0.38, "actual_cost_usd": None},  # UNKNOWN actual cost
    ),
    AgentDto(
        id="agent-echo",
        definition={
            "id": "prof-data-analyst",
            "name": "Echo Data Intelligence",
            "role": "Data & Metric Analyst",
            "description": "Observational cost tracking and system telemetry analytics",
            "enabled": True,
            "memory_namespace": "data-intel-ns",
        },
        runtime={
            "state": "RECENTLY_ACTIVE",
            "confidence": "INFERRED",
            "last_activity_at": "2026-09-09T05:24:00Z",
            "session_count": 1,
            "active_delegations": 0,
            "model": "gemini-1.5-flash",
        },
        capabilities={"total": 3, "healthy": 2, "degraded": 1, "missing": 0},
        usage={"input_tokens": 31000, "output_tokens": 7500, "estimated_cost_usd": 0.05, "actual_cost_usd": 0.05},
    ),
    AgentDto(
        id="agent-foxtrot",
        definition={
            "id": "prof-doc-writer",
            "name": "Foxtrot Documentation Specialist",
            "role": "Technical Writer",
            "description": "Changelog and system documentation synthesizer",
            "enabled": False,
        },
        runtime={
            "state": "CONFIGURATION_INCOMPLETE",
            "confidence": "STALE",
            "session_count": None,  # Telemetry unknown
            "active_delegations": None,  # Telemetry unknown
        },
        capabilities={"total": 2, "healthy": 0, "degraded": 0, "missing": 2},
        usage=None,
    ),
]

SKILLS_FIXTURE: list[SkillDto] = [
    SkillDto(
        id="skill-code-executor",
        name="Code Execution Engine",
        category="Development",
        description="Executes sandboxed scripts and unit test harnesses",
        version="2.1.0",
        registration="REGISTERED",
        installation="INSTALLED",
        health="HEALTHY",
        execution="OBSERVED_ACTIVE",
        owner_pid=4192,
        last_executed_at="2026-09-09T05:29:12Z",
    ),
    SkillDto(
        id="skill-task-routing",
        name="Task Routing & Scheduling",
        category="Orchestration",
        description="Dispatches atomic tasks based on agent capability matrices",
        version="1.4.0",
        registration="REGISTERED",
        installation="INSTALLED",
        health="HEALTHY",
        execution="OBSERVED_ACTIVE",
        owner_pid=4190,
        last_executed_at="2026-09-09T05:28:44Z",
    ),
    SkillDto(
        id="skill-security-guard",
        name="Security Boundary Enforcement",
        category="Security",
        description="Inspects outgoing requests for secret leaks and policy violations",
        version="3.0.1",
        registration="REGISTERED",
        installation="INSTALLED",
        health="HEALTHY",
        execution="COMPLETED",
        owner_pid=4201,
        last_executed_at="2026-09-09T05:22:30Z",
    ),
    SkillDto(
        id="skill-git-tools",
        name="Git Automation Harness",
        category="Development",
        description="Automated branching, diff generation, and clean working tree checks",
        version="1.2.0",
        registration="REGISTERED",
        installation="INSTALLED",
        health="DEGRADED",
        execution="REQUESTED",
        owner_pid=None,
        last_executed_at="2026-09-09T04:55:00Z",
    ),
    SkillDto(
        id="skill-sql-reader",
        name="SQL Analytics Reader",
        category="Data",
        description="Read-only query generator for telemetry analytics tables",
        version="1.0.0",
        registration="REGISTERED",
        installation="MISSING",
        health="MISSING",
        execution="NOT_OBSERVED",
    ),
    SkillDto(
        id="skill-unregistered-tool",
        name="Experimental Sandbox",
        category="Experimental",
        description="Unregistered experimental plugin tool",
        version="0.1.0",
        registration="UNREGISTERED",
        installation="UNKNOWN",
        health="UNKNOWN",
        execution="EXECUTION_UNKNOWN",
    ),
]

GATEWAY_FIXTURE = GatewayDto(
    status="HEALTHY",
    connected=True,
    latency_ms=12,
    last_heartbeat_at="2026-09-09T05:29:55Z",
    host="127.0.0.1",
    pid=3140,
    backend_id="mc-backend-local-01",
    heartbeat_age_seconds=5,
    restart_count=0,
)

RUNTIME_OVERVIEW_FIXTURE = RuntimeOverviewDto(
    status="HEALTHY",
    uptime_seconds=86400,
    active_sessions_count=4,
    active_workers_count=3,
    confidence="CONFIRMED",
    system_load={"cpu_percent": 14.2, "memory_used_mb": 420, "memory_total_mb": 16384},
)

RUNTIME_EVENTS_FIXTURE: list[RuntimeEventDto] = [
    RuntimeEventDto(
        id="evt-rt-01",
        type="HEARTBEAT",
        timestamp="2026-09-09T05:29:55Z",
        severity="INFO",
        message="Gateway heartbeat acknowledged with 12ms latency",
    ),
    RuntimeEventDto(
        id="evt-rt-02",
        type="WORKER_SPAWN",
        timestamp="2026-09-09T05:28:10Z",
        severity="INFO",
        message="Worker thread spawned for Task tsk-01 under Agent Alpha",
    ),
]

SESSIONS_FIXTURE: list[SessionDto] = [
    SessionDto(
        id="sess-01",
        profile_id="prof-sagara-lead",
        agent_id="agent-alpha",
        source="ORCHESTRATION_QUEUE",
        state="ACTIVE",
        model="gemini-1.5-pro",
        provider="google",
        started_at="2026-09-09T04:30:00Z",
        last_activity_at="2026-09-09T05:28:10Z",
        message_count=42,
        tool_call_count=18,
    ),
    SessionDto(
        id="sess-02",
        profile_id="prof-codex-engineer",
        agent_id="agent-bravo",
        source="DEVELOPMENT_PIPELINE",
        state="ACTIVE",
        model="claude-3-5-sonnet",
        provider="anthropic",
        started_at="2026-09-09T05:00:00Z",
        last_activity_at="2026-09-09T05:29:45Z",
        message_count=28,
        tool_call_count=12,
    ),
    SessionDto(
        id="sess-03",
        profile_id="prof-arch-reviewer",
        agent_id="agent-charlie",
        source="SYSTEM_POLL",
        state="COMPLETED",
        model="gpt-4o",
        provider="openai",
        started_at="2026-09-09T03:00:00Z",
        last_activity_at="2026-09-09T05:15:00Z",
        message_count=15,
        tool_call_count=0,  # Confirmed zero tool calls
    ),
    SessionDto(
        id="sess-04",
        profile_id="prof-sec-auditor",
        agent_id="agent-delta",
        source="AUDIT_DISPATCH",
        state="ACTIVE",
        model="claude-3-5-sonnet",
        provider="anthropic",
        started_at="2026-09-09T05:10:00Z",
        last_activity_at="2026-09-09T05:22:30Z",
        message_count=9,
        tool_call_count=None,  # Telemetry unavailable / unknown
    ),
]

DELEGATIONS_FIXTURE: list[DelegationDto] = [
    DelegationDto(
        id="del-01",
        parent_session_id="sess-01",
        target_agent_id="agent-bravo",
        task_title="Implement API Conformance Suite",
        state="RUNNING",
        worker_pid="4192",
        owner_pid=4192,
        started_at="2026-09-09T05:05:00Z",
    ),
    DelegationDto(
        id="del-02",
        parent_session_id="sess-01",
        target_agent_id="agent-delta",
        task_title="Audit Mutation Gate Payloads",
        state="QUEUED",
        worker_pid=None,
        owner_pid=None,
        started_at="2026-09-09T05:20:00Z",
    ),
]

TASKS_FIXTURE: list[TaskDto] = [
    TaskDto(
        id="tsk-01",
        title="Synthesize System Domain Projections",
        description="Verify 3-layer architecture separation across all frontend components",
        state="RUNNING",
        priority="HIGH",
        created_at="2026-09-09T03:00:00Z",
        updated_at="2026-09-09T05:28:10Z",
        assigned_agent_id="agent-alpha",
        requested_skills=["skill-task-routing"],
        capability_requirements=["orchestration"],
        due_at="2026-09-09T08:00:00Z",
        progress=TaskProgressDto(completed=4, total=5, label="Normalizing DTO Mappers"),
        timeline=[
            TaskTimelineEventDto(
                id="evt-t1-1",
                type="CREATED",
                timestamp="2026-09-09T03:00:00Z",
                actor="System Lead",
                detail="Task created via Command Center",
            ),
            TaskTimelineEventDto(
                id="evt-t1-2",
                type="DISPATCHED",
                timestamp="2026-09-09T03:05:00Z",
                actor="Operator",
                detail="Dispatched to Agent Alpha",
            ),
        ],
        revision=1,
        version=1,
    ),
    TaskDto(
        id="tsk-02",
        title="FastAPI Backend Foundation Assembly",
        description="Implement REST routes, schemas, and contract verification test suite",
        state="READY",
        priority="CRITICAL",
        created_at="2026-09-09T04:00:00Z",
        updated_at="2026-09-09T05:20:00Z",
        assigned_agent_id="agent-bravo",
        requested_skills=["skill-code-executor"],
        capability_requirements=["backend"],
        due_at="2026-09-09T10:00:00Z",
        progress=TaskProgressDto(completed=0, total=3, label="Pending Dispatch"),
        revision=1,
        version=1,
    ),
    TaskDto(
        id="tsk-03",
        title="Draft Architecture Review Report",
        description="Synthesize ADR findings for offline presentation",
        state="DRAFT",
        priority="LOW",
        created_at="2026-09-09T04:30:00Z",
        updated_at="2026-09-09T04:30:00Z",
        assigned_agent_id=None,
        revision=1,
        version=1,
    ),
    TaskDto(
        id="tsk-04",
        title="Authorize Sensitive Gateway Configuration",
        description="Requires operator sign-off before modifying network timeouts",
        state="AWAITING_APPROVAL",
        priority="CRITICAL",
        created_at="2026-09-09T05:15:00Z",
        updated_at="2026-09-09T05:22:30Z",
        assigned_agent_id="agent-delta",
        revision=1,
        version=1,
    ),
]

APPROVALS_FIXTURE: list[ApprovalDto] = [
    ApprovalDto(
        id="appr-01",
        state="PENDING",
        risk="HIGH",
        action_type="GATEWAY_CONFIG_CHANGE",
        title="Modify Gateway Request Timeout Thresholds",
        description="Request to increase timeout limits from 30s to 120s for long-running batches.",
        reason_required=True,
        task_id="tsk-04",
        agent_id="agent-delta",
        requested_at="2026-09-09T05:22:30Z",
        preview={
            "summary": "Gateway timeout adjustment from 30000ms to 120000ms",
            "sensitive_fields": ["timeout_ms", "max_concurrent_workers"],
            "impact": "May increase server memory footprint during high burst periods.",
        },
        audit=[],
        revision=1,
        version=1,
    ),
    ApprovalDto(
        id="appr-02",
        state="APPROVED",
        risk="MEDIUM",
        action_type="DATABASE_MIGRATION_PREVIEW",
        title="Approve Local Schema Dry Run",
        description="Dry-run verification of local sqlite table projections.",
        reason_required=False,
        requested_at="2026-09-09T04:00:00Z",
        decision={
            "decided_at": "2026-09-09T04:05:00Z",
            "decision_maker": "Operator (Lead)",
            "reason": "Verified dry-run output against test contract.",
        },
        audit=[
            {
                "stage": "Approved",
                "timestamp": "2026-09-09T04:05:00Z",
                "actor": "Operator (Lead)",
                "note": "Verified dry-run output against test contract.",
            }
        ],
        revision=2,
        version=2,
    ),
    ApprovalDto(
        id="appr-03",
        state="REJECTED",
        risk="CRITICAL",
        action_type="EXTERNAL_EGRESS_REQUEST",
        title="Direct Internet Access Request",
        description="Agent requested external API egress outside sandbox boundary.",
        reason_required=True,
        requested_at="2026-09-09T03:30:00Z",
        decision={
            "decided_at": "2026-09-09T03:35:00Z",
            "decision_maker": "Security Admin",
            "reason": "External egress prohibited by safety policy.",
        },
        revision=2,
        version=2,
    ),
]

ACTIVITY_FIXTURE: list[ActivityDto] = [
    ActivityDto(
        id="act-01",
        timestamp="2026-09-09T05:29:45Z",
        category="TASK",
        severity="INFO",
        title="Task Progress Update",
        description="Agent Bravo completed step 4 of Task tsk-01",
        actor=EntityReference(type="AGENT", id="agent-bravo", label="Bravo Core Engineer"),
        entity=EntityReference(type="TASK", id="tsk-01", label="Synthesize System Domain Projections"),
        correlation_id="corr-20260909-001",
        related=RelatedEntities(task_id="tsk-01", agent_id="agent-bravo"),
    ),
    ActivityDto(
        id="act-02",
        timestamp="2026-09-09T05:22:30Z",
        category="APPROVAL",
        severity="WARNING",
        title="Approval Gate Triggered",
        description="Gate appr-01 awaiting operator review for Task tsk-04",
        actor=EntityReference(type="AGENT", id="agent-delta", label="Delta Security Sentinel"),
        entity=EntityReference(type="APPROVAL", id="appr-01", label="Modify Gateway Request Timeout Thresholds"),
        correlation_id="corr-20260909-002",
        related=RelatedEntities(task_id="tsk-04", approval_id="appr-01", agent_id="agent-delta"),
    ),
]

AUDIT_FIXTURE: list[AuditRecordDto] = [
    AuditRecordDto(
        id="aud-01",
        timestamp="2026-09-09T04:05:00Z",
        actor=EntityReference(type="USER", id="op-01", label="Operator (Lead)"),
        action="APPROVAL_DECIDED",
        target=EntityReference(type="APPROVAL", id="appr-02", label="Approve Local Schema Dry Run"),
        outcome="SUCCESS",
        reason="Verified dry-run output against test contract.",
        changes=[{"field": "state", "before": "PENDING", "after": "APPROVED"}],
        correlation_id="corr-20260909-aud01",
        related=RelatedEntities(approval_id="appr-02"),
    ),
    AuditRecordDto(
        id="aud-02",
        timestamp="2026-09-09T03:35:00Z",
        actor=EntityReference(type="USER", id="sec-01", label="Security Admin"),
        action="APPROVAL_DECIDED",
        target=EntityReference(type="APPROVAL", id="appr-03", label="Direct Internet Access Request"),
        outcome="DENIED",
        reason="External egress prohibited by safety policy.",
        changes=[{"field": "state", "before": "PENDING", "after": "REJECTED"}],
        correlation_id="corr-20260909-aud02",
        related=RelatedEntities(approval_id="appr-03"),
    ),
]

GOVERNANCE_FIXTURE = GovernanceSnapshotDto(
    usage=GovernanceUsageDto(
        tokens=GovernanceTokensDto(input_tokens=562500, output_tokens=166700, total_tokens=729200),
        cost=GovernanceCostDto(
            estimated_cost_usd=2.85,
            actual_cost_usd=2.76,  # Strictly distinct from estimated_cost_usd
        ),
        breakdown={
            "by_agent": {
                "agent-alpha": 0.42,
                "agent-bravo": 1.85,
                "agent-charlie": 0.15,
                "agent-delta": 0.38,
                "agent-echo": 0.05,
            }
        },
        daily_trend=[
            {"date": "2026-09-07", "cost_usd": 1.45, "tokens": 380000},
            {"date": "2026-09-08", "cost_usd": 2.10, "tokens": 540000},
            {"date": "2026-09-09", "cost_usd": 2.85, "tokens": 729200},
        ],
    ),
    budget=GovernanceBudgetDto(
        monthly_limit_usd=100.0,
        current_spend_usd=6.40,
        forecast_spend_usd=45.0,
        currency="USD",
        burn_rate_daily_usd=2.13,
        status="HEALTHY",
    ),
    limits={"max_daily_spend_usd": 10.0, "require_approval_over_usd": 5.0},
)

ARTIFACTS_FIXTURE: list[ArtifactDto] = [
    ArtifactDto(
        id="art-01",
        task_id="tsk-01",
        session_id="sess-01",
        name="contract-freeze-report.pdf",
        media_type="application/pdf",
        size_bytes=1048576,
        created_at="2026-09-09T05:00:00Z",
        status="AVAILABLE",
    ),
    ArtifactDto(
        id="art-02",
        task_id="tsk-02",
        session_id="sess-02",
        name="openapi-conformance.json",
        media_type="application/json",
        size_bytes=32768,
        created_at="2026-09-09T05:25:00Z",
        status="PROCESSING",
    ),
]
