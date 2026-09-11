import React, { memo } from 'react'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'
import { CorridorSegment } from './zone/CorridorSegment'
import { ZoneDoorway } from './zone/ZoneDoorway'

interface OfficeFloorProps {
  floorHeight: number
  isDark?: boolean
}

export const OfficeFloor: React.FC<OfficeFloorProps> = memo(({ floorHeight, isDark = true }) => {
  const palette = getOffice2_5DPalette(isDark)

  return (
    <g id="office-floor-system" className="select-none pointer-events-none">
      {/* Outer Grounding Drop Shadow for the entire 2.5D Floor Slab */}
      <rect
        x="12"
        y="18"
        width="1376"
        height={floorHeight}
        rx="16"
        fill={palette.slabDropShadow}
        opacity={isDark ? 0.45 : 0.16}
      />

      {/* 2.5D Floor Slab Thickness (Bottom Edge Extrusion with 3-tone bevel) */}
      <polygon
        points={`15,${floorHeight} 1385,${floorHeight} 1385,${floorHeight + 10} 15,${floorHeight + 10}`}
        fill="url(#office-slab-edge-gradient)"
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />
      <line
        x1="15"
        y1={floorHeight + 10}
        x2="1385"
        y2={floorHeight + 10}
        stroke={palette.slabFace}
        strokeWidth="1.2"
      />

      {/* Main Continuous Architectural Isometric Floor Plate */}
      <rect
        x="15"
        y="15"
        width="1370"
        height={floorHeight}
        rx="12"
        fill="url(#office-floor-plate-gradient)"
        stroke={palette.floorStroke}
        strokeWidth="1.5"
      />

      {/* Isometric Floor Tile Pattern Overlay */}
      <rect
        x="15"
        y="15"
        width="1370"
        height={floorHeight}
        rx="12"
        fill="url(#office-floor-grid)"
        className="pointer-events-none"
      />

      {/* Continuous Architectural Walkway Corridor Network */}
      {/* 1. West Vertical Circulation Spine */}
      <CorridorSegment
        x={365}
        y={25}
        width={50}
        height={floorHeight - 35}
        palette={palette}
        isDark={isDark}
        orientation="vertical"
      />

      {/* 2. East Vertical Circulation Spine */}
      <CorridorSegment
        x={985}
        y={25}
        width={50}
        height={floorHeight - 35}
        palette={palette}
        isDark={isDark}
        orientation="vertical"
      />

      {/* 3. North Main Cross-Corridor */}
      <CorridorSegment
        x={35}
        y={345}
        width={1330}
        height={40}
        palette={palette}
        isDark={isDark}
        orientation="horizontal"
      />

      {/* 4. South Main Cross-Corridor */}
      <CorridorSegment
        x={35}
        y={640}
        width={1330}
        height={40}
        palette={palette}
        isDark={isDark}
        orientation="horizontal"
      />

      {/* Architectural Zone Doorway Thresholds */}
      {/* Command Room (East Doorway) */}
      <ZoneDoorway x={362} y={170} width={8} height={45} orientation="vertical" isDark={isDark} />
      {/* Dev Zone (West, East, South Doorways) */}
      <ZoneDoorway x={412} y={170} width={8} height={45} orientation="vertical" isDark={isDark} />
      <ZoneDoorway x={670} y={343} width={60} height={6} orientation="horizontal" isDark={isDark} />
      <ZoneDoorway x={982} y={170} width={8} height={45} orientation="vertical" isDark={isDark} />
      {/* Career Zone (West Doorway) */}
      <ZoneDoorway x={1032} y={170} width={8} height={45} orientation="vertical" isDark={isDark} />

      {/* Marketing Zone (East Doorway) */}
      <ZoneDoorway x={362} y={490} width={8} height={45} orientation="vertical" isDark={isDark} />
      {/* Central Collaboration Area (North & South Doorways) */}
      <ZoneDoorway x={670} y={383} width={60} height={6} orientation="horizontal" isDark={isDark} />
      <ZoneDoorway x={670} y={638} width={60} height={6} orientation="horizontal" isDark={isDark} />
      {/* Lounge (West Doorway) */}
      <ZoneDoorway x={1032} y={490} width={8} height={45} orientation="vertical" isDark={isDark} />

      {/* Server Room (East Doorway) */}
      <ZoneDoorway x={362} y={775} width={8} height={45} orientation="vertical" isDark={isDark} />
      {/* Approval Pod (North Doorway) */}
      <ZoneDoorway x={670} y={678} width={60} height={6} orientation="horizontal" isDark={isDark} />
      {/* Artifact Vault (West Doorway) */}
      <ZoneDoorway x={1032} y={775} width={8} height={45} orientation="vertical" isDark={isDark} />

      {/* Corridor Intersection Navigation Beacons */}
      {[
        { cx: 390, cy: 365 },
        { cx: 1010, cy: 365 },
        { cx: 390, cy: 660 },
        { cx: 1010, cy: 660 },
      ].map((pt, i) => (
        <g key={`corridor-int-${i}`} transform={`translate(${pt.cx}, ${pt.cy})`} opacity="0.65">
          <circle cx="0" cy="0" r="4.5" fill={palette.brandPrimary} />
          <circle cx="0" cy="0" r="10" fill="none" stroke={palette.brandPrimary} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
          <line x1="-8" y1="0" x2="-2" y2="0" stroke={palette.brandPrimary} strokeWidth="1.2" />
          <line x1="2" y1="0" x2="8" y2="0" stroke={palette.brandPrimary} strokeWidth="1.2" />
          <line x1="0" y1="-8" x2="0" y2="-2" stroke={palette.brandPrimary} strokeWidth="1.2" />
          <line x1="0" y1="2" x2="0" y2="8" stroke={palette.brandPrimary} strokeWidth="1.2" />
        </g>
      ))}

      {/* Central Concourse Architectural Branding Ribbon */}
      <g transform="translate(700, 365)" id="central-office-branding" className="pointer-events-none select-none">
        {/* Ambient Floor Glow */}
        <ellipse cx="0" cy="0" rx="140" ry="20" fill={palette.brandGlow} opacity="0.6" />

        {/* Sleek Central Plaque */}
        <rect
          x="-150"
          y="-13"
          width="300"
          height="26"
          rx="5"
          fill={isDark ? '#0f172a' : '#f8fafc'}
          stroke={palette.floorStroke}
          strokeWidth="1"
          opacity="0.95"
        />

        {/* Brand Accent Border */}
        <rect x="-150" y="-13" width="4" height="26" rx="2" fill={palette.brandPrimary} />
        <rect x="146" y="-13" width="4" height="26" rx="2" fill={palette.brandPrimary} />

        {/* SAGARA Title */}
        <text
          x="-65"
          y="3.5"
          textAnchor="middle"
          fill={isDark ? '#f8fafc' : '#0f172a'}
          className="text-[10.5px] font-sans font-black tracking-[0.25em]"
        >
          SAGARA
        </text>

        {/* Separator Dot */}
        <circle cx="-15" cy="0" r="2" fill={palette.brandPrimary} />

        {/* MISSION CONTROL Secondary Title */}
        <text
          x="55"
          y="3"
          textAnchor="middle"
          fill={palette.brandPrimary}
          className="text-[8.5px] font-mono-tech font-bold tracking-[0.2em] uppercase"
        >
          MISSION CONTROL
        </text>
      </g>
    </g>
  )
})
