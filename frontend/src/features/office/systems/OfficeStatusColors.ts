/**
 * OfficeStatusColors — Centralized Status, Profile & Hardware Utilization Colors
 * Shared single source of truth across both 3D (Office3D) and 2.5D (Office2_5D) renderers.
 */

import type { AgentStatus } from '@/types/agent'
import type { OfficeZoneType } from '@/features/office/types/office'

// ─── 1. Desk Status Accent Colors ───────────────────────────────────────────

export interface DeskStatusAccent {
  color: string
  emissive: string
  glow: string
  label: string
}

const DESK_STATUS_DARK: Record<AgentStatus, DeskStatusAccent> = {
  ACTIVE: {
    color: '#10b981', // Emerald green
    emissive: '#059669',
    glow: 'rgba(16, 185, 129, 0.45)',
    label: 'ACTIVE',
  },
  RECENTLY_ACTIVE: {
    color: '#10b981',
    emissive: '#059669',
    glow: 'rgba(16, 185, 129, 0.35)',
    label: 'RECENT',
  },
  IDLE: {
    color: '#64748b', // Slate 500
    emissive: '#334155',
    glow: 'rgba(100, 116, 139, 0.25)',
    label: 'IDLE',
  },
  AWAITING_APPROVAL: {
    color: '#f59e0b', // Amber 500
    emissive: '#d97706',
    glow: 'rgba(245, 158, 11, 0.45)',
    label: 'AWAITING APPROVAL',
  },
  DEGRADED: {
    color: '#f97316', // Orange 500
    emissive: '#ea580c',
    glow: 'rgba(249, 115, 22, 0.45)',
    label: 'DEGRADED',
  },
  ERROR: {
    color: '#ef4444', // Red 500
    emissive: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.50)',
    label: 'ERROR',
  },
  OFFLINE: {
    color: '#334155', // Slate 700
    emissive: '#1e293b',
    glow: 'rgba(51, 65, 85, 0.20)',
    label: 'OFFLINE',
  },
  CONFIGURATION_INCOMPLETE: {
    color: '#64748b',
    emissive: '#334155',
    glow: 'rgba(100, 116, 139, 0.25)',
    label: 'CONFIG',
  },
  UNKNOWN: {
    color: '#64748b',
    emissive: '#334155',
    glow: 'rgba(100, 116, 139, 0.25)',
    label: 'UNKNOWN',
  },
}

const DESK_STATUS_LIGHT: Record<AgentStatus, DeskStatusAccent> = {
  ACTIVE: {
    color: '#16a34a', // Green 600
    emissive: '#15803d',
    glow: 'rgba(22, 163, 74, 0.35)',
    label: 'ACTIVE',
  },
  RECENTLY_ACTIVE: {
    color: '#16a34a',
    emissive: '#15803d',
    glow: 'rgba(22, 163, 74, 0.25)',
    label: 'RECENT',
  },
  IDLE: {
    color: '#94a3b8', // Slate 400
    emissive: '#64748b',
    glow: 'rgba(148, 163, 184, 0.20)',
    label: 'IDLE',
  },
  AWAITING_APPROVAL: {
    color: '#d97706', // Amber 600
    emissive: '#b45309',
    glow: 'rgba(217, 119, 6, 0.35)',
    label: 'AWAITING APPROVAL',
  },
  DEGRADED: {
    color: '#ea580c', // Orange 600
    emissive: '#c2410c',
    glow: 'rgba(234, 88, 12, 0.35)',
    label: 'DEGRADED',
  },
  ERROR: {
    color: '#dc2626', // Red 600
    emissive: '#b91c1c',
    glow: 'rgba(220, 38, 38, 0.40)',
    label: 'ERROR',
  },
  OFFLINE: {
    color: '#475569', // Slate 600
    emissive: '#334155',
    glow: 'rgba(71, 85, 105, 0.15)',
    label: 'OFFLINE',
  },
  CONFIGURATION_INCOMPLETE: {
    color: '#94a3b8',
    emissive: '#64748b',
    glow: 'rgba(148, 163, 184, 0.20)',
    label: 'CONFIG',
  },
  UNKNOWN: {
    color: '#94a3b8',
    emissive: '#64748b',
    glow: 'rgba(148, 163, 184, 0.20)',
    label: 'UNKNOWN',
  },
}

