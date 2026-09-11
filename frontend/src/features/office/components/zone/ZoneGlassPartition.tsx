import React, { memo } from 'react';
import type { Office2_5DPalette, Zone2_5DConfig } from '../../renderers/Office2_5D/Office2_5DPalette';
import { OFFICE_DEPTH } from '../../systems/office-depth-tokens';

interface ZoneGlassPartitionProps {
  x: number;
  y: number;
  height: number;
  visual: Zone2_5DConfig;
  palette: Office2_5DPalette;
  isDark: boolean;
}

export const ZoneGlassPartition: React.FC<ZoneGlassPartitionProps> = memo(({
  x,
  y,
  height,
  visual,
  palette: _palette,
  isDark,
}) => {
  const wallT = OFFICE_DEPTH.WALL_BASE;

  return (
    <g opacity="0.85">
      <polygon
        points={`${x + wallT + 1},${y + 45} ${x + wallT + 1},${y + height - 30} ${x + wallT + 3},${y + height - 30} ${x + wallT + 3},${y + 45}`}
        fill="url(#office-glass-specular)"
        stroke={visual.glassStroke}
        strokeWidth="0.6"
      />
      {/* Glass Mounting Hardware Clips */}
      <rect x={x + wallT} y={y + 55} width="4" height="6" rx="1" fill={isDark ? '#475569' : '#94a3b8'} />
      <rect x={x + wallT} y={y + height - 45} width="4" height="6" rx="1" fill={isDark ? '#475569' : '#94a3b8'} />
    </g>
  );
});
