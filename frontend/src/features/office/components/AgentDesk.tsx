import React, { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  PauseCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  PowerOff,
  HelpCircle,
  Settings,
  Wrench,
} from 'lucide-react'
import type { OfficeDeskProjection } from '@/features/office/types/office'
import type { AgentStatus } from '@/types/agent'
import { behaviorLabel, type OfficeBehaviorState } from '../animation/behavior'
import { getOffice2_5DPalette, getAgentStatusVisual } from '../renderers/Office2_5D/Office2_5DPalette'
import { getDeskStatusAccent } from '../systems/OfficeStatusColors'

interface AgentDeskProps {
  visualBehavior?: OfficeBehaviorState
  desk: OfficeDeskProjection
  isFocused?: boolean
  isDark?: boolean
  onSelectAgent: (agentId: string) => void
  onHoverAgent?: (agentId: string | null) => void
}

const STATUS_ICONS: Record<AgentStatus, React.ComponentType<{ className?: string }>> = {
  ACTIVE: Activity,
  IDLE: PauseCircle,
  RECENTLY_ACTIVE: Clock,
  AWAITING_APPROVAL: AlertTriangle,
  DEGRADED: AlertCircle,
  ERROR: AlertCircle,
  OFFLINE: PowerOff,
  UNKNOWN: HelpCircle,
  CONFIGURATION_INCOMPLETE: Settings,
}