export function getDeskStatusAccent(status: AgentStatus = 'IDLE', isDark: boolean = true): DeskStatusAccent {
  const table = isDark ? DESK_STATUS_DARK : DESK_STATUS_LIGHT
  return table[status] || table.IDLE
}

// ─── 2. Character Suit/Jacket Color by Profile (Zone) ────────────────────────

const PROFILE_JACKET_SHADES_DARK: Record<OfficeZoneType, [string, string, string]> = {
  COMMAND: ['#1e40af', '#2563eb', '#3b82f6'], // Blue shades
  DEV_ZONE: ['#0e7490', '#0891b2', '#06b6d4'], // Cyan shades
  CAREER_ZONE: ['#047857', '#059669', '#10b981'], // Green shades
  MARKETING_ZONE: ['#be185d', '#db2777', '#ec4899'], // Magenta/Pink shades
  COLLABORATION: ['#1e40af', '#2563eb', '#3b82f6'],
  APPROVAL: ['#b45309', '#d97706', '#f59e0b'],
  RUNTIME: ['#0369a1', '#0284c7', '#38bdf8'],
  VAULT: ['#4338ca', '#4f46e5', '#6366f1'],
  SPECIALIST: ['#6d28d9', '#7c3aed', '#8b5cf6'], // Purple shades
}

const PROFILE_JACKET_SHADES_LIGHT: Record<OfficeZoneType, [string, string, string]> = {
  COMMAND: ['#2563eb', '#3b82f6', '#1d4ed8'],
  DEV_ZONE: ['#0891b2', '#06b6d4', '#0284c7'],
  CAREER_ZONE: ['#059669', '#10b981', '#15803d'],
  MARKETING_ZONE: ['#db2777', '#ec4899', '#be185d'],
  COLLABORATION: ['#2563eb', '#3b82f6', '#1d4ed8'],
  APPROVAL: ['#d97706', '#f59e0b', '#b45309'],
  RUNTIME: ['#0284c7', '#38bdf8', '#0369a1'],
  VAULT: ['#4f46e5', '#6366f1', '#4338ca'],
  SPECIALIST: ['#7c3aed', '#8b5cf6', '#6d28d9'],
}

export function getProfileJacketColor(
  zone: OfficeZoneType = 'SPECIALIST',
  isDark: boolean = true,
  variantIndex: number = 0
): string {
  const table = isDark ? PROFILE_JACKET_SHADES_DARK : PROFILE_JACKET_SHADES_LIGHT
  const shades = table[zone] || table.SPECIALIST
  const idx = Math.abs(variantIndex) % shades.length
  return shades[idx]
}

export function getProfileJacketPalette(
  zone: OfficeZoneType = 'SPECIALIST',
  isDark: boolean = true
): [string, string, string] {
  const table = isDark ? PROFILE_JACKET_SHADES_DARK : PROFILE_JACKET_SHADES_LIGHT
  return table[zone] || table.SPECIALIST
}

// ─── 3. Hardware Utilization Thresholds (CPU / Memory) ───────────────────────

export type UtilizationTier = 'green' | 'orange' | 'red'

export interface UtilizationStatus {
  tier: UtilizationTier
  color: string
  label: string
  textColor: string
  bgColor: string
  borderColor: string
}

/**
 * Strict threshold rule as specified in Prompt:
 *   < 80%  → hijau (Normal / Optimal)
 *   80–99% → oranye (High Load / Saturated)
 *   ≥ 100% → merah (Critical / Overflow)
 */
export function getUtilizationStatus(percent: number): UtilizationStatus {
  if (percent >= 100) {
    return {
      tier: 'red',
      color: '#ef4444',
      label: 'CRITICAL',
      textColor: 'text-rose-500 dark:text-rose-400',
      bgColor: 'bg-rose-500/15',
      borderColor: 'border-rose-500/30',
    }
  }
  if (percent >= 80) {
    return {
      tier: 'orange',
      color: '#f59e0b',
      label: 'HIGH LOAD',
      textColor: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/30',
    }
  }
  return {
    tier: 'green',
    color: '#10b981',
    label: 'OPTIMAL',
    textColor: 'text-emerald-500 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
  }
}
