/**
 * Shared formatting utilities for Sagara Mission Control
 */

/**
 * Format an operational numeric value. Distinguishes confirmed 0 from undefined/null (unknown).
 * Returns '—' for unknown values.
 */
export function formatMetricNumber(
  value: number | undefined | null,
  fallback = '—'
): string {
  if (value === undefined || value === null) {
    return fallback
  }
  return value.toLocaleString()
}

/**
 * Format currency in USD. Returns '—' for unknown values, and '$0.00' for confirmed 0.
 */
export function formatCurrencyUsd(
  value: number | undefined | null,
  fallback = '—'
): string {
  if (value === undefined || value === null) {
    return fallback
  }
  return `$${value.toFixed(2)}`
}

/**
 * Format relative or human-readable age timestamp.
 */
export function formatTimestampRelative(isoTimestamp?: string | null): string {
  if (!isoTimestamp) return '—'
  const diffMs = Date.now() - new Date(isoTimestamp).getTime()
  if (Number.isNaN(diffMs)) return '—'

  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 45) return `${diffSec}s ago`

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
