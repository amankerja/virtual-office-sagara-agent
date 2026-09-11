import React, { memo } from 'react'
import type { OfficeZoneProjection } from '@/features/office/types/office'
import { getOffice2_5DPalette, getZone2_5DConfig } from '../renderers/Office2_5D/Office2_5DPalette'
import { OFFICE_DEPTH, OFFICE_LIGHT, ZONE_TIER } from '../systems/office-depth-tokens'
import { ZoneWall } from './zone/ZoneWall'
import { ZoneGlassPartition } from './zone/ZoneGlassPartition'
import { ZoneSign } from './zone/ZoneSign'
import { ZoneContent } from './zone/ZoneContent'
import type { OfficeRuntimeProjection, OfficeVaultProjection, OfficeCollaborationItem, OfficeApprovalProjection } from '@/features/office/types/office'
import { useAnimationSettings } from '../animation/useAnimationSettings'

interface OfficeZoneProps {
  zone: OfficeZoneProjection
  isDark?: boolean
  runtimeSummary?: OfficeRuntimeProjection;
  vaultSummary?: OfficeVaultProjection;
  collaborationItems?: OfficeCollaborationItem[];
  approvalSummary?: OfficeApprovalProjection;
}

export const OfficeZone: React.FC<OfficeZoneProps> = memo(({
  zone,
  isDark = true,
  runtimeSummary,
  vaultSummary,
  collaborationItems,
  approvalSummary,
}) => {
  const { bounds, name, subtitle, agentCount, type } = zone
  const { x, y, width, height } = bounds

  const palette = getOffice2_5DPalette(isDark)
  const visual = getZone2_5DConfig(type, isDark)
  const displaySubtitle = subtitle || visual.subtitleDefault

  const cornerR = 10
  const tier = ZONE_TIER[type];
  const isTier1 = tier === 1;
  const settings = useAnimationSettings();

  return (
    <g className={`select-none pointer-events-none ${isTier1 && !settings.reducedMotion ? 'motion-safe:animate-pulse' : ''}`} data-zone={type} id={`architectural-zone-${zone.id}`}>
      {/* 1. Zone Floor Contact Shadow */}
      <rect
        x={x + OFFICE_LIGHT.shadowOffsetX / 2}
        y={y + OFFICE_LIGHT.shadowOffsetY / 2}
        width={width}
        height={height}
        rx={cornerR}
        fill={palette.shadowAmbient}
      />

      {/* 2. Elevated 2.5D Floor Slab Bottom Extrusion */}
      <polygon
        points={`${x},${y + height} ${x + width},${y + height} ${x + width},${y + height + 6} ${x},${y + height + 6}`}
        fill={palette.slabFace}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />

      {/* 3. Architectural Room Floor Foundation */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={cornerR}
        fill={visual.floorFill}
        stroke={visual.floorStroke}
        strokeWidth="1.2"
      />

      {/* Zone Specific Architectural Floor Details */}
      {type === 'DEV_ZONE' && (
        <g opacity="0.45" stroke={visual.accent} strokeWidth="0.8">
          {/* Tech Grid Corner Crosshairs */}
          <path d={`M ${x + 18} ${y + 35} L ${x + 26} ${y + 35} M ${x + 22} ${y + 31} L ${x + 22} ${y + 39}`} />
          <path d={`M ${x + width - 26} ${y + 35} L ${x + width - 18} ${y + 35} M ${x + width - 22} ${y + 31} L ${x + width - 22} ${y + 39}`} />
          <path d={`M ${x + 18} ${y + height - 20} L ${x + 26} ${y + height - 20} M ${x + 22} ${y + height - 24} L ${x + 22} ${y + height - 16}`} />
          <path d={`M ${x + width - 26} ${y + height - 20} L ${x + width - 18} ${y + height - 20} M ${x + width - 22} ${y + height - 24} L ${x + width - 22} ${y + height - 16}`} />
          {/* Dev Sub-Floor Optical Data Line */}
          <line x1={x + 30} y1={y + height - 15} x2={x + width - 30} y2={y + height - 15} strokeDasharray="6 4" strokeWidth="0.8" />
        </g>
      )}

      {type === 'COMMAND' && (
        <g opacity="0.45" stroke={visual.accent} strokeWidth="0.8">
          {/* Executive Command Perimeter Inlay */}
          <rect
            x={x + 14}
            y={y + 14}
            width={width - 28}
            height={height - 28}
            rx="6"
            fill="none"
            strokeDasharray="12 8"
          />
        </g>
      )}

      {type === 'RUNTIME' && (
        <g opacity="0.5">
          {/* Datacenter Raised Perforated Vent Floor */}
          <line x1={x + 15} y1={y + height - 25} x2={x + width - 15} y2={y + height - 25} stroke={visual.accent} strokeWidth="1" strokeDasharray="3 3" />
        </g>
      )}

      {type === 'VAULT' && (
        <g opacity="0.4" stroke={visual.accent} strokeWidth="0.8">
          {/* Vault Security Riveted Floor Seams */}
          <line x1={x + 12} y1={y + 30} x2={x + 12} y2={y + height - 15} strokeDasharray="4 6" />
          <line x1={x + width - 12} y1={y + 30} x2={x + width - 12} y2={y + height - 15} strokeDasharray="4 6" />
        </g>
      )}

      {/* Architectural Walls */}
      <ZoneWall side="north" x={x} y={y} width={width} height={height} visual={visual} palette={palette} isDark={isDark} />
      <ZoneWall side="west" x={x} y={y} width={width} height={height} visual={visual} palette={palette} isDark={isDark} />
      <ZoneWall side="south" x={x} y={y} width={width} height={height} visual={visual} palette={palette} isDark={isDark} />
      <ZoneWall side="east" x={x} y={y} width={width} height={height} visual={visual} palette={palette} isDark={isDark} />

      {/* Glass Partition (conditional) */}
      {(type === 'COMMAND' || type === 'APPROVAL' || type === 'COLLABORATION' || type === 'RUNTIME') && (
        <ZoneGlassPartition x={x} y={y} height={height} visual={visual} palette={palette} isDark={isDark} />
      )}

      {/* 7. Corner Architectural Columns / Pillars with 3-Tone Facet Shading */}
      {/* Top-Left Column */}
      <g transform={`translate(${x}, ${y})`}>
        <rect x="0" y="0" width={OFFICE_DEPTH.WALL_BASE + 4} height={OFFICE_DEPTH.WALL_TOP + 2} rx="2" fill={visual.wallTop} stroke={palette.floorStroke} strokeWidth="0.8" />
        <rect x="2" y="2" width={OFFICE_DEPTH.WALL_BASE} height="4" rx="1" fill={visual.accent} opacity="0.75" />
      </g>
      {/* Top-Right Column */}
      <g transform={`translate(${x + width - OFFICE_DEPTH.WALL_BASE - 4}, ${y})`}>
        <rect x="0" y="0" width={OFFICE_DEPTH.WALL_BASE + 4} height={OFFICE_DEPTH.WALL_TOP + 2} rx="2" fill={visual.wallTop} stroke={palette.floorStroke} strokeWidth="0.8" />
        <rect x="2" y="2" width={OFFICE_DEPTH.WALL_BASE} height="4" rx="1" fill={visual.accent} opacity="0.75" />
      </g>

      {/* Architectural Signage */}
      <ZoneSign
        x={x}
        y={y}
        name={name}
        subtitle={displaySubtitle}
        agentCount={agentCount}
        visual={visual}
        palette={palette}
        isDark={isDark}
      />

      {/* Zone Specific Content (Facility Stations etc.) */}
      <ZoneContent
        x={x}
        y={y}
        width={width}
        height={height}
        type={type}
        isDark={isDark}
        palette={palette}
        visual={visual}
        runtimeSummary={runtimeSummary}
        vaultSummary={vaultSummary}
        collaborationItems={collaborationItems}
        approvalSummary={approvalSummary}
      />
    </g>
  )
})
