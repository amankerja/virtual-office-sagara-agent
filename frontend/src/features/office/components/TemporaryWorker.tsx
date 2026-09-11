import React, { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OfficeWorkerProjection } from '@/features/office/types/office'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'

interface TemporaryWorkerProps {
  worker: OfficeWorkerProjection
  isDark?: boolean
}

export const TemporaryWorker: React.FC<TemporaryWorkerProps> = memo(({ worker, isDark = true }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const navigate = useNavigate()
  const { position, state, workerPid, taskTitle, delegationId } = worker

  const palette = getOffice2_5DPalette(isDark)

  const isRunning = state === 'RUNNING'
  const isQueued = state === 'QUEUED' || state === 'CLAIMED'
  const isCompleted = state === 'COMPLETED'
  const isFailed = state === 'FAILED'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/runtime?tab=delegations&delegation=${delegationId}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      navigate(`/runtime?tab=delegations&delegation=${delegationId}`)
    }
  }

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      className="cursor-pointer group select-none outline-none"
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="button"
      aria-label={`Temporary worker workstation: ${taskTitle}, State: ${state}, PID: ${workerPid ?? 'None'}`}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Consistent Dual Grounding Contact Shadows */}
      <ellipse cx="0" cy="16" rx="32" ry="11" fill={palette.shadowAmbient} />
      <ellipse cx="0" cy="22" rx="14" ry="5.5" fill={palette.shadowContact} />

      {/* 2. Desk Metallic Frame & Legs */}
      <g stroke={palette.deskLeg} strokeWidth="1.8" strokeLinecap="round">
        <line x1="-22" y1="-4" x2="-22" y2="8" />
        <line x1="22" y1="-4" x2="22" y2="8" />
        <line x1="0" y1="6" x2="0" y2="18" />
      </g>
      <ellipse cx="-22" cy="9" rx="2" ry="1" fill={palette.deskLegFoot} />
      <ellipse cx="22" cy="9" rx="2" ry="1" fill={palette.deskLegFoot} />
      <ellipse cx="0" cy="19" rx="2" ry="1" fill={palette.deskLegFoot} />

      {/* 3. 2.5D Compact Desk with 3-Tone Facet Shading */}
      {/* Tabletop Surface */}
      <polygon
        points="-28,-8 0,-20 28,-8 0,4"
        fill={palette.tempDeskTop}
        stroke={palette.tempDeskStroke}
        strokeWidth="1.2"
        className="transition-colors group-hover:stroke-blue-500"
      />
      {/* Front-Left Apron */}
      <polygon
        points="-28,-8 0,4 0,9 -28,-3"
        fill={palette.tempDeskFaceLeft}
        stroke={palette.tempDeskStroke}
        strokeWidth="0.8"
      />
      {/* Front-Right Apron */}
      <polygon
        points="0,4 28,-8 28,-3 0,9"
        fill={palette.tempDeskFaceRight}
        stroke={palette.tempDeskStroke}
        strokeWidth="0.8"
      />

      {/* 4. Compact Laptop Workstation */}
      <g transform="translate(0, -6)">
        {/* Laptop Base */}
        <polygon
          points="-10,-1 0,-5 10,-1 0,3"
          fill={palette.laptopBase}
          stroke={palette.screenBezelStroke}
          strokeWidth="0.6"
        />
        {/* Laptop Angled Screen Frame */}
        <polygon
          points="-9,-2 9,-2 9,-16 -9,-16"
          fill={palette.screenBezel}
          stroke={palette.screenBezelStroke}
          strokeWidth="0.8"
        />
        {/* Screen Display Glow */}
        <rect
          x="-8"
          y="-15"
          width="16"
          height="12"
          rx="1"
          fill={
            isRunning
              ? (isDark ? '#044c3c' : '#047857')
              : isFailed
              ? '#991b1b'
              : isQueued
              ? '#b45309'
              : palette.laptopScreenBg
          }
        />
        {/* Screen Glass Specular Highlight */}
        <polygon
          points="-8,-15 -1,-15 -8,-8"
          fill="url(#office-specular-gleam)"
        />
        {isRunning && (
          <line x1="-6" y1="-10" x2="4" y2="-10" stroke="#a7f3d0" strokeWidth="0.8" opacity="0.85" />
        )}
      </g>

      {/* 5. Ergonomic Task Stool / Swivel Chair with 3-Tone Shading */}
      <ellipse cx="0" cy="20" rx="11" ry="5.5" fill={palette.chairCushionTop} stroke={palette.tempDeskStroke} strokeWidth="0.8" />
      <line x1="0" y1="20" x2="0" y2="24" stroke={palette.chairFrame} strokeWidth="2" />

      {/* 6. Status LED / Indicator Dot on Desk Corner */}
      <circle
        cx="20"
        cy="-5"
        r="2"
        fill={isRunning ? '#10b981' : isQueued ? '#f59e0b' : isCompleted ? '#3b82f6' : '#ef4444'}
        className={isRunning ? 'motion-safe:animate-pulse' : ''}
      />

      {/* 7. Subtle Delegation ID Tag */}
      <g transform="translate(0, 34)">
        <rect
          x="-35"
          y="-7"
          width="70"
          height="14"
          rx="7"
          fill={isDark ? '#0f172a' : '#ffffff'}
          stroke={palette.floorStroke}
          strokeWidth="0.8"
          opacity="0.95"
        />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fill={isDark ? '#94a3b8' : '#64748b'}
          className="text-[7px] font-mono-tech font-bold tracking-wider uppercase group-hover:fill-blue-500 transition-colors"
        >
          {state}
        </text>
      </g>

      {/* Tooltip on hover/focus */}
      {showTooltip && (
        <foreignObject x="-80" y="-95" width="160" height="85" className="overflow-visible pointer-events-none z-50">
          <div className="bg-surface border border-border rounded-xl p-2.5 shadow-md text-left text-xs">
            <div className="text-[9px] font-mono-tech font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center justify-between border-b border-border pb-1">
              <span>WORKER</span>
              <span>{state}</span>
            </div>
            <div className="text-[10px] font-medium text-text-primary truncate mt-1">
              {taskTitle}
            </div>
            {workerPid && (
              <div className="text-[9px] font-mono-tech text-text-muted mt-0.5">
                PID: {workerPid}
              </div>
            )}
            <div className="text-[8.5px] text-text-muted mt-1 pt-1 border-t border-border-subtle">
              Click to view delegation in Runtime
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
})
