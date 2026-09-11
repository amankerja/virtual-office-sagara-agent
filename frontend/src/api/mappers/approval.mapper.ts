import type { ApprovalDto, ApprovalDecisionInputDto } from '../dto/approval.dto';
import type {
  ApprovalProjection,
  ApprovalState,
  ApprovalRisk,
  ApprovalActionType,
  ApprovalDecisionInput,
} from '@/types/approval';
import { mapUnknownEnum, preserveNumber } from './common.mapper';

const ALLOWED_APPROVAL_STATES: readonly ApprovalState[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
];

const ALLOWED_APPROVAL_RISKS: readonly ApprovalRisk[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const ALLOWED_ACTION_TYPES: readonly ApprovalActionType[] = [
  'SEND_EMAIL',
  'POST_CONTENT',
  'WRITE_EXTERNAL',
  'DELETE_EXTERNAL',
  'EXECUTE_CODE',
  'INFRASTRUCTURE_CHANGE',
  'FINANCIAL_ACTION',
  'OTHER',
];

export function mapApprovalDtoToDomain(dto: ApprovalDto): ApprovalProjection {
  return {
    id: dto.id,
    state: mapUnknownEnum(dto.state, ALLOWED_APPROVAL_STATES, 'PENDING'),
    risk: mapUnknownEnum(dto.risk, ALLOWED_APPROVAL_RISKS, 'MEDIUM'),
    actionType: mapUnknownEnum(dto.action_type, ALLOWED_ACTION_TYPES, 'OTHER'),

    title: dto.title,
    description: dto.description ?? undefined,
    reasonRequired: dto.reason_required ?? undefined,

    taskId: dto.task_id ?? undefined,
    agentId: dto.agent_id ?? undefined,
    sessionId: dto.session_id ?? undefined,

    requestedAt: dto.requested_at,
    expiresAt: dto.expires_at ?? undefined,

    target: dto.target
      ? {
          type: dto.target.type ?? undefined,
          label: dto.target.label ?? undefined,
        }
      : undefined,

    preview: dto.preview
      ? {
          summary: dto.preview.summary ?? undefined,
          fields: dto.preview.fields ?? undefined,
          sensitiveFields: dto.preview.sensitive_fields ?? undefined,
        }
      : undefined,

    decision: dto.decision
      ? {
          decidedAt: dto.decision.decided_at ?? undefined,
          decisionMaker: dto.decision.decision_maker ?? undefined,
          reason: dto.decision.reason ?? undefined,
        }
      : undefined,

    audit: dto.audit
      ? dto.audit.map((a) => ({
          stage: a.stage,
          timestamp: a.timestamp,
          actor: a.actor ?? undefined,
          note: a.note ?? undefined,
        }))
      : undefined,

    revision: preserveNumber(dto.revision ?? dto.version),
    version: preserveNumber(dto.version ?? dto.revision),
  };
}

export function mapApprovalDecisionToDto(input: ApprovalDecisionInput): ApprovalDecisionInputDto {
  return {
    reason: input.reason ?? null,
  };
}
export const mapApprovalDecisionInputToDto = mapApprovalDecisionToDto;
