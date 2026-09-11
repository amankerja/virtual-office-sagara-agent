import React, { memo } from 'react'
import type { OfficeDeskProjection } from '@/features/office/types/office'
import { AgentDesk } from './AgentDesk'
import type { OfficeBehaviorState } from '../animation/behavior'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'

interface CommandRoomStationProps {
  visualBehavior?: OfficeBehaviorState
  desk?: OfficeDeskProjection
  isFocused?: boolean
  isDark?: boolean
  onSelectAgent: (agentId: string) => void
  onHoverAgent?: (agentId: string | null) => void
  position?: { x: number; y: number }
}

export const CommandRoomStation: React.FC<CommandRoomStationProps> = memo(({
  desk,
  isFocused,
  isDark = true,
  onSelectAgent,
  onHoverAgent,
  visualBehavior,
  position = { x: 0, y: 0 },
}) => {
  const palette = getOffice2_5DPalette(isDark)

  if (desk) {
    return (
      <g id="office-command-desk">
        {/* Architectural Command Room Wall Holographic Tactical Screen */}
        <g transform={`translate(${position.x}, ${position.y - 105})`} className="pointer-events-none select-none">
          {/* Wall-mounted Display Frame with 3D Bevel */}
          <polygon
            points="-90,-25 90,-25 90,15 -90,15"
            fill={palette.screenBezel}
            stroke={palette.screenBezelStroke}
            strokeWidth="1.5"
          />
          {/* Active Screen Surface */}
          <polygon
            points="-86,-22 86,-22 86,12 -86,12"
            fill={isDark ? '#060d18' : '#0f172a'}
          />

          {/* Specular Screen Gleam */}
          <polygon
            points="-86,-22 -30,-22 -86,12"
            fill="url(#office-specular-gleam)"
          />

          {/* Fleet Telemetry Radar Graphic */}
          <ellipse cx="-45" cy="-5" rx="16" ry="8" fill="none" stroke={palette.brandPrimary} strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
          <circle cx="-45" cy="-5" r="2.5" fill={isDark ? '#38bdf8' : '#60a5fa'} />
          <line x1="-61" y1="-5" x2="-29" y2="-5" stroke={isDark ? '#1d4ed8' : '#2563eb'} strokeWidth="0.8" />

          {/* Digital Telemetry Bars */}
          <g stroke={isDark ? '#38bdf8' : '#60a5fa'} strokeWidth="1.2" opacity="0.85">
            <line x1="-15" y1="-14" x2="35" y2="-14" />
            <line x1="-15" y1="-8" x2="65" y2="-8" />
            <line x1="-15" y1="-2" x2="20" y2="-2" />
            <line x1="-15" y1="4" x2="50" y2="4" />
          </g>

          {/* Header Label */}
          <text
            x="0"
            y="-16"
            textAnchor="middle"
            fill={isDark ? '#60a5fa' : '#38bdf8'}
            className="text-[7.5px] font-mono-tech font-bold tracking-widest uppercase"
          >
            COMMAND OPS · FLEET CORE
          </text>
        </g>

        {/* Primary Command Desk & Seated Agent */}
        <AgentDesk
          desk={desk}
          visualBehavior={visualBehavior}
          isFocused={isFocused}
          isDark={isDark}
          onSelectAgent={onSelectAgent}
          onHoverAgent={onHoverAgent}
        />
      </g>
    )
  }

  // Standby State
  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      className="select-none pointer-events-none"
      aria-label="Command Station Standby"
    >
      {/* Consistent Dual Contact Grounding Shadows */}
      <ellipse cx="0" cy="20" rx="90" ry="26" fill={palette.shadowAmbient} />
      <ellipse cx="0" cy="29" rx="26" ry="10" fill={palette.shadowContact} />

      {/* Desk Metallic Support Legs & Leveler Feet */}
      <g stroke={palette.deskLeg} strokeWidth="2.5" strokeLinecap="round">
        <line x1="-70" y1="-14" x2="-70" y2="4" />
        <line x1="70" y1="-14" x2="70" y2="4" />
        <line x1="0" y1="12" x2="0" y2="28" />
      </g>
      <ellipse cx="-70" cy="5" rx="3" ry="1.5" fill={palette.deskLegFoot} />
      <ellipse cx="70" cy="5" rx="3" ry="1.5" fill={palette.deskLegFoot} />
      <ellipse cx="0" cy="29" rx="3.5" ry="2" fill={palette.deskLegFoot} />

      {/* Empty Desk Base (3-Tone Shading) */}
      <polygon
        points="-80,-20 0,-50 80,-20 0,10"
        fill={palette.deskTop}
        stroke={palette.deskStroke}
        strokeWidth="1.5"
        strokeDasharray="4 2"
        opacity="0.6"
      />
      <polygon
        points="-80,-20 0,10 0,18 -80,-12"
        fill={palette.deskFaceLeft}
        stroke={palette.deskStroke}
        strokeWidth="1"
        opacity="0.6"
      />
      <polygon
        points="0,10 80,-20 80,-12 0,18"
        fill={palette.deskFaceRight}
        stroke={palette.deskStroke}
        strokeWidth="1"
        opacity="0.6"
      />

      {/* Standby Terminal Screen */}
      <g transform="translate(0, -32)">
        <rect
          x="-26"
          y="-17"
          width="52"
          height="26"
          rx="3"
          fill={palette.screenBezel}
          stroke={palette.screenBezelStroke}
          strokeWidth="1"
          opacity="0.75"
        />
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fill={isDark ? '#64748b' : '#94a3b8'}
          className="text-[8px] font-mono-tech font-bold"
        >
          STANDBY
        </text>
      </g>

      {/* Available Label Tag */}
      <g transform="translate(0, 44)">
        <rect
          x="-65"
          y="-9"
          width="130"
          height="18"
          rx="9"
          fill={isDark ? '#0f172a' : '#ffffff'}
          stroke={palette.floorStroke}
          strokeWidth="1"
          opacity="0.9"
        />
        <text
          x="0"
          y="3.5"
          textAnchor="middle"
          fill={isDark ? '#94a3b8' : '#64748b'}
          className="text-[8.5px] font-mono-tech font-semibold uppercase"
        >
          COMMAND POD AVAILABLE
        </text>
      </g>
    </g>
  )
})
