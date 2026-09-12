"""
Pydantic schemas and data transfer models for Sagara Canonical Seeder Architecture.
Strictly separates:
- CANONICAL (Profile identity, role, skills, memory namespace)
- PRESENTATION (UI accents, icons, office zones, desk styles)
- DEPLOYMENT (Channel routing, workspace paths)
- POLICY (Risk tiers, approvals, model tiers, schedules)
"""
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 1. Profiles Seed Schemas
# ---------------------------------------------------------------------------

class DelegationConfig(BaseModel):
    can_delegate: bool = False
    allowed_targets: list[str] = Field(default_factory=list)


class ProfileConfiguration(BaseModel):
    risk_tier: str = "MEDIUM"
    approval_class: str = "SUPERVISED"
    configuration_state: str = "COMPLETE"


class ProfileSeedItem(BaseModel):
    id: str
    name: str
    role: str
    description: Optional[str] = None
    enabled: bool = True
    memory_namespace: str
    soul_template: str
    allowed_domains: list[str] = Field(default_factory=list)
    permissions_policy: str = "business-default"
    delegation: DelegationConfig = Field(default_factory=DelegationConfig)
    configuration: ProfileConfiguration = Field(default_factory=ProfileConfiguration)


class ProfilesSeedFile(BaseModel):
    schema_version: str = "1.0.0"
    version: int = 1
    source_validation: Optional[dict[str, Any]] = None
    profiles: list[ProfileSeedItem]


# ---------------------------------------------------------------------------
# 2. Profile Skills Seed Schemas
# ---------------------------------------------------------------------------

class ProfileSkillsSeedFile(BaseModel):
    schema_version: str = "1.0.0"
    version: int = 1
    source_validation: Optional[dict[str, Any]] = None
    profile_domains: dict[str, list[str]] = Field(default_factory=dict)
    base_skills: list[str] = Field(default_factory=list)
    assignments: dict[str, list[str]] = Field(default_factory=dict)
    proposed_capabilities: dict[str, list[Any]] = Field(default_factory=dict)
    proposed_extensions: dict[str, list[str]] = Field(default_factory=dict)
    skill_policies: Optional[dict[str, list[str]]] = None


# ---------------------------------------------------------------------------
# 3. Model Policy Seed Schemas
# ---------------------------------------------------------------------------

class ModelProfilePolicy(BaseModel):
    primary_tier: str
    fallback_tier: Optional[str] = None
    reasoning_profile: Optional[str] = None
    min_context_tokens: Optional[int] = None
    temperature: Optional[float] = None


class ModelPolicySeedFile(BaseModel):
    schema_version: str = "1.0.0"
    version: int = 1
    source_validation: Optional[dict[str, Any]] = None
    supported_tiers: list[str] = Field(default_factory=list)
    profiles: dict[str, ModelProfilePolicy] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# 4. Channel Routes Seed Schemas
# ---------------------------------------------------------------------------

class TelegramConfig(BaseModel):
    central_ingress: bool = True
    default_route_target: str = "lead"
    per_profile_bots_enabled: bool = False


class ChannelRouteItem(BaseModel):
    channel_name: str
    target_profile: str
    domain: str = "operations"
    mention_required: bool = False
    interaction_mode: str = "interactive"
    description: Optional[str] = None


class ChannelRoutesSeedFile(BaseModel):
    schema_version: str = "1.0.0"
    version: int = 1
    source_validation: Optional[dict[str, Any]] = None
    telegram: TelegramConfig = Field(default_factory=TelegramConfig)
    routes: list[ChannelRouteItem] = Field(default_factory=list)
    consolidated_routes: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 5. Workspace Policy Seed Schemas
# ---------------------------------------------------------------------------

class WorkspaceResourceItem(BaseModel):
    resource_id: str
    resource_type: str
    description: Optional[str] = None
    is_sensitive_read_only: bool = False
    permissions: dict[str, str] = Field(default_factory=dict)


