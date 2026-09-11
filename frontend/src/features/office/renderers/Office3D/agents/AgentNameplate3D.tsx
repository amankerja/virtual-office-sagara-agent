/**
 * AgentNameplate3D — Premium Billboard Nameplate
 *
 * Improvements (Sections 49-51):
 *   - Translucent frosted panel with readable typography
 *   - Status dot + concise label (not raw state string)
 *   - Selected: blue border accent
 *   - Hover: subtle cyan border
 *   - Minimal text — role only when selected/hovered
 */
import React from 'react'
import { Billboard, Text } from '@react-three/drei'
import type { AgentStatus } from '@/types/agent'

interface AgentNameplate3DProps {
  name: string
  role?: string
  state: AgentStatus
  position?: [number, number, number]
  isSelected?: boolean
  isHovered?: boolean
}

// Human-readable status labels
const STATE_LABEL: Record<AgentStatus, string> = {
  ACTIVE:                   'ACTIVE',
  IDLE:                     'IDLE',
  RECENTLY_ACTIVE:          'RECENT',
  AWAITING_APPROVAL:        'AWAITING REVIEW',
  DEGRADED:                 'DEGRADED',
  ERROR:                    'ERROR',
  OFFLINE:                  'OFFLINE',
  UNKNOWN:                  'UNKNOWN',
  CONFIGURATION_INCOMPLETE: 'CONFIG INCOMPLETE',
}

// Status semantic colors — restrained, not neon
const STATE_COLOR: Record<AgentStatus, string> = {
  ACTIVE:                   '#34d399',   // emerald-400
  IDLE:                     '#64748b',   // slate-500
  RECENTLY_ACTIVE:          '#38bdf8',   // sky-400
  AWAITING_APPROVAL:        '#fbbf24',   // amber-400
  DEGRADED:                 '#fb923c',   // orange-400
  ERROR:                    '#f87171',   // red-400
  OFFLINE:                  '#475569',   // slate-600
  UNKNOWN:                  '#a78bfa',   // violet-400
  CONFIGURATION_INCOMPLETE: '#f472b6',   // pink-400
}

export const AgentNameplate3D: React.FC<AgentNameplate3DProps> = ({
  name,
  role,
  state,
  position = [0, 2.10, 0],
  isSelected = false,
  isHovered = false,
}) => {
  const statusColor  = STATE_COLOR[state] ?? '#64748b'
  const statusLabel  = STATE_LABEL[state] ?? state

  // Truncate long names
  const displayName = name.length > 16 ? `${name.slice(0, 14)}…` : name
  const displayRole = role ? (role.length > 22 ? `${role.slice(0, 20)}…` : role) : ''

  const showRole = isSelected || isHovered

  // Panel size varies if role is shown
  const panelH  = showRole ? 0.62 : 0.50
  const panelW  = 1.80

  // Border color
  const borderColor = isSelected ? '#2563eb' : isHovered ? '#38bdf8' : '#1e3a5f'
  const borderOpacity = isSelected ? 0.90 : isHovered ? 0.75 : 0.35

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* ── Border / Selection outline (rendered behind panel) ── */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[panelW + 0.06, panelH + 0.06]} />
        <meshBasicMaterial color={borderColor} transparent opacity={borderOpacity} />
      </mesh>

      {/* ── Frosted panel background ── */}
      <mesh position={[0, 0, -0.006]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#07101f" transparent opacity={0.82} />
      </mesh>

      {/* ── Agent Name (primary) ── */}
      <Text
        position={[0, showRole ? panelH / 2 - 0.12 : 0.10, 0]}
        fontSize={0.155}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.02}
      >
        {displayName}
      </Text>

      {/* ── Role (secondary — visible on hover/select) ── */}
      {showRole && displayRole && (
        <Text
          position={[0, 0.02, 0]}
          fontSize={0.090}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.04}
        >
          {displayRole.toUpperCase()}
        </Text>
      )}

      {/* ── Status dot + label (bottom) ── */}
      <group position={[0, showRole ? -panelH / 2 + 0.10 : -0.10, 0]}>
        {/* Dot */}
        <mesh position={[-panelW / 2 + 0.14, 0, 0]}>
          <circleGeometry args={[0.038, 14]} />
          <meshBasicMaterial color={statusColor} />
        </mesh>
        {/* Status text */}
        <Text
          position={[0.06, 0, 0]}
          fontSize={0.092}
          color={statusColor}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.05}
        >
          {statusLabel}
        </Text>
      </group>
    </Billboard>
  )
}
