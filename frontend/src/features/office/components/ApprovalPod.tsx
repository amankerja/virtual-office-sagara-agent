import React, { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ExternalLink } from 'lucide-react'
import type { OfficeApprovalProjection } from '@/features/office/types/office'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'

interface ApprovalPodProps {
  summary: OfficeApprovalProjection
  position?: { x: number; y: number }
  isDark?: boolean
}

export const ApprovalPod: React.FC<ApprovalPodProps> = memo(({
  summary,
  position = { x: 0, y: 0 },
  isDark = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const navigate = useNavigate()
  const { pendingCount, highestRisk, oldestPending, byRisk } = summary

  const palette = getOffice2_5DPalette(isDark)

  const hasCritical = byRisk.critical > 0
  const hasHigh = byRisk.high > 0
  const hasPending = pendingCount > 0

  const handleClick = () => {
    if (oldestPending) {
      navigate(`/approvals?approval=${oldestPending.id}`)
    } else {
      navigate('/approvals')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
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
      aria-label={`Approval Bay: ${pendingCount} pending approvals, Highest risk: ${highestRisk || 'None'}`}
      onKeyDown={handleKeyDown}
    >




      {/* Security Threshold Dash Markings */}
      <g stroke={hasPending ? palette.approvalPod.hazardStripe : palette.floorWalkwayLine} strokeWidth="1.2" opacity="0.45" strokeDasharray="6 4">
        <line x1="-95" y1="-14" x2="-20" y2="-38" />
        <line x1="20" y1="-38" x2="95" y2="-14" />
        <line x1="-95" y1="-10" x2="-10" y2="30" />
        <line x1="10" y1="30" x2="95" y2="-10" />
      </g>

      {/* 3. Physical Review Desk Tabletop with 3-Tone Facet Shading */}
      {/* Tabletop Surface */}
      <polygon
        points="-75,-8 0,-32 75,-8 0,22"
        fill={palette.approvalPod.deskTop}
        stroke={palette.approvalPod.deskStroke}
        strokeWidth="1.2"
        className="transition-colors group-hover:stroke-blue-500"
      />
      {/* Specular Edge Line */}
      <line x1="-75" y1="-8" x2="0" y2="-32" stroke={palette.specularHighlight} strokeWidth="1" />
      <line x1="0" y1="-32" x2="75" y2="-8" stroke={palette.specularHighlight} strokeWidth="0.6" />

      {/* Front-Left Apron */}
      <polygon
        points="-75,-8 0,22 0,28 -75,-2"
        fill={palette.approvalPod.deskLeft}
        stroke={palette.approvalPod.deskStroke}
        strokeWidth="1"
      />
      {/* Front-Right Apron */}
      <polygon
        points="0,22 75,-8 75,-2 0,28"
        fill={palette.approvalPod.deskRight}
        stroke={palette.approvalPod.deskStroke}
        strokeWidth="1"
      />

      {/* Table Support Legs */}
      <g stroke={palette.deskLeg} strokeWidth="2.2" strokeLinecap="round">
        <line x1="-65" y1="-2" x2="-65" y2="12" />
        <line x1="65" y1="-2" x2="65" y2="12" />
        <line x1="0" y1="28" x2="0" y2="38" />
      </g>

      {/* 4. Dual Chairs: Reviewer Seat & Agent Inspection Seat */}
      {/* Reviewer Chair (North-East facing) */}
      <ellipse cx="-35" cy="18" rx="13" ry="6.5" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="1" />
      <path d="M -45 16 Q -35 10 -25 16" fill="none" stroke={palette.chairFrame} strokeWidth="2.5" />
      {/* Applicant Seat (Opposite) */}
      <ellipse cx="35" cy="-2" rx="13" ry="6.5" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="1" />
      <path d="M 25 -4 Q 35 -10 45 -4" fill="none" stroke={palette.chairFrame} strokeWidth="2.5" />

      {/* 5. Physical Review Display Terminal Screen with Specular Highlight */}
      <g transform="translate(0, -26)">
        {/* Terminal Stand */}
        <line x1="0" y1="12" x2="0" y2="4" stroke={palette.deskLeg} strokeWidth="2.5" />
        <polygon points="-8,13 0,10 8,13 0,16" fill={palette.screenBezel} />

        {/* Display Frame */}
        <rect
          x="-38"
          y="-22"
          width="76"
          height="32"
          rx="3"
          fill={palette.screenBezel}
          stroke={palette.screenBezelStroke}
          strokeWidth="1.2"
        />
        {/* Active Screen Surface */}
        <rect
          x="-35"
          y="-19"
          width="70"
          height="26"
          rx="2"
          fill={
            hasCritical
              ? '#5c1010'
              : hasHigh
              ? '#6b2d04'
              : hasPending
              ? (isDark ? '#0c223a' : '#1e3a5f')
              : (isDark ? '#042f2e' : '#064e3b')
          }
        />

        {/* Specular Gleam on Terminal Screen */}
        <polygon
          points="-35,-19 5,-19 -35,7"
          fill="url(#office-specular-gleam)"
        />

        {/* Screen Content: Pending Action Review Card or Clear Indicator */}
        {hasPending ? (
          <g>
            {/* Risk Badge */}
            <rect
              x="-30"
              y="-15"
              width="26"
              height="10"
              rx="2"
              fill={hasCritical ? '#dc2626' : hasHigh ? '#f59e0b' : palette.brandPrimary}
            />
            <text x="-17" y="-7.5" textAnchor="middle" className="text-[6.5px] font-mono-tech font-bold fill-white uppercase">
              {highestRisk || 'PENDING'}
            </text>
            {/* Action Title / Description Lines */}
            <text x="2" y="-8" fill={isDark ? '#f8fafc' : '#ffffff'} className="text-[7px] font-mono-tech font-semibold">
              {pendingCount} PENDING
            </text>
            <line x1="-30" y1="-1" x2="28" y2="-1" stroke={palette.brandPrimary} strokeWidth="1" strokeDasharray="3 1" />
            <text x="-30" y="5" fill={isDark ? '#cbd5e1' : '#e2e8f0'} className="text-[6.5px] font-mono-tech">
              {oldestPending?.title ? (oldestPending.title.slice(0, 16) + '…') : 'Inspection Required'}
            </text>
          </g>
        ) : (
          <g>
            <ShieldCheck className="h-4 w-4 -translate-x-2 -translate-y-3.5 text-emerald-400" />
            <text x="0" y="3" textAnchor="middle" className="text-[6.5px] font-mono-tech font-bold fill-emerald-400">
              ALL CLEAR · 0 PENDING
            </text>
          </g>
        )}
      </g>

      {/* 6. Security Status Beacon Tower (Pillar on corner) */}
      <g transform="translate(68, -25)">
        <rect x="-6" y="-36" width="12" height="38" rx="2" fill={palette.approvalPod.beaconFrame} stroke={palette.floorStroke} strokeWidth="1" />
        {/* Tier 1: Red */}
        <rect x="-4" y="-34" width="8" height="8" rx="1" fill={hasCritical ? '#ef4444' : '#7f1d1d'} className={hasCritical ? 'motion-safe:animate-pulse' : ''} />
        {/* Tier 2: Amber */}
        <rect x="-4" y="-24" width="8" height="8" rx="1" fill={hasHigh ? '#f59e0b' : '#78350f'} className={hasHigh ? 'motion-safe:animate-pulse' : ''} />
        {/* Tier 3: Green */}
        <rect x="-4" y="-14" width="8" height="8" rx="1" fill={!hasPending ? '#10b981' : '#064e3b'} />
        {/* Beacon Halo */}
        {hasPending && (
          <circle cx="0" cy="-24" r="14" fill={hasCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'} />
        )}
      </g>

      {/* 7. Desktop Authorization Tablet / Document Trays */}
      <polygon points="-50,4 -32,-3 -22,2 -40,9" fill={isDark ? '#334155' : '#e2e8f0'} stroke={palette.deskStroke} strokeWidth="0.8" />
      <polygon points="-46,5 -34,-1 -26,3 -38,9" fill={palette.brandPrimary} opacity="0.35" />
      <ellipse cx="-18" cy="12" rx="5" ry="2.5" fill={palette.deskLeg} />



      {/* Tooltip Card on Hover / Focus */}
      {showTooltip && (
        <foreignObject x="-120" y="-195" width="240" height="130" className="overflow-visible pointer-events-none z-50">
          <div className="bg-surface border border-border rounded-xl p-3 shadow-md text-left text-xs">
            <div className="flex items-center justify-between border-b border-border pb-1 mb-1.5">
              <span className="font-semibold text-text-primary">Human-in-the-Loop Review Bay</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tech text-text-secondary mb-1">
              <span>Pending Decisions:</span>
              <span className={`font-bold ${hasCritical ? 'text-rose-600 dark:text-rose-400' : hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {pendingCount} Action{pendingCount === 1 ? '' : 's'}
              </span>
            </div>
            {hasPending && (
              <>
                <div className="text-[10px] text-text-secondary mb-1">
                  <span className="font-medium text-text-primary">Highest Risk:</span> {highestRisk}
                </div>
                {oldestPending && (
                  <div className="text-[10px] text-text-secondary truncate">
                    <span className="font-medium text-text-primary">Next Action:</span> {oldestPending.title}
                  </div>
                )}
              </>
            )}
            <div className="text-[9px] text-text-muted mt-1.5 pt-1 border-t border-border-subtle">
              Click to inspect pending reviews in Approval Center
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
})
