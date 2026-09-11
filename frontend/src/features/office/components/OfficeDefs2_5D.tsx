import React, { memo } from 'react'
import type { AnimationQuality } from '../animation/behavior'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'

interface OfficeDefs2_5DProps {
  isDark: boolean
  quality?: AnimationQuality
  reducedMotion?: boolean
}

/**
 * OfficeDefs2_5D:
 * Centralized SVG <defs> repository for 2.5D Isometric Virtual Office.
 * Aggressively reusable gradients, textures, and patterns defined ONCE at scene root.
 * Expensive filters are strictly gated behind high-quality tiers and motion settings.
 */
export const OfficeDefs2_5D: React.FC<OfficeDefs2_5DProps> = memo(({
  isDark,
  quality = 'BALANCED',
  reducedMotion = false,
}) => {
  const palette = getOffice2_5DPalette(isDark)
  const enableFilters = quality === 'FULL' && !reducedMotion

  return (
    <defs>
      {/* 1. True 2.5D Isometric Diamond Floor Tile Pattern */}
      <pattern id="office-floor-grid" width="60" height="30" patternUnits="userSpaceOnUse">
        <path
          d="M 30 0 L 60 15 L 30 30 L 0 15 Z"
          fill="none"
          stroke={palette.floorGrid}
          strokeWidth="0.75"
          opacity={isDark ? 0.35 : 0.45}
        />
      </pattern>

      {/* 2. Raised Server Perforated Grid Pattern */}
      <pattern id="server-raised-tiles" width="30" height="15" patternUnits="userSpaceOnUse">
        <path
          d="M 15 0 L 30 7.5 L 15 15 L 0 7.5 Z"
          fill="none"
          stroke={isDark ? '#38bdf8' : '#0284c7'}
          strokeWidth="0.5"
          opacity={isDark ? 0.35 : 0.25}
        />
        <circle cx="15" cy="7.5" r="0.75" fill={isDark ? '#38bdf8' : '#0284c7'} opacity={0.3} />
      </pattern>

      {/* 3. Wood Parquet / Acoustic Slats Pattern (Collaboration & Lounge) */}
      <pattern id="office-wood-parquet" width="40" height="20" patternUnits="userSpaceOnUse">
        <path
          d="M 0 5 L 40 5 M 0 15 L 40 15 M 20 0 L 20 20"
          stroke={isDark ? '#5c4a38' : '#b8a690'}
          strokeWidth="0.6"
          opacity={isDark ? 0.25 : 0.2}
          fill="none"
        />
      </pattern>

      {/* 4. Precision Tech Dot Grid (Dev Zone) */}
      <pattern id="office-tech-dots" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="0.8" fill={isDark ? '#06b6d4' : '#0891b2'} opacity="0.3" />
      </pattern>

      {/* 5. Continuous Architectural Floor Plate Gradient */}
      <linearGradient id="office-floor-plate-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={palette.floorBase} stopOpacity="1" />
        <stop offset="70%" stopColor={palette.floorBase} stopOpacity="1" />
        <stop offset="100%" stopColor={isDark ? '#14181f' : '#eae7df'} stopOpacity="1" />
      </linearGradient>

      {/* 6. Standard Workstation Desk Surface Gradient (Refined Sheen) */}
      <linearGradient id="office-desk-top-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={palette.deskTop} />
        <stop offset="100%" stopColor={palette.deskFaceLeft} />
      </linearGradient>

      {/* 7. Command Room Executive Desk Surface Gradient */}
      <linearGradient id="office-desk-command-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={palette.commandDeskTop} />
        <stop offset="100%" stopColor={palette.commandDeskFaceLeft} />
      </linearGradient>

      {/* 8. Active Screen Inner Glow Gradient */}
      <linearGradient id="office-screen-active-glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={isDark ? '#044c3c' : '#047857'} />
        <stop offset="100%" stopColor={isDark ? '#022c22' : '#064e3b'} />
      </linearGradient>

      {/* 9. Approval Screen Inner Glow Gradient */}
      <linearGradient id="office-screen-approval-glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={isDark ? '#78350f' : '#b45309'} />
        <stop offset="100%" stopColor={isDark ? '#451a03' : '#78350f'} />
      </linearGradient>

      {/* 10. Error Screen Inner Glow Gradient */}
      <linearGradient id="office-screen-error-glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={isDark ? '#7f1d1d' : '#b91c1c'} />
        <stop offset="100%" stopColor={isDark ? '#450a0a' : '#7f1d1d'} />
      </linearGradient>

      {/* 11. Idle Screen Inner Gradient */}
      <linearGradient id="office-screen-idle-glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={isDark ? '#111827' : '#1e293b'} />
        <stop offset="100%" stopColor={isDark ? '#070a10' : '#0f172a'} />
      </linearGradient>

      {/* 12. Specular Glass Reflection Sheen (Monitors & Laptop displays) */}
      <linearGradient id="office-specular-gleam" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? 0.18 : 0.28} />
        <stop offset="35%" stopColor="#ffffff" stopOpacity={isDark ? 0.05 : 0.08} />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>

      {/* 13. Semi-Transparent Architectural Glass Divider Gradient */}
      <linearGradient id="office-glass-specular" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity={isDark ? 0.25 : 0.20} />
        <stop offset="50%" stopColor="#ffffff" stopOpacity={isDark ? 0.28 : 0.35} />
        <stop offset="100%" stopColor="#0284c7" stopOpacity={isDark ? 0.15 : 0.12} />
      </linearGradient>

      {/* 14. Server Face Brushed Steel Gradient */}
      <linearGradient id="office-server-face-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={palette.runtimeRoom.rackFront} />
        <stop offset="100%" stopColor={isDark ? '#080b0f' : '#141c26'} />
      </linearGradient>

      {/* 15. Floor Slab Bevel Lighting Gradient */}
      <linearGradient id="office-slab-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={palette.slabFace} />
        <stop offset="50%" stopColor={isDark ? '#232b38' : '#e6e3dc'} />
        <stop offset="100%" stopColor={palette.slabFace} />
      </linearGradient>

      {/* 16. Optional Subtle Contact Shadow Filter (Only rendered in ULTRA tier) */}
      {enableFilters && (
        <filter id="office-contact-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.25 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      )}
    </defs>
  )
})
