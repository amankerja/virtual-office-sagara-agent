import React, { memo } from 'react';
import type { Office2_5DPalette } from '../../renderers/Office2_5D/Office2_5DPalette';

interface CorridorSegmentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  palette: Office2_5DPalette;
  isDark: boolean;
  orientation: 'horizontal' | 'vertical';
}

export const CorridorSegment: React.FC<CorridorSegmentProps> = memo(({
  x,
  y,
  width,
  height,
  palette,
  isDark,
  orientation,
}) => {
  return (
    <g className="pointer-events-none select-none">
      {/* 1. Walkway Floor Foundation */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={palette.floorWalkway}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
        rx="2"
      />

      {/* 2. Micro Grid Pattern Texture */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="url(#office-tech-dots)"
        opacity={isDark ? 0.35 : 0.25}
      />

      {/* 3. Center Guide Lighting Strip */}
      {orientation === 'vertical' ? (
        <g>
          <line
            x1={x + width / 2}
            y1={y + 6}
            x2={x + width / 2}
            y2={y + height - 6}
            stroke={palette.floorWalkwayLine}
            strokeWidth="1.2"
            strokeDasharray="8 6"
            opacity="0.6"
          />
          {/* Edge curb lines */}
          <line x1={x + 1} y1={y} x2={x + 1} y2={y + height} stroke={palette.floorStroke} strokeWidth="0.8" opacity="0.7" />
          <line x1={x + width - 1} y1={y} x2={x + width - 1} y2={y + height} stroke={palette.floorStroke} strokeWidth="0.8" opacity="0.7" />
        </g>
      ) : (
        <g>
          <line
            x1={x + 6}
            y1={y + height / 2}
            x2={x + width - 6}
            y2={y + height / 2}
            stroke={palette.floorWalkwayLine}
            strokeWidth="1.2"
            strokeDasharray="8 6"
            opacity="0.6"
          />
          {/* Edge curb lines */}
          <line x1={x} y1={y + 1} x2={x + width} y2={y + 1} stroke={palette.floorStroke} strokeWidth="0.8" opacity="0.7" />
          <line x1={x} y1={y + height - 1} x2={x + width} y2={y + height - 1} stroke={palette.floorStroke} strokeWidth="0.8" opacity="0.7" />
        </g>
      )}

      {/* 4. Contact Ambient Edge Shadow */}
      {orientation === 'vertical' ? (
        <g opacity="0.2">
          <rect x={x} y={y} width={2} height={height} fill={palette.shadowDeep} />
          <rect x={x + width - 2} y={y} width={2} height={height} fill={palette.shadowContact} />
        </g>
      ) : (
        <g opacity="0.2">
          <rect x={x} y={y} width={width} height={2} fill={palette.shadowDeep} />
          <rect x={x} y={y + height - 2} width={width} height={2} fill={palette.shadowContact} />
        </g>
      )}
    </g>
  );
});
