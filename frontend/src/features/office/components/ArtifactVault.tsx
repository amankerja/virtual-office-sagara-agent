import React, { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { OfficeVaultProjection } from '@/features/office/types/office'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'

interface ArtifactVaultProps {
  summary: OfficeVaultProjection
  position?: { x: number; y: number }
  isDark?: boolean
}

export const ArtifactVault: React.FC<ArtifactVaultProps> = memo(({
  summary,
  position = { x: 0, y: 0 },
  isDark = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const navigate = useNavigate()
  const { totalArtifacts, completedTasksWithArtifacts } = summary

  const palette = getOffice2_5DPalette(isDark)
  const primaryTask = completedTasksWithArtifacts[0]

  const handleClick = () => {
    if (primaryTask) {
      navigate(`/tasks?task=${primaryTask.taskId}`)
    } else {
      navigate('/tasks?state=COMPLETED')
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
      aria-label={`Artifact Vault: ${totalArtifacts} verified outputs in storage`}
      onKeyDown={handleKeyDown}
    >




      {/* Reinforced Floor Seam Lines & Rivets */}
      <g stroke={palette.deskLeg} strokeWidth="0.8" opacity="0.4">
        <line x1="-80" y1="-8" x2="0" y2="28" />
        <line x1="0" y1="28" x2="80" y2="-8" />
        <circle cx="-40" cy="10" r="1.5" fill={palette.deskLegFoot} />
        <circle cx="40" cy="10" r="1.5" fill={palette.deskLegFoot} />
      </g>

      {/* ARCHIVE STORAGE RACK 1 (Left Shelving Unit with 3-Tone Shading) */}
      <g transform="translate(-75, -28)">
        {/* Top Surface (Lightest) */}
        <polygon points="-26,-11 0,-19 26,-11 0,-3" fill={palette.artifactVault.shelfTop} stroke={palette.artifactVault.shelfStroke} strokeWidth="1" />
        <line x1="-26" y1="-11" x2="0" y2="-19" stroke={palette.specularHighlight} strokeWidth="1" />
        {/* Left Face (Mid tone) */}
        <polygon points="-26,-11 0,-3 0,52 -26,44" fill={palette.artifactVault.shelfLeft} stroke={palette.artifactVault.shelfStroke} strokeWidth="1" />
        {/* Front Isometric Shelves (Darker tone) */}
        <polygon points="0,-3 26,-11 26,44 0,52" fill={palette.artifactVault.shelfFront} stroke={palette.artifactVault.shelfStroke} strokeWidth="1" />
        {/* Shelf Levels */}
        <line x1="0" y1="10" x2="26" y2="2" stroke={palette.artifactVault.shelfDivider} strokeWidth="1.5" />
        <line x1="0" y1="24" x2="26" y2="16" stroke={palette.artifactVault.shelfDivider} strokeWidth="1.5" />
        <line x1="0" y1="38" x2="26" y2="30" stroke={palette.artifactVault.shelfDivider} strokeWidth="1.5" />
        {/* Archive Document Boxes & Data Canisters on Shelves */}
        {/* Level 1 boxes */}
        <polygon points="2,6 8,4 8,9 2,11" fill={palette.artifactVault.boxNeutral} stroke={palette.floorStroke} strokeWidth="0.6" />
        <polygon points="10,3 16,1 16,6 10,8" fill={palette.artifactVault.boxNeutral} stroke={palette.floorStroke} strokeWidth="0.6" />
        <polygon points="18,0 24,-2 24,3 18,5" fill={palette.artifactVault.boxBlue} stroke={palette.floorStroke} strokeWidth="0.6" />
        {/* Level 2 boxes */}
        <polygon points="3,20 10,18 10,23 3,25" fill={palette.artifactVault.boxNeutral} stroke={palette.floorStroke} strokeWidth="0.6" />
        <polygon points="13,16 22,13 22,20 13,23" fill={palette.artifactVault.boxYellow} stroke={palette.floorStroke} strokeWidth="0.6" />
        {/* Level 3 binders */}
        <polygon points="2,34 6,33 6,38 2,39" fill={palette.artifactVault.boxRed} stroke={palette.floorStroke} strokeWidth="0.5" />
        <polygon points="7,32 11,31 11,36 7,37" fill={palette.artifactVault.boxBlue} stroke={palette.floorStroke} strokeWidth="0.5" />
        <polygon points="12,30 16,29 16,34 12,35" fill={palette.artifactVault.boxGreen} stroke={palette.floorStroke} strokeWidth="0.5" />
      </g>

      {/* ARCHIVE STORAGE RACK 2 (Right Shelving Unit) */}
      <g transform="translate(75, -28)">
        {/* Top */}
        <polygon points="-26,-11 0,-19 26,-11 0,-3" fill={palette.artifactVault.shelfTop} stroke={palette.artifactVault.shelfStroke} strokeWidth="1" />
        <line x1="-26" y1="-11" x2="0" y2="-19" stroke={palette.specularHighlight} strokeWidth="1" />
        {/* Left Face */}
        <polygon points="-26,-11 0,-3 0,52 -26,44" fill={palette.artifactVault.shelfLeft} stroke={palette.artifactVault.shelfStroke} strokeWidth="1" />
        {/* Front Shelves */}
        <polygon points="0,-3 26,-11 26,44 0,52" fill={palette.artifactVault.shelfFront} stroke={palette.artifactVault.shelfStroke} strokeWidth="1" />
        {/* Shelves */}
        <line x1="-26" y1="3" x2="0" y2="11" stroke={palette.artifactVault.shelfDivider} strokeWidth="1.5" />
        <line x1="-26" y1="17" x2="0" y2="25" stroke={palette.artifactVault.shelfDivider} strokeWidth="1.5" />
        <line x1="-26" y1="31" x2="0" y2="39" stroke={palette.artifactVault.shelfDivider} strokeWidth="1.5" />
        {/* Storage Cases */}
        <polygon points="-23,0 -15,3 -15,8 -23,5" fill={palette.artifactVault.boxYellow} stroke={palette.floorStroke} strokeWidth="0.6" />
        <polygon points="-12,4 -4,7 -4,12 -12,9" fill={palette.artifactVault.boxNeutral} stroke={palette.floorStroke} strokeWidth="0.6" />
        <polygon points="-22,14 -10,18 -10,24 -22,20" fill={palette.artifactVault.boxBlue} stroke={palette.floorStroke} strokeWidth="0.6" />
      </g>

      {/* DIGITAL LEDGER & ASSET TERMINAL (Center with 3-Tone Shading) */}
      <g transform="translate(0, -6)">
        {/* Terminal Pedestal Base */}
        <polygon points="-36,-10 0,-24 36,-10 0,6" fill={palette.deskTop} stroke={palette.deskStroke} strokeWidth="1" />
        <polygon points="-36,-10 0,6 0,12 -36,-4" fill={palette.deskFaceLeft} stroke={palette.deskStroke} strokeWidth="1" />
        <polygon points="0,6 36,-10 36,-4 0,12" fill={palette.deskFaceRight} stroke={palette.deskStroke} strokeWidth="1" />

        {/* Holographic Deliverables Vault Screen */}
        <g transform="translate(0, -16)">
          <rect x="-24" y="-16" width="48" height="24" rx="3" fill={palette.screenBezel} stroke={palette.screenBezelStroke} strokeWidth="1.2" />
          <rect x="-22" y="-14" width="44" height="20" rx="2" fill={isDark ? '#0f172a' : '#1e293b'} />
          {/* Specular gleam */}
          <polygon points="-22,-14 -8,-14 -22,0" fill="url(#office-specular-gleam)" />
          {/* Holographic Glowing Cube / Output Icon */}
          <polygon points="-12,-8 0,-13 12,-8 0,-3" fill={isDark ? '#38bdf8' : '#60a5fa'} opacity="0.85" />
          <polygon points="-12,-8 0,-3 0,4 -12,-1" fill={isDark ? '#0284c7' : '#2563eb'} opacity="0.9" />
          <polygon points="0,-3 12,-8 12,-1 0,4" fill={isDark ? '#0369a1' : '#1d4ed8'} opacity="0.95" />
          <text x="0" y="3" textAnchor="middle" className="text-[6.5px] font-mono-tech font-bold fill-white">
            {totalArtifacts} FILES
          </text>
        </g>
      </g>



      {/* Tooltip Card on Hover / Focus */}
      {showTooltip && (
        <foreignObject x="-120" y="-205" width="240" height="130" className="overflow-visible pointer-events-none z-50">
          <div className="bg-surface border border-border rounded-xl p-3 shadow-md text-left text-xs">
            <div className="flex items-center justify-between border-b border-border pb-1 mb-1.5">
              <span className="font-semibold text-text-primary">Verified Deliverables Vault</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tech text-text-secondary mb-1">
              <span>Verified Artifacts:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{totalArtifacts} Total</span>
            </div>
            <div className="text-[10px] text-text-secondary mb-1">
              <span>Tasks with Artifacts:</span> <span className="font-bold text-text-primary">{completedTasksWithArtifacts.length}</span>
            </div>
            {primaryTask && (
              <div className="text-[10px] text-text-secondary truncate">
                <span className="font-medium text-text-primary">Latest Output:</span> {primaryTask.taskTitle}
              </div>
            )}
            <div className="text-[9px] text-text-muted mt-1.5 pt-1 border-t border-border-subtle">
              Click to view completed task outputs in Task Center
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
})
