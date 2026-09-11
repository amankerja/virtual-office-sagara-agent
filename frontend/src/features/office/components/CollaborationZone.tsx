import React, { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ExternalLink } from 'lucide-react'
import type { OfficeCollaborationItem } from '@/features/office/types/office'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'

interface CollaborationZoneProps {
  items: OfficeCollaborationItem[]
  position?: { x: number; y: number }
  isDark?: boolean
}

export const CollaborationZone: React.FC<CollaborationZoneProps> = memo(({
  items,
  position = { x: 0, y: 0 },
  isDark = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const navigate = useNavigate()

  const palette = getOffice2_5DPalette(isDark)
  const activeItem = items[0]
  const hasActive = Boolean(activeItem)

  const handleClick = () => {
    if (activeItem) {
      navigate(`/tasks?task=${activeItem.taskId}`)
    } else {
      navigate('/tasks')
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
      aria-label={`Collaboration Suite: ${items.length} active multi-agent sessions`}
      onKeyDown={handleKeyDown}
    >




      {/* 3. 2.5D Boardroom Conference Table (3-Tone Facet Shading) */}
      {/* Tabletop Surface */}
      <polygon
        points="-80,-10 0,-34 80,-10 0,22"
        fill={palette.collaborationZone.tableTop}
        stroke={palette.collaborationZone.tableStroke}
        strokeWidth="1.2"
        className="transition-colors group-hover:stroke-blue-500"
      />
      {/* Specular Edge Highlight */}
      <line x1="-80" y1="-10" x2="0" y2="-34" stroke={palette.specularHighlight} strokeWidth="1" />
      <line x1="0" y1="-34" x2="80" y2="-10" stroke={palette.specularHighlight} strokeWidth="0.6" />

      {/* Table Front-Left Apron */}
      <polygon
        points="-80,-10 0,22 0,28 -80,-4"
        fill={palette.collaborationZone.tableLeft}
        stroke={palette.collaborationZone.tableStroke}
        strokeWidth="1"
      />
      {/* Table Front-Right Apron */}
      <polygon
        points="0,22 80,-10 80,-4 0,28"
        fill={palette.collaborationZone.tableRight}
        stroke={palette.collaborationZone.tableStroke}
        strokeWidth="1"
      />

      {/* Metallic Table Base Pedestal */}
      <ellipse cx="0" cy="28" rx="28" ry="8" fill={palette.collaborationZone.pedestal} opacity="0.6" />

      {/* 4. 6 Ergonomic Conference Swivel Chairs Around Table */}
      {/* North-West chairs */}
      <ellipse cx="-55" cy="-18" rx="11" ry="5.5" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="0.8" />
      <path d="M -64 -19 Q -55 -25 -46 -19" fill="none" stroke={palette.chairFrame} strokeWidth="2" />

      <ellipse cx="-20" cy="-30" rx="11" ry="5.5" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="0.8" />
      <path d="M -29 -31 Q -20 -37 -11 -31" fill="none" stroke={palette.chairFrame} strokeWidth="2" />

      {/* North-East chairs */}
      <ellipse cx="20" cy="-30" rx="11" ry="5.5" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="0.8" />
      <path d="M 11 -31 Q 20 -37 29 -31" fill="none" stroke={palette.chairFrame} strokeWidth="2" />

      <ellipse cx="55" cy="-18" rx="11" ry="5.5" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="0.8" />
      <path d="M 46 -19 Q 55 -25 64 -19" fill="none" stroke={palette.chairFrame} strokeWidth="2" />

      {/* South-West & South-East front chairs */}
      <ellipse cx="-35" cy="18" rx="12" ry="6" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="0.8" />
      <ellipse cx="35" cy="18" rx="12" ry="6" fill={palette.chairCushionTop} stroke={palette.floorStroke} strokeWidth="0.8" />

      {/* 5. Center Tabletop 360° Speakerphone Disc */}
      <ellipse cx="0" cy="-4" rx="10" ry="5" fill={palette.collaborationZone.speakerphone} stroke={palette.screenBezelStroke} />
      <circle cx="0" cy="-4" r="3" fill={palette.brandPrimary} className={hasActive ? 'motion-safe:animate-pulse' : ''} />

      {/* 6. Shared Presentation Display Screen */}
      <g transform="translate(0, -56)">
        <polygon points="-46,-16 46,-16 46,8 -46,8" fill={palette.screenBezel} stroke={palette.screenBezelStroke} strokeWidth="1.2" />
        <polygon points="-43,-14 43,-14 43,6 -43,6" fill={hasActive ? (isDark ? '#081a32' : '#1e3a5f') : (isDark ? '#0c121c' : '#1e293b')} />
        {/* Specular screen gleam */}
        <polygon points="-43,-14 -10,-14 -43,2" fill="url(#office-specular-gleam)" />

        {hasActive ? (
          <g>
            <text x="0" y="-4" textAnchor="middle" fill={isDark ? '#60a5fa' : '#38bdf8'} className="text-[7px] font-mono-tech font-bold uppercase">
              COLLABORATIVE SESSION
            </text>
            <text x="0" y="3" textAnchor="middle" fill={isDark ? '#f8fafc' : '#ffffff'} className="text-[6.5px] font-mono-tech">
              {activeItem.taskTitle.length > 20 ? activeItem.taskTitle.slice(0, 19) + '…' : activeItem.taskTitle}
            </text>
          </g>
        ) : (
          <g>
            <Users className="h-3.5 w-3.5 -translate-x-1.5 -translate-y-7 text-slate-500" />
            <text x="0" y="2" textAnchor="middle" fill={isDark ? '#64748b' : '#94a3b8'} className="text-[6.5px] font-mono-tech">
              CONFERENCE TABLE · STANDBY
            </text>
          </g>
        )}
      </g>



      {/* Tooltip Card on Hover / Focus */}
      {showTooltip && (
        <foreignObject x="-120" y="-205" width="240" height="130" className="overflow-visible pointer-events-none z-50">
          <div className="bg-surface border border-border rounded-xl p-3 shadow-md text-left text-xs">
            <div className="flex items-center justify-between border-b border-border pb-1 mb-1.5">
              <span className="font-semibold text-text-primary">Conference & Collaboration</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tech text-text-secondary mb-1">
              <span>Active Multi-Agent Tasks:</span>
              <span className="font-bold text-text-primary">{items.length}</span>
            </div>
            {activeItem && (
              <>
                <div className="text-[10px] text-text-secondary mb-1">
                  <span className="font-medium text-text-primary">Current:</span> {activeItem.taskTitle}
                </div>
                <div className="text-[10px] text-text-secondary">
                  <span>Collaborators:</span> {activeItem.agentIds.join(', ')}
                </div>
              </>
            )}
            <div className="text-[9px] text-text-muted mt-1.5 pt-1 border-t border-border-subtle">
              Click to inspect cross-agent tasks in Task Center
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
})