class WorkspacePolicySeedFile(BaseModel):
    schema_version: str = "1.0.0"
    version: int = 1
    default_permission: str = "NO_ACCESS"
    valid_modes: list[str] = Field(default_factory=list)
    resources: list[WorkspaceResourceItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 6. Schedule Policy Seed Schemas
# ---------------------------------------------------------------------------

class ScheduleProfilePolicy(BaseModel):
    allowed_schedule_types: list[str] = Field(default_factory=list)
    max_concurrent_schedules: int = 5
    default_timezone: str = "Asia/Jakarta"


class SchedulePolicySeedFile(BaseModel):
    schema_version: str = "1.0.0"
    version: int = 1
    supported_schedule_types: list[str] = Field(default_factory=list)
    policies: dict[str, ScheduleProfilePolicy] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# 7. Presentation Seed Schemas
# ---------------------------------------------------------------------------

class PresentationProfileItem(BaseModel):
    id: str
    icon: str
    label: str
    accent: str
    office_zone: str
    desk_style: str
    sort_order: int


class PresentationSeedFile(BaseModel):
    schema_version: str = "1.0.0"
    version: int = 1
    profiles: list[PresentationProfileItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 8. Seed Manifest Schema
# ---------------------------------------------------------------------------

class SeedManifestFile(BaseModel):
    schema_version: str = "1.0.0"
    seed_version: str = "1.0.0"
    seed_id: str = "sagara-default-profile-blueprint"
    status: Optional[str] = None
    source_validation: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = None
    components: dict[str, str] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Diagnostic & Preview Reporting Models
# ---------------------------------------------------------------------------

class SkillValidationOutcome(BaseModel):
    skill_id: str
    status: str  # RESOLVED, UNRESOLVED, DUPLICATE, DOMAIN_WARNING
    category: Optional[str] = None
    warning_message: Optional[str] = None


class ProfileSkillSummary(BaseModel):
    profile_id: str
    current_count: int = 0
    recommended_count: int = 0
    add_count: int = 0
    remove_count: int = 0
    unresolved_count: int = 0
    domain_warning_count: int = 0
    skills_to_add: list[str] = Field(default_factory=list)
    skills_to_remove: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ValidationReport(BaseModel):
    is_valid: bool
    schema_version: str = "1.0.0"
    seed_version: str = "1.0.0"
    seed_hash: str = ""
    source_mode: str = "production-readonly"
    production_commit: Optional[str] = None
    profile_ids: list[str] = Field(default_factory=list)
    skill_summaries: dict[str, ProfileSkillSummary] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    total_profiles: int = 0
    total_routes: int = 0
    total_resources: int = 0
    total_soul_templates: int = 0
    effective_skill_count: int = 0
    capability_gaps_count: int = 0


class ProfilePreviewItem(BaseModel):
    profile_id: str
    action: str  # UNCHANGED, WOULD_CREATE, WOULD_UPDATE, WOULD_REMOVE
    current_role: Optional[str] = None
    recommended_role: Optional[str] = None
    current_skills: list[str] = Field(default_factory=list)
    recommended_skills: list[str] = Field(default_factory=list)
    skills_to_add: list[str] = Field(default_factory=list)
    skills_to_remove: list[str] = Field(default_factory=list)
    unresolved_skills: list[str] = Field(default_factory=list)
    domain_warnings: list[str] = Field(default_factory=list)
    soul_status: str = "UNKNOWN"
    model_policy: Optional[str] = None
    channel_routes: list[str] = Field(default_factory=list)
    workspace_policy: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)


class PreviewReport(BaseModel):
    seed_id: str
    seed_version: str
    seed_hash: str
    source_mode: str = "production-readonly"
    production_commit: Optional[str] = None
    profiles: list[ProfilePreviewItem] = Field(default_factory=list)
    total_would_create: int = 0
    total_would_update: int = 0
    total_would_remove: int = 0
    total_unchanged: int = 0
    warnings: list[str] = Field(default_factory=list)
