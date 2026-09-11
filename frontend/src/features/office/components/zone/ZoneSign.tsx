import React, { memo } from 'react';
import type { Office2_5DPalette, Zone2_5DConfig } from '../../renderers/Office2_5D/Office2_5DPalette';
interface ZoneSignProps {
  x: number;
  y: number;
  name: string;
  subtitle?: string;
  agentCount: number;
  visual: Zone2_5DConfig;
  palette: Office2_5DPalette;
  isDark: boolean;
}

export const ZoneSign: React.FC<ZoneSignProps> = memo(({
  x,
  y,
  name,
  subtitle,
  agentCount,
  visual,
  palette: _palette,
  isDark,
}) => {
  const displaySubtitle = subtitle || visual.subtitleDefault;
  const signX = x + 18;
  const signY = y + 15; // Mounted directly on North Wall cap/face

  const plateWidth = Math.max(115, name.length * 6.5 + (displaySubtitle ? 10 : 0) + (agentCount > 0 ? 45 : 0));

  return (
    <g transform={`translate(${signX}, ${signY})`} className="pointer-events-none">
      {/* Sleek Architectural Wall Sign Plate */}
      <rect
        x="0"
        y="-9"
        width={plateWidth}
        height="18"
        rx="3"
        fill={isDark ? '#0f172a' : '#ffffff'}
        stroke={visual.wallFace}
        strokeWidth="0.8"
        opacity={isDark ? 0.92 : 0.95}
      />

      {/* Accent Indicator Bar */}
      <rect
        x="0"
        y="-9"
        width="3"
        height="18"
        rx="1"
        fill={visual.accent}
      />

      {/* Room Name Title */}
      <text
        x="8"
        y="-0.5"
        fill={isDark ? '#f8fafc' : '#0f172a'}
        className="text-[8px] font-sans font-bold uppercase tracking-wider"
      >
        {name}
      </text>

      {/* Subtitle */}
      {displaySubtitle && (
        <text
          x="8"
          y="6.5"
          fill={isDark ? '#94a3b8' : '#64748b'}
          className="text-[6.5px] font-sans font-medium tracking-tight opacity-75"
        >
          {displaySubtitle}
        </text>
      )}

      {/* Agent Count (inline, unobtrusive) */}
      {agentCount > 0 && (
        <g transform={`translate(${plateWidth - 45}, 0)`}>
          <circle cx="-1" cy="0" r="2" fill={visual.accent} />
          <text
            x="4"
            y="2.5"
            fill={visual.accent}
            className="text-[6.5px] font-mono-tech font-bold"
          >
            {agentCount} ACT
          </text>
        </g>
      )}
    </g>
  );
});
