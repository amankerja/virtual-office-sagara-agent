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

/**
 * Format full date and time (UTC/local)
 */
export function formatFullDateTime(isoTimestamp?: string | null): string {
  if (!isoTimestamp) return '—'
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Format time only (HH:mm:ss)
 */
export function formatTimeOnly(isoTimestamp?: string | null): string {
  if (!isoTimestamp) return '—'
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Format token count compactly (e.g. 1.2M, 45.3k)
 */
export function formatCompactTokens(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toLocaleString()
}

/**
 * Format simple uptime in hours safely from startedAt timestamp.
 * Returns '—' when startedAt is absent or invalid (never fabricates sample hours).
 */
export function formatUptimeHours(startedAt?: string | null): string {
  if (!startedAt) return '—'
  const time = new Date(startedAt).getTime()
  if (Number.isNaN(time)) return '—'
  const hours = Math.max(1, Math.floor((Date.now() - time) / (1000 * 60 * 60)))
  return `${hours}h`
}

/**
 * Format detailed uptime (hours + minutes) safely from startedAt timestamp.
 * Returns '—' when startedAt is absent or invalid (never fabricates sample uptime).
 */
export function formatUptimeDetailed(startedAt?: string | null): string {
  if (!startedAt) return '—'
  const time = new Date(startedAt).getTime()
  if (Number.isNaN(time)) return '—'
  const diffMs = Math.max(0, Date.now() - time)
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

/**
 * Format uptime safely from total seconds.
 * Returns '—' when seconds is absent or invalid.
 */
export function formatUptimeSeconds(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds < 0) return '—'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

