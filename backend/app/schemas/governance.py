from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class GovernanceCostDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    estimated_cost_usd: Optional[float] = None
    actual_cost_usd: Optional[float] = None


class GovernanceTokensDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class GovernanceUsageDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tokens: GovernanceTokensDto
    cost: GovernanceCostDto
    breakdown: Optional[dict[str, Any]] = None
    daily_trend: Optional[list[dict[str, Any]]] = None


class GovernanceBudgetDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    monthly_limit_usd: Optional[float] = None
    current_spend_usd: Optional[float] = None
    forecast_spend_usd: Optional[float] = None
    currency: str = "USD"
    burn_rate_daily_usd: Optional[float] = None
    status: Optional[str] = "HEALTHY"


class GovernanceSnapshotDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    usage: GovernanceUsageDto
    budget: GovernanceBudgetDto
    limits: Optional[dict[str, Any]] = None
    model_allocations: Optional[dict[str, Any]] = None
