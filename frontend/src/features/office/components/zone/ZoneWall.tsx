import React, { memo } from 'react';
import type { Office2_5DPalette, Zone2_5DConfig } from '../../renderers/Office2_5D/Office2_5DPalette';
import { OFFICE_DEPTH } from '../../systems/office-depth-tokens';

interface ZoneWallProps {
  x: number;
  y: number;
  width: number;
  height: number;
  side: 'north' | 'south' | 'east' | 'west';
  visual: Zone2_5DConfig;
  palette: Office2_5DPalette;
  isDark: boolean;
}

export const ZoneWall: React.FC<ZoneWallProps> = memo(({
  x,
  y,
  width,
  height,
  side,
  visual,
  palette,
  isDark: _isDark,
}) => {
  const wallH = OFFICE_DEPTH.WALL_TOP;
  const wallT = OFFICE_DEPTH.WALL_BASE;

  // Common properties for wall polygons
  const wallStroke = palette.floorStroke;
  const wallStrokeWidth = "0.8";

  // North Wall
  if (side === 'north') {
    return (
      <g>
        {/* North Wall Top Cap Surface (Ledge — Lightest Tone) */}
        <polygon
          points={`${x},${y} ${x + width},${y} ${x + width},${y + wallT} ${x},${y + wallT}`}
          fill={visual.wallTop}
          stroke={wallStroke}
          strokeWidth={wallStrokeWidth}
        />
        {/* North Wall Front Shaded Extrusion Face (Mid/Dark Tone) */}
        <polygon
          points={`${x},${y + wallT} ${x + width},${y + wallT} ${x + width},${y + wallH} ${x},${y + wallH}`}
          fill={visual.wallFace}
          stroke={wallStroke}
          strokeWidth={wallStrokeWidth}
        />
        {/* North Wall Ambient Architectural Glow Strip */}
        <line
          x1={x + 12}
          y1={y + wallT + 2}
          x2={x + width - 12}
          y2={y + wallT + 2}
          stroke={visual.accent}
          strokeWidth="1.2"
          opacity="0.45"
        />
      </g>
    );
  }

  // West Wall
  if (side === 'west') {
    return (
      <polygon
        points={`${x},${y + wallT} ${x + wallT},${y + wallT} ${x + wallT},${y + height - 8} ${x},${y + height - 8}`}
        fill={visual.wallTop} // Assuming west wall uses wallTop for its single visible face
        stroke={wallStroke}
        strokeWidth={wallStrokeWidth}
      />
    );
  }

  // South Wall (low curb with central doorway cutaway for readability & pedestrian flow)
  if (side === 'south') {
    const doorW = 70;
    const doorStart = x + (width - doorW) / 2;
    const doorEnd = doorStart + doorW;

    return (
      <g>
        {/* West segment of south curb */}
        <polygon
          points={`${x},${y + height} ${doorStart},${y + height} ${doorStart},${y + height - 4} ${x},${y + height - 4}`}
          fill={visual.wallTop}
          stroke={wallStroke}
          strokeWidth={wallStrokeWidth}
        />
        {/* East segment of south curb */}
        <polygon
          points={`${doorEnd},${y + height} ${x + width},${y + height} ${x + width},${y + height - 4} ${doorEnd},${y + height - 4}`}
          fill={visual.wallTop}
          stroke={wallStroke}
          strokeWidth={wallStrokeWidth}
        />
        {/* Doorway threshold metal transition strip */}
        <rect
          x={doorStart}
          y={y + height - 2}
          width={doorW}
          height={3}
          fill={palette.brandPrimary}
          opacity={0.35}
        />
      </g>
    );
  }

  // East Wall
  if (side === 'east') {
    return (
      <polygon
        points={`${x + width},${y + wallT} ${x + width - wallT},${y + wallT} ${x + width - wallT},${y + height - 8} ${x + width},${y + height - 8}`}
        fill={visual.wallTop} // Assuming east wall uses wallTop
        stroke={wallStroke}
        strokeWidth={wallStrokeWidth}
      />
    );
  }

  return null;
});
