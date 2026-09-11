import React, { memo } from 'react';
import type { Office2_5DPalette } from '../../renderers/Office2_5D/Office2_5DPalette';
import { ZoneDoorway } from './ZoneDoorway';

interface ZoneLoungeProps {
  x: number;
  y: number;
  isDark: boolean;
  palette: Office2_5DPalette;
}

export const ZoneLounge: React.FC<ZoneLoungeProps> = memo(({
  x,
  y,
  isDark,
  palette,
}) => {
  const loungeX = x;
  const loungeY = y;

  const wallCapColor = isDark ? '#334155' : '#cbd5e1';
  const wallFaceColor = isDark ? '#1e293b' : '#94a3b8';

  return (
    <g id="office-break-area" aria-label="Break / Lounge Area" transform={`translate(${loungeX}, ${loungeY})`}>
      {/* 1. Ground Contact Shadow */}
      <rect
        x="-155"
        y="-122"
        width="310"
        height="250"
        rx="12"
        fill={palette.shadowAmbient}
        opacity={0.6}
      />

      {/* 2. Elevated Slab Extrusion */}
      <polygon
        points="-160,128 160,128 160,134 -160,134"
        fill={palette.slabFace}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />

      {/* 3. Architectural Room Floor Foundation */}
      <rect
        x="-160"
        y="-127"
        width="320"
        height="255"
        rx="10"
        fill={palette.breakLounge.rugFill}
        stroke={palette.breakLounge.rugStroke}
        strokeWidth="1.2"
      />

      {/* 4. Warm Wood Parquet Overlay */}
      <rect
        x="-154"
        y="-121"
        width="308"
        height="243"
        rx="8"
        fill="url(#office-wood-parquet)"
        opacity={isDark ? 0.3 : 0.45}
        className="pointer-events-none"
      />

      {/* 5. North Wall */}
      <polygon
        points="-160,-127 160,-127 160,-111 -160,-111"
        fill={wallCapColor}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />
      <polygon
        points="-160,-111 160,-111 160,-97 -160,-97"
        fill={wallFaceColor}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />
      {/* Warm Ambient LED Strip */}
      <line
        x1="-140"
        y1="-109"
        x2="140"
        y2="-109"
        stroke="#f59e0b"
        strokeWidth="1.2"
        opacity="0.55"
      />

      {/* 6. East Wall */}
      <polygon
        points="160,-111 144,-111 144,120 160,120"
        fill={wallCapColor}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />

      {/* 7. South Low Wall Curb with Cutaway */}
      <polygon
        points="-160,128 -35,128 -35,124 -160,124"
        fill={wallCapColor}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />
      <polygon
        points="35,128 160,128 160,124 35,124"
        fill={wallCapColor}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />

      {/* 8. West Entrance from East Corridor */}
      <polygon
        points="-160,-97 -146,-97 -146,-32 -160,-32"
        fill={wallFaceColor}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />
      <polygon
        points="-160,32 -146,32 -146,120 -160,120"
        fill={wallFaceColor}
        stroke={palette.floorStroke}
        strokeWidth="0.8"
      />
      {/* West Doorway Threshold */}
      <ZoneDoorway x={-160} y={-30} width={14} height={60} orientation="vertical" isDark={isDark} />

      {/* 9. Wall Signage Plate on North Wall */}
      <g transform="translate(-142, -112)" className="pointer-events-none select-none">
        <rect
          x="0"
          y="-8"
          width="156"
          height="16"
          rx="3"
          fill={isDark ? '#0f172a' : '#ffffff'}
          stroke={palette.floorStroke}
          strokeWidth="0.8"
          opacity="0.95"
        />
        <rect x="0" y="-8" width="3" height="16" rx="1" fill="#f59e0b" />
        <text
          x="8"
          y="0"
          fill={isDark ? '#f8fafc' : '#0f172a'}
          className="text-[8px] font-sans font-bold uppercase tracking-wider"
        >
          BREAK / REFRESHMENT LOUNGE
        </text>
        <text
          x="8"
          y="6.5"
          fill={isDark ? '#94a3b8' : '#64748b'}
          className="text-[6.5px] font-sans font-medium tracking-tight opacity-75"
        >
          Relaxation & Informal Discussions
        </text>
      </g>

      {/* 10. FURNITURE & AMENITIES */}

      {/* Espresso Coffee Bar Counter (North-West) */}
      <g transform="translate(-85, -45)">
        <ellipse cx="0" cy="22" rx="36" ry="11" fill={palette.shadowAmbient} />
        {/* Counter Top Surface (Lightest) */}
        <polygon
          points="-36,-10 0,-22 36,-10 0,6"
          fill={palette.breakLounge.counterTop}
          stroke={palette.breakLounge.counterStroke}
          strokeWidth="1"
        />
        <line x1="-36" y1="-10" x2="0" y2="-22" stroke={palette.specularHighlight} strokeWidth="0.8" />
        {/* Counter Front-Left Apron (Mid tone) */}
        <polygon
          points="-36,-10 0,6 0,22 -36,8"
          fill={palette.breakLounge.counterLeft}
          stroke={palette.breakLounge.counterStroke}
          strokeWidth="1"
        />
        {/* Counter Front-Right Apron (Dark tone) */}
        <polygon
          points="0,6 36,-10 36,8 0,22"
          fill={palette.breakLounge.counterRight}
          stroke={palette.breakLounge.counterStroke}
          strokeWidth="1"
        />
        {/* Espresso Machine */}
        <rect
          x="-18"
          y="-32"
          width="22"
          height="22"
          rx="2"
          fill={palette.breakLounge.espressoMachine}
          stroke={palette.screenBezel}
          strokeWidth="0.8"
        />
        <rect x="-14" y="-28" width="14" height="8" rx="1" fill={isDark ? '#94a3b8' : '#cbd5e1'} />
        <line x1="-7" y1="-20" x2="-7" y2="-13" stroke="#e2e8f0" strokeWidth="1.5" />
        {/* Steam Animation */}
        <path className="office-ambient" d="M -7 -32 Q -10 -38 -6 -42" stroke="#cbd5e1" strokeWidth="1.2" fill="none" opacity="0.8" />
        {/* Cups & Saucers */}
        <ellipse cx="14" cy="-4" rx="4" ry="2.2" fill="#f8fafc" stroke="#64748b" strokeWidth="0.6" />
        <ellipse cx="24" cy="-1" rx="4" ry="2.2" fill="#f8fafc" stroke="#64748b" strokeWidth="0.6" />
      </g>

      {/* Fresh Water Cooler Station */}
      <g transform="translate(-25, -60)">
        <ellipse cx="0" cy="18" rx="10" ry="5" fill={palette.shadowAmbient} />
        <rect x="-7" y="-12" width="14" height="28" rx="2" fill={palette.breakLounge.waterCooler} stroke={palette.floorStroke} strokeWidth="0.8" />
        {/* Inverted Blue Water Bottle */}
        <path d="M -6 -12 L -6 -26 Q 0 -29 6 -26 L 6 -12 Z" fill="#38bdf8" opacity="0.85" stroke="#0284c7" strokeWidth="0.8" />
        <ellipse cx="0" cy="-26" rx="6" ry="3" fill="#bae6fd" />
      </g>

      {/* Central High Bistro Discussion Table with Stools */}
      <g transform="translate(-50, 40)">
        <ellipse cx="0" cy="20" rx="20" ry="7.5" fill={palette.shadowAmbient} />
        <line x1="0" y1="20" x2="0" y2="4" stroke={palette.breakLounge.bistroStand} strokeWidth="2.8" />
        {/* Table top */}
        <ellipse cx="0" cy="4" rx="20" ry="10" fill={palette.breakLounge.bistroTop} stroke={palette.breakLounge.counterStroke} strokeWidth="1.2" />
        <ellipse cx="0" cy="3" rx="17" ry="8.5" fill={palette.breakLounge.counterLeft} />
        {/* Barstools */}
        <ellipse cx="-18" cy="14" rx="6" ry="3.2" fill={palette.chairCushionTop} />
        <line x1="-18" y1="14" x2="-18" y2="22" stroke={palette.chairFrame} strokeWidth="1.5" />
        <ellipse cx="18" cy="14" rx="6" ry="3.2" fill={palette.chairCushionTop} />
        <line x1="18" y1="14" x2="18" y2="22" stroke={palette.chairFrame} strokeWidth="1.5" />
      </g>

      {/* Modern 2.5D Lounge Sectional Sofa & Coffee Table (East Wing) */}
      <g transform="translate(60, 20)">
        {/* Ground contact shadow */}
        <ellipse cx="0" cy="26" rx="44" ry="14" fill={palette.shadowAmbient} />
        {/* Sofa Base */}
        <polygon points="-38,-8 0,-22 38,-8 0,8" fill={palette.breakLounge.sofaTop} stroke={palette.screenBezel} strokeWidth="1" />
        <polygon points="-38,-8 0,8 0,18 -38,4" fill={palette.breakLounge.sofaLeft} stroke={palette.screenBezel} strokeWidth="1" />
        <polygon points="0,8 38,-8 38,4 0,18" fill={palette.breakLounge.sofaBack} stroke={palette.screenBezel} strokeWidth="1" />
        {/* Plush Cushions */}
        <ellipse cx="-16" cy="-1" rx="14" ry="6.5" fill={palette.chairCushionTop} />
        <ellipse cx="16" cy="-1" rx="14" ry="6.5" fill={palette.chairCushionTop} />
        {/* Sofa Backrest Cushion */}
        <path d="M -36 -8 Q 0 -22 36 -8" fill="none" stroke={palette.chairFrame} strokeWidth="7" strokeLinecap="round" />

        {/* Low Modern Coffee Table */}
        <g transform="translate(0, 32)">
          <ellipse cx="0" cy="8" rx="22" ry="7" fill={palette.shadowAmbient} />
          <ellipse cx="0" cy="0" rx="20" ry="9" fill={isDark ? '#334155' : '#f8fafc'} stroke={palette.floorStroke} strokeWidth="0.8" />
          {/* Magazine / Tablet on table */}
          <polygon points="-6,-2 4,-5 8,1 -2,4" fill={isDark ? '#0284c7' : '#38bdf8'} opacity="0.8" />
        </g>
      </g>

      {/* Lush Indoor Greenery Plants (Ceramic Pots with Monsteras & Ficus) */}
      <g transform="translate(125, -40)">
        <ellipse cx="0" cy="14" rx="14" ry="6" fill={palette.shadowAmbient} />
        <polygon points="-8,-2 8,-2 6,10 -6,10" fill={palette.breakLounge.plantPot} stroke={palette.floorStroke} strokeWidth="0.8" />
        <ellipse cx="0" cy="-2" rx="8" ry="3" fill="#78350f" />
        <path
          d="M 0 -2 Q -10 -16 -16 -10 M 0 -2 Q -6 -24 2 -22 M 0 -2 Q 8 -20 16 -12 M 0 -2 Q 12 -8 14 -3"
          stroke={palette.breakLounge.plantFoliagePrimary}
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="-14" cy="-12" r="3.5" fill={palette.breakLounge.plantFoliageSecondary} opacity="0.95" />
        <circle cx="2" cy="-22" r="4.5" fill={palette.breakLounge.plantFoliagePrimary} opacity="0.95" />
        <circle cx="14" cy="-14" r="4" fill={palette.breakLounge.plantFoliageSecondary} opacity="0.95" />
      </g>

      <g transform="translate(120, 85)">
        <ellipse cx="0" cy="12" rx="12" ry="5" fill={palette.shadowAmbient} />
        <polygon points="-7,-1 7,-1 5,9 -5,9" fill={palette.breakLounge.plantPot} stroke={palette.floorStroke} strokeWidth="0.8" />
        <ellipse cx="0" cy="-1" rx="7" ry="2.5" fill="#78350f" />
        <path
          d="M 0 -1 Q -8 -14 -12 -8 M 0 -1 Q 0 -18 8 -16 M 0 -1 Q 8 -10 10 -4"
          stroke={palette.breakLounge.plantFoliagePrimary}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="-10" cy="-10" r="3" fill={palette.breakLounge.plantFoliageSecondary} opacity="0.95" />
        <circle cx="8" cy="-16" r="3.5" fill={palette.breakLounge.plantFoliagePrimary} opacity="0.95" />
      </g>
    </g>
  );
});
