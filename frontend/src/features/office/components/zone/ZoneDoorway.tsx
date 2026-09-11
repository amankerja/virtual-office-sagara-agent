import React, { memo } from 'react';

interface ZoneDoorwayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  orientation?: 'horizontal' | 'vertical';
  isDark?: boolean;
}

export const ZoneDoorway: React.FC<ZoneDoorwayProps> = memo(({
  x,
  y,
  width,
  height,
  orientation = width > height ? 'horizontal' : 'vertical',
  isDark = true,
}) => {
  const plateFill = isDark ? '#1e293b' : '#cbd5e1';
  const accentStroke = isDark ? '#3b82f6' : '#2563eb';

  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-none select-none">
      {/* Threshold Plate */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill={plateFill}
        opacity="0.6"
        rx="1.5"
      />
      {/* Subtle guide line through threshold */}
      {orientation === 'horizontal' ? (
        <line
          x1="2"
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke={accentStroke}
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity="0.75"
        />
      ) : (
        <line
          x1={width / 2}
          y1="2"
          x2={width / 2}
          y2={height - 2}
          stroke={accentStroke}
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity="0.75"
        />
      )}
    </g>
  );
});
