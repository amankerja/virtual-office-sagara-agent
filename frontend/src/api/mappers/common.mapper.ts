import type { PageResultDto, ApiErrorDto } from '../dto/common.dto';
import type { PageResult, ApiErrorEnvelope } from '@/types/common';

/**
 * Robust unknown enum forward-compatibility mapper (Prompt 07 Section 48).
 * If the backend sends an unknown or unmapped enum value, returns fallback without crashing.
 */
export function mapUnknownEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  if (!value) return fallback;
  const upper = value.trim().toUpperCase() as T;
  if (allowed.includes(upper)) {
    return upper;
  }
  // Try exact match in case of case-sensitive allowed values
  const exact = value.trim() as T;
  if (allowed.includes(exact)) {
    return exact;
  }
  return fallback;
}

/**
 * Strict null vs zero preservation helper (Prompt 07 Section 15).
 * UNKNOWN ≠ ZERO.
 * If value is null, undefined, or NaN, returns undefined.
 * Only returns a number if the value is explicitly a valid finite number.
 */
export function preserveNumber(val: number | null | undefined): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return undefined;
}

/**
 * Maps pagination envelopes from DTO to domain format.
 */
export function mapPageResult<TDTO, TDomain>(
  dto: PageResultDto<TDTO>,
  itemMapper: (item: TDTO) => TDomain
): PageResult<TDomain> {
  return {
    items: (dto.items || []).map(itemMapper),
    pageInfo: {
      nextCursor: dto.page_info?.next_cursor ?? undefined,
      hasMore: Boolean(dto.page_info?.has_more),
      totalCount: preserveNumber(dto.page_info?.total_count),
    },
  };
}

/**
 * Maps error payloads into canonical ApiErrorEnvelope.
 */
export function mapApiError(errorPayload: unknown): ApiErrorEnvelope {
  if (typeof errorPayload === 'object' && errorPayload !== null && 'error' in errorPayload) {
    const dto = errorPayload as ApiErrorDto;
    return {
      error: {
        code: dto.error?.code || 'UNKNOWN_ERROR',
        message: dto.error?.message || 'An unexpected API error occurred',
        details: dto.error?.details,
        correlationId: dto.error?.correlation_id ?? undefined,
      },
    };
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: typeof errorPayload === 'string' ? errorPayload : 'An unexpected error occurred',
    },
  };
}