export const AgentDesk: React.FC<AgentDeskProps> = memo(({
  desk,
  isFocused = false,
  isDark = true,
  onSelectAgent,
  onHoverAgent,
  visualBehavior = 'UNKNOWN_NEUTRAL',
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const navigate = useNavigate()
  const { agent, position, currentTask, activeDelegations } = desk
  const status = agent.runtime.state
  const StatusIcon = STATUS_ICONS[status] || HelpCircle

  const palette = getOffice2_5DPalette(isDark)
  const statusVisual = getAgentStatusVisual(status, isDark)
  const deskAccent = getDeskStatusAccent(status, isDark)

  const hasCapabilityWarning = (agent.capabilities?.degraded ?? 0) > 0 || (agent.capabilities?.missing ?? 0) > 0

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectAgent(agent.id)
    }
  }

  const handleTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentTask) {
      navigate(`/tasks?task=${currentTask.id}`)
    }
  }

  const isRunning = status === 'ACTIVE'
  const isAwaitingApproval = status === 'AWAITING_APPROVAL'
  const isError = status === 'ERROR'
  const isDegraded = status === 'DEGRADED'

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      className="cursor-pointer group select-none transition-all duration-150 outline-none"
      onClick={() => onSelectAgent(agent.id)}
      onMouseEnter={() => {
        setShowTooltip(true)
        onHoverAgent?.(agent.id)
      }}
      onMouseLeave={() => {
        setShowTooltip(false)
        onHoverAgent?.(null)
      }}
      onFocus={() => {
        setShowTooltip(true)
        onHoverAgent?.(agent.id)
      }}
      onBlur={() => {
        setShowTooltip(false)
        onHoverAgent?.(null)
      }}
      tabIndex={0}
      role="button"
      aria-label={`Agent workstation: ${agent.definition.name}, Status: ${status}`}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Selection / Focus highlight ring */}
      {(isFocused || showTooltip) && (
        <rect
          x="-95"
          y="-65"
          width="190"
          height="130"
          rx="14"
          fill="none"
          stroke={palette.brandPrimary}
          strokeWidth="2"
          strokeDasharray={isFocused ? '4 2' : 'none'}
          className="transition-all"
        />
      )}

      {/* 2. Consistent Dual Contact Grounding Shadows */}
      <ellipse cx="0" cy="20" rx="90" ry="26" fill={palette.shadowAmbient} />
      <ellipse cx="0" cy="29" rx="26" ry="10" fill={palette.shadowContact} />

      {/* 3. Desk Metallic Support Legs & Leveler Feet */}
      <g stroke={palette.deskLeg} strokeWidth="2.5" strokeLinecap="round">
        <line x1="-70" y1="-14" x2="-70" y2="4" />
        <line x1="70" y1="-14" x2="70" y2="4" />
        <line x1="0" y1="12" x2="0" y2="28" />
      </g>
      <ellipse cx="-70" cy="5" rx="3" ry="1.5" fill={palette.deskLegFoot} />
      <ellipse cx="70" cy="5" rx="3" ry="1.5" fill={palette.deskLegFoot} />
      <ellipse cx="0" cy="29" rx="3.5" ry="2" fill={palette.deskLegFoot} />

      {/* 4. Desk Base Surface (3-Tone Isometric Shading: Top / Left / Right) */}
      {/* Top Surface (Lightest Tone / Gradient) */}
      <polygon
        points="-80,-20 0,-50 80,-20 0,10"
        fill="url(#office-desk-top-gradient)"
        stroke={palette.deskStroke}
        strokeWidth="1.2"
        className="transition-colors group-hover:stroke-blue-500"
      />
      {/* Top Surface Specular Edge Highlight */}
      <line x1="-80" y1="-20" x2="0" y2="-50" stroke={palette.specularHighlight} strokeWidth="1" />
      <line x1="0" y1="-50" x2="80" y2="-20" stroke={palette.specularHighlight} strokeWidth="0.6" />

      {/* Front-Left Apron Face (Medium Tone) */}
      <polygon
        points="-80,-20 0,10 0,18 -80,-12"
        fill={palette.deskFaceLeft}
        stroke={palette.deskStroke}
        strokeWidth="1"
      />
      {/* Front-Right Apron Face (Darkest Tone) */}
      <polygon
        points="0,10 80,-20 80,-12 0,18"
        fill={palette.deskFaceRight}
        stroke={palette.deskStroke}
        strokeWidth="1"
      />

      {/* Front Edge Status Accent Trim Strip (Option A: crisp status indicator) */}
      <line
        x1="-80"
        y1="-20"
        x2="0"
        y2="10"
        stroke={deskAccent.color}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={0.9}
      />
      <line
        x1="0"
        y1="10"
        x2="80"
        y2="-20"
        stroke={deskAccent.color}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Under-desk ambient status glow */}
      <polygon
        points="-76,-13 0,17 76,-13 0,13"
        fill={deskAccent.glow}
        opacity={0.4}
      />

      {/* Corner Status LED on desktop surface */}
      <circle cx="70" cy="-21" r="2.5" fill={deskAccent.color} />
      <circle
        cx="70"
        cy="-21"
        r="4.5"
        fill="none"
        stroke={deskAccent.color}
        strokeWidth="0.8"
        opacity={0.6}
        className={isRunning || isAwaitingApproval ? 'motion-safe:animate-pulse' : ''}
      />

      {/* 5. High-Tech Leather/Polymer Desk Pad Inlay */}
      <polygon
        points="-56,-14 -4,-34 48,-14 -4,6"
        fill={palette.deskPad}
        stroke={palette.deskPadStroke}
        strokeWidth="0.8"
      />

      {/* 6. Ergonomic Office Chair */}
      {/* 5-Star Wheeled Base */}
      <g stroke={palette.chairWheelBase} strokeWidth="1.5" strokeLinecap="round">
        <line x1="0" y1="34" x2="-12" y2="38" />
        <line x1="0" y1="34" x2="12" y2="38" />
        <line x1="0" y1="34" x2="-15" y2="31" />
        <line x1="0" y1="34" x2="15" y2="31" />
        <line x1="0" y1="34" x2="0" y2="40" />
      </g>
      {/* Castor Wheels */}
      <circle cx="-12" cy="38" r="1.5" fill={palette.chairWheel} />
      <circle cx="12" cy="38" r="1.5" fill={palette.chairWheel} />
      <circle cx="-15" cy="31" r="1.5" fill={palette.chairWheel} />
      <circle cx="15" cy="31" r="1.5" fill={palette.chairWheel} />
      <circle cx="0" cy="40" r="1.5" fill={palette.chairWheel} />
      {/* Hydraulic Cylinder */}
      <line x1="0" y1="34" x2="0" y2="25" stroke={palette.chairFrame} strokeWidth="3" />
      {/* Cushioned Seat Base (3-Tone Shaded) */}
      <ellipse
        cx="0"
        cy="25"
        rx="18"
        ry="9"
        fill={palette.chairCushionFace}
        stroke={palette.deskStroke}
        strokeWidth="1"
      />
      <ellipse
        cx="0"
        cy="23"
        rx="15"
        ry="7.5"
        fill={palette.chairCushionTop}
      />
      {/* Mesh Backrest & Armrests */}
      <path
        d="M -16 23 Q 0 16 16 23"
        fill="none"
        stroke={palette.chairFrame}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line x1="-16" y1="23" x2="-16" y2="16" stroke={palette.chairWheelBase} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="23" x2="16" y2="16" stroke={palette.chairWheelBase} strokeWidth="2" strokeLinecap="round" />

      {/* 7. Multi-Monitor Terminal (Angled 2.5D Displays with Specular Highlights) */}
      {/* Primary Center Monitor */}
      <g transform="translate(0, -32)">
        {/* Monitor Heavy Stand */}
        <line x1="0" y1="12" x2="0" y2="4" stroke={palette.screenBezelStroke} strokeWidth="3" />
        <polygon points="-8,13 0,10 8,13 0,16" fill={palette.screenBezel} />

        {/* Display Frame */}
        <rect
          x="-26"
          y="-17"
          width="52"
          height="26"
          rx="3"
          fill={palette.screenBezel}
          stroke={palette.screenBezelStroke}
          strokeWidth="1.2"
        />
        {/* Active Screen Surface with Inner Glow */}
        <rect
          x="-24"
          y="-15"
          width="48"
          height="22"
          rx="2"
          fill={statusVisual.screenFill}
        />

        {/* Glass Reflection Specular Highlight (Subtle Diagonal Sheen) */}
        <polygon
          points="-24,-15 -6,-15 -24,3"
          fill="url(#office-specular-gleam)"
        />

        {/* Terminal Line Scanlines / Code Animation */}
        {isRunning && (
          <g stroke="#a7f3d0" strokeWidth="1" opacity="0.85">
            <line x1="-20" y1="-10" x2="-6" y2="-10" />
            <line x1="-20" y1="-5" x2="10" y2="-5" />
            <line x1="-20" y1="0" x2="4" y2="0" />
            <line x1="-20" y1="4" x2="-10" y2="4" />
          </g>
        )}
        {isAwaitingApproval && (
          <g stroke="#fef08a" strokeWidth="1.2">
            <line x1="-12" y1="-9" x2="12" y2="-9" />
            <line x1="-8" y1="-4" x2="8" y2="-4" />
            <line x1="-4" y1="1" x2="4" y2="1" />
          </g>
        )}
        {isError && (
          <g stroke="#fecaca" strokeWidth="1.2">
            <line x1="-12" y1="-6" x2="12" y2="4" />
            <line x1="12" y1="-6" x2="-12" y2="4" />
          </g>
        )}
      </g>

      {/* Secondary Angled Left Monitor */}
      <polygon
        points="-46,-23 -28,-30 -28,-11 -46,-4"
        fill={palette.screenBezel}
        stroke={palette.screenBezelStroke}
        strokeWidth="1.2"
      />
      <polygon
        points="-44,-21 -30,-28 -30,-13 -44,-6"
        fill={isRunning ? (isDark ? '#022c22' : '#064e3b') : statusVisual.screenFill}
      />
      {/* Specular Gleam on Left Screen */}
      <polygon
        points="-44,-21 -37,-25 -44,-13"
        fill="url(#office-specular-gleam)"
      />

      {/* Secondary Angled Right Monitor */}
      <polygon
        points="28,-30 46,-23 46,-4 28,-11"
        fill={palette.screenBezel}
        stroke={palette.screenBezelStroke}
        strokeWidth="1.2"
      />
      <polygon
        points="30,-28 44,-21 44,-6 30,-13"
        fill={isRunning ? (isDark ? '#022c22' : '#064e3b') : statusVisual.screenFill}
      />
      {/* Specular Gleam on Right Screen */}
      <polygon
        points="30,-28 37,-25 30,-14"
        fill="url(#office-specular-gleam)"
      />

      {/* Mechanical Keyboard with illuminated keys */}
      <polygon points="-22,2 -4,-4 14,2 -4,8" fill={palette.keyboardBase} stroke={palette.screenBezelStroke} strokeWidth="0.8" />
      <line x1="-16" y1="1" x2="8" y2="1" stroke={palette.keyboardKeys} strokeWidth="1" strokeDasharray="2 1" />
      <line x1="-12" y1="4" x2="4" y2="4" stroke={palette.keyboardKeys} strokeWidth="1" strokeDasharray="2 1" />
      {/* Ergonomic Optical Mouse on Mousepad */}
      <polygon points="20,-2 28,1 24,7 16,4" fill={palette.mousePad} opacity="0.75" />
      <ellipse cx="22" cy="2" rx="3.5" ry="2" fill={palette.mouse} />

      {/* 8. Clean Floating Status Overlay Header */}
      <g transform="translate(0, -66)">
        <rect
          x="-68"
          y="-14"
          width="136"
          height="31"
          rx="6"
          fill={isDark ? '#0f172a' : '#ffffff'}
          stroke={palette.floorStroke}
          strokeWidth="1.2"
          opacity="0.96"
          className="transition-colors group-hover:stroke-blue-500"
        />
        {/* State Color Indicator Bar on Left */}
        <rect
          x="-68"
          y="-14"
          width="3.5"
          height="31"
          rx="1.75"
          fill={statusVisual.indicator}
        />
        {/* Status Dot */}
        <circle
          cx="-54"
          cy="-1"
          r="3"
          fill={statusVisual.indicator}
          className={isRunning || isAwaitingApproval ? 'motion-safe:animate-pulse' : ''}
        />
        {/* Agent Name */}
        <text
          x="-44"
          y="-2"
          fill={isDark ? '#f8fafc' : '#0f172a'}
          className="text-[10px] font-sans font-bold"
        >
          {agent.definition.name.replace(/^sagara\s+/i, '').replace(/—.*$/, '').trim() || agent.definition.name}
        </text>
        {/* State Pill */}
        <text
          x="-44"
          y="9"
          fill={statusVisual.badgeText}
          className="text-[8px] font-mono-tech font-bold uppercase tracking-wider"
        >
          {isAwaitingApproval
            ? '⚠ AWAITING APPROVAL'
            : isError
            ? '✖ ERROR'
            : isDegraded
            ? '⚠ DEGRADED'
            : status === 'OFFLINE'
            ? '○ OFFLINE'
            : status === 'CONFIGURATION_INCOMPLETE'
            ? '⚙ CONFIG'
            : `● ${status}`}
        </text>
      </g>

      {/* Capability Warning Badge */}
      {hasCapabilityWarning && !isError && (
        <g transform="translate(74, -62)">
          <title>Capability warning present</title>
          <circle cx="0" cy="0" r="7.5" fill={isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.25)'} stroke="#f59e0b" strokeWidth="1" />
          <Wrench className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 -translate-x-1.5 -translate-y-1.5" />
        </g>
      )}

      {/* Active Worker Count Badge */}
      {activeDelegations.length > 0 && (
        <g transform="translate(-74, -62)">
          <circle cx="0" cy="0" r="8" fill={isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.2)'} stroke={palette.brandPrimary} strokeWidth="1.2" />
          <text
            x="0"
            y="2.5"
            textAnchor="middle"
            fill={palette.brandPrimary}
            className="text-[8px] font-mono-tech font-bold"
          >
            {activeDelegations.length}w
          </text>
        </g>
      )}

      {/* Current Task Display Card (if active task exists) */}
      {currentTask && (
        <g
          transform="translate(0, 72)"
          onClick={handleTaskClick}
          role="link"
          tabIndex={0}
          aria-label={`Open task: ${currentTask.title}`}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); navigate(`/tasks?task=${encodeURIComponent(currentTask.id)}`) } }}
          className="hover:opacity-90 transition-opacity"
        >
          <rect
            x="-75"
            y="-10"
            width="150"
            height="22"
            rx="4"
            fill={isDark ? '#1e293b' : '#f1f5f9'}
            stroke={palette.floorStroke}
            strokeWidth="1"
            className="hover:stroke-blue-500"
          />
          <text
            x="-68"
            y="4"
            fill={isDark ? '#f8fafc' : '#0f172a'}
            className="text-[9px] font-mono-tech font-semibold"
          >
            {currentTask.title.length > 18
              ? currentTask.title.slice(0, 17) + '…'
              : currentTask.title}
          </text>
          {currentTask.progress && (
            <text
              x="66"
              y="4"
              textAnchor="end"
              fill={isDark ? '#94a3b8' : '#64748b'}
              className="text-[8px] font-mono-tech"
            >
              {currentTask.progress.completed}/{currentTask.progress.total}
            </text>
          )}
        </g>
      )}

      {/* Popover / Tooltip Card (Rendered on Hover/Focus) */}
      {showTooltip && (
        <foreignObject x="-110" y="-195" width="220" height="135" className="overflow-visible pointer-events-none z-50">
          <div className="bg-surface border border-border rounded-xl p-3 shadow-md text-left transition-all text-xs">
            <div className="flex items-center justify-between gap-1 mb-1 border-b border-border pb-1">
              <span className="font-semibold text-text-primary truncate">
                {agent.definition.name}
              </span>
              <StatusIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            </div>
            <div className="text-[10px] text-text-muted mb-1 truncate">
              {agent.definition.role || 'Autonomous Agent'}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tech text-text-secondary mb-1">
              <span>State:</span>
              <span className="font-bold text-text-primary uppercase">{status}</span>
            </div>
            {currentTask && (
              <div className="text-[10px] text-text-secondary truncate mb-1">
                <span className="font-medium text-text-primary">Task:</span> {currentTask.title}
              </div>
            )}
            <div className="text-[10px] text-text-secondary">Visual behavior: {behaviorLabel(visualBehavior)} (presentation only)</div>
            <div className="text-[9px] text-text-muted">Last activity: {agent.runtime.lastActivityAt ?? 'Unknown'}</div>
            <div className="flex items-center justify-between text-[9px] font-mono-tech text-text-muted pt-1 border-t border-border-subtle">
              <span>Workers: {activeDelegations.length}</span>
              <span>Sessions: {agent.runtime.sessionCount ?? 0}</span>
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
})
