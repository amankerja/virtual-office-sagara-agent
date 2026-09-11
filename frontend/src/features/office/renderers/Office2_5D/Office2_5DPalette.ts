/**
 * Office2_5DPalette — Centralized 2.5D SVG Isometric Scene Color Tokens
 * Single source of truth for all 2.5D materials, isometric facet shading,
 * zone foundations, facility stations, and operational status semantics.
 *
 * Consistent 3-tone lighting logic:
 * - Top surface: Lightest tone (direct light from upper-left)
 * - Left/Front face: Mid tone (soft bounce light)
 * - Right/Rear face: Darkest tone (diffuse shadow)
 */

import type { OfficeZoneType } from '@/features/office/types/office'
import type { AgentStatus } from '@/types/agent'
import { ZONE_TIER } from '../../systems/office-depth-tokens'

export interface IsometricFacetColors {
  top: string
  left: string
  right: string
  stroke: string
}

export interface Zone2_5DConfig {
  accent: string
  floorFill: string
  floorStroke: string
  wallTop: string
  wallFace: string
  wallGlow: string
  glassFill: string
  glassStroke: string
  subtitleDefault: string
}

export type Office2_5DPalette = Office2_5DPaletteSet

export interface Office2_5DPaletteSet {
  // Global floor & architecture
  floorBase: string
  floorStroke: string
  floorGrid: string
  floorWalkway: string
  floorWalkwayLine: string
  slabFace: string
  slabDropShadow: string

  // Standard agent desk
  deskTop: string
  deskFaceLeft: string
  deskFaceRight: string
  deskStroke: string
  deskPad: string
  deskPadStroke: string
  deskLeg: string
  deskLegFoot: string

  // Command executive desk
  commandDeskTop: string
  commandDeskFaceLeft: string
  commandDeskFaceRight: string
  commandDeskStroke: string
  commandDeskPad: string
  commandDeskTrim: string

  // Temporary worker desk
  tempDeskTop: string
  tempDeskFaceLeft: string
  tempDeskFaceRight: string
  tempDeskStroke: string
  laptopBase: string
  laptopScreenBg: string

  // Ergonomic chair
  chairCushionTop: string
  chairCushionFace: string
  chairFrame: string
  chairWheelBase: string
  chairWheel: string

  // Screens & hardware
  screenBezel: string
  screenBezelStroke: string
  screenOff: string
  screenActive: string
  screenApproval: string
  screenError: string
  screenDegraded: string
  screenOffline: string
  screenHighlight: string
  keyboardBase: string
  keyboardKeys: string
  mousePad: string
  mouse: string

  // Facility Stations
  approvalPod: {
    hazardBase: string
    hazardStripe: string
    deskTop: string
    deskLeft: string
    deskRight: string
    deskStroke: string
    beaconFrame: string
    beaconRed: string
    beaconAmber: string
    beaconGreen: string
  }

  runtimeRoom: {
    plinthTop: string
    plinthLeft: string
    plinthRight: string
    plinthStroke: string
    rackTop: string
    rackLeft: string
    rackFront: string
    rackStroke: string
    bladeSeam: string
    ledGreen: string
    ledAmber: string
    ledBlue: string
    ledRed: string
    consoleTop: string
    consoleLeft: string
    consoleRight: string
  }

  artifactVault: {
    plinthTop: string
    plinthLeft: string
    plinthRight: string
    plinthStroke: string
    shelfTop: string
    shelfLeft: string
    shelfFront: string
    shelfStroke: string
    shelfDivider: string
    boxBlue: string
    boxGreen: string
    boxYellow: string
    boxRed: string
    boxNeutral: string
  }

  collaborationZone: {
    matTop: string
    matStroke: string
    tableTop: string
    tableLeft: string
    tableRight: string
    tableStroke: string
    pedestal: string
    speakerphone: string
  }

  breakLounge: {
    rugFill: string
    rugStroke: string
    counterTop: string
    counterLeft: string
    counterRight: string
    counterStroke: string
    espressoMachine: string
    waterCooler: string
    bistroTop: string
    bistroStand: string
    sofaTop: string
    sofaLeft: string
    sofaBack: string
    plantPot: string
    plantFoliagePrimary: string
    plantFoliageSecondary: string
  }

  // Lighting & material effects
  shadowAmbient: string
  shadowContact: string
  shadowDeep: string
  specularHighlight: string
  glassSpecular: string

  // Brand accents
  brandPrimary: string
  brandSecondary: string
  brandGlow: string
}

const DARK: Office2_5DPaletteSet = {
  // Architectural Floor — Warm slate graphite, not sterile cold blue
  floorBase: '#1a1f26',
  floorStroke: '#2d3748',
  floorGrid: '#334155',
  floorWalkway: '#222832',
  floorWalkwayLine: '#475569',
  slabFace: '#12161c',
  slabDropShadow: '#080b0f',

  // Standard Agent Desk — Modern slate composite with warm undertones
  deskTop: '#2b3340',
  deskFaceLeft: '#202732',
  deskFaceRight: '#161c24',
  deskStroke: '#3e4a5d',
  deskPad: '#1c222c',
  deskPadStroke: '#334155',
  deskLeg: '#4a5568',
  deskLegFoot: '#11151c',

  // Command Executive Desk — Rich smoked walnut tech finish
  commandDeskTop: '#423326',
  commandDeskFaceLeft: '#31251b',
  commandDeskFaceRight: '#221912',
  commandDeskStroke: '#5c4838',
  commandDeskPad: '#1c222c',
  commandDeskTrim: '#2563eb',

  // Temporary Worker Desk
  tempDeskTop: '#28313e',
  tempDeskFaceLeft: '#1d242e',
  tempDeskFaceRight: '#141920',
  tempDeskStroke: '#3c485a',
  laptopBase: '#334155',
  laptopScreenBg: '#090d14',

  // Ergonomic Chair
  chairCushionTop: '#374151',
  chairCushionFace: '#1f2937',
  chairFrame: '#111827',
  chairWheelBase: '#4b5563',
  chairWheel: '#090d14',

  // Screens & Hardware
  screenBezel: '#0b0f17',
  screenBezelStroke: '#1e293b',
  screenOff: '#070b10',
  screenActive: '#033a2e',
  screenApproval: '#542602',
  screenError: '#5c1010',
  screenDegraded: '#5c2805',
  screenOffline: '#1a2332',
  screenHighlight: 'rgba(255, 255, 255, 0.12)',
  keyboardBase: '#334155',
  keyboardKeys: '#94a3b8',
  mousePad: '#1e293b',
  mouse: '#475569',

  // Approval Pod
  approvalPod: {
    hazardBase: '#232932',
    hazardStripe: '#d97706',
    deskTop: '#2d3542',
    deskLeft: '#222933',
    deskRight: '#171c24',
    deskStroke: '#445166',
    beaconFrame: '#1e2530',
    beaconRed: '#dc2626',
    beaconAmber: '#d97706',
    beaconGreen: '#059669',
  },

  // Runtime Room
  runtimeRoom: {
    plinthTop: '#1f252f',
    plinthLeft: '#161a22',
    plinthRight: '#0e1116',
    plinthStroke: '#333f52',
    rackTop: '#343f4f',
    rackLeft: '#242c38',
    rackFront: '#0d1117',
    rackStroke: '#1f2631',
    bladeSeam: '#1e293b',
    ledGreen: '#10b981',
    ledAmber: '#f59e0b',
    ledBlue: '#38bdf8',
    ledRed: '#ef4444',
    consoleTop: '#28313e',
    consoleLeft: '#1d242e',
    consoleRight: '#141920',
  },

  // Artifact Vault
  artifactVault: {
    plinthTop: '#222731',
    plinthLeft: '#181c24',
    plinthRight: '#0f1217',
    plinthStroke: '#363f4f',
    shelfTop: '#394354',
    shelfLeft: '#2a323f',
    shelfFront: '#1c222b',
    shelfStroke: '#4b576d',
    shelfDivider: '#242c38',
    boxBlue: '#2563eb',
    boxGreen: '#059669',
    boxYellow: '#d97706',
    boxRed: '#dc2626',
    boxNeutral: '#64748b',
  },

  // Collaboration Zone
  collaborationZone: {
    matTop: '#202630',
    matStroke: '#344052',
    tableTop: '#313a48',
    tableLeft: '#242c38',
    tableRight: '#181e26',
    tableStroke: '#4a576d',
    pedestal: '#1f2733',
    speakerphone: '#0d121a',
  },

  // Break / Refreshment Lounge
  breakLounge: {
    rugFill: '#2a221b',
    rugStroke: '#453527',
    counterTop: '#333c4a',
    counterLeft: '#252d38',
    counterRight: '#191f27',
    counterStroke: '#4c596d',
    espressoMachine: '#475569',
    waterCooler: '#1e293b',
    bistroTop: '#2e3745',
    bistroStand: '#475569',
    sofaTop: '#334155',
    sofaLeft: '#242f3e',
    sofaBack: '#1e293b',
    plantPot: '#334155',
    plantFoliagePrimary: '#15803d',
    plantFoliageSecondary: '#16a34a',
  },

  // Lighting & Material Effects
  shadowAmbient: 'rgba(5, 8, 14, 0.22)',
  shadowContact: 'rgba(5, 8, 14, 0.38)',
  shadowDeep: 'rgba(2, 4, 8, 0.55)',
  specularHighlight: 'rgba(255, 255, 255, 0.14)',
  glassSpecular: 'rgba(255, 255, 255, 0.22)',

  // Brand Accents
  brandPrimary: '#38bdf8',
  brandSecondary: '#475569',
  brandGlow: 'rgba(56, 189, 248, 0.18)',
}

const LIGHT: Office2_5DPaletteSet = {
  // Architectural Floor — Warm architectural ivory/bone, not blinding flat white
  floorBase: '#f4f3ef',
  floorStroke: '#dedbd4',
  floorGrid: '#e2dfd7',
  floorWalkway: '#ebe8e1',
  floorWalkwayLine: '#cbd5e1',
  slabFace: '#d5d2ca',
  slabDropShadow: '#8f97a3',

  // Standard Agent Desk — Scandinavian birch / soft neutral laminate
  deskTop: '#fbfaf8',
  deskFaceLeft: '#ece8e0',
  deskFaceRight: '#ded9d0',
  deskStroke: '#cfc9be',
  deskPad: '#e8e5dc',
  deskPadStroke: '#cbd5e1',
  deskLeg: '#788292',
  deskLegFoot: '#334155',

  // Command Executive Desk — Natural warm oak finish
  commandDeskTop: '#ebd9c3',
  commandDeskFaceLeft: '#dbc3a7',
  commandDeskFaceRight: '#cbb090',
  commandDeskStroke: '#bca07e',
  commandDeskPad: '#334155',
  commandDeskTrim: '#2563eb',

  // Temporary Worker Desk
  tempDeskTop: '#f7f6f2',
  tempDeskFaceLeft: '#e8e5dc',
  tempDeskFaceRight: '#dcd8ce',
  tempDeskStroke: '#cac4b8',
  laptopBase: '#64748b',
  laptopScreenBg: '#1e293b',

  // Ergonomic Chair
  chairCushionTop: '#cbd5e1',
  chairCushionFace: '#94a3b8',
  chairFrame: '#475569',
  chairWheelBase: '#64748b',
  chairWheel: '#1e293b',

  // Screens & Hardware
  screenBezel: '#1e293b',
  screenBezelStroke: '#475569',
  screenOff: '#0f172a',
  screenActive: '#065f46',
  screenApproval: '#92400e',
  screenError: '#991b1b',
  screenDegraded: '#9a3412',
  screenOffline: '#334155',
  screenHighlight: 'rgba(255, 255, 255, 0.28)',
  keyboardBase: '#cbd5e1',
  keyboardKeys: '#475569',
  mousePad: '#e2e8f0',
  mouse: '#64748b',

  // Approval Pod
  approvalPod: {
    hazardBase: '#eeebe3',
    hazardStripe: '#b45309',
    deskTop: '#faf8f3',
    deskLeft: '#ebe6dc',
    deskRight: '#ded7cb',
    deskStroke: '#cfc6b8',
    beaconFrame: '#475569',
    beaconRed: '#ef4444',
    beaconAmber: '#f59e0b',
    beaconGreen: '#10b981',
  },

  // Runtime Room
  runtimeRoom: {
    plinthTop: '#ebe7de',
    plinthLeft: '#ddd7cd',
    plinthRight: '#cec7ba',
    plinthStroke: '#bcb4a6',
    rackTop: '#64748b',
    rackLeft: '#475569',
    rackFront: '#1e293b',
    rackStroke: '#334155',
    bladeSeam: '#334155',
    ledGreen: '#16a34a',
    ledAmber: '#d97706',
    ledBlue: '#0284c7',
    ledRed: '#dc2626',
    consoleTop: '#faf8f3',
    consoleLeft: '#ebe6dc',
    consoleRight: '#ded7cb',
  },

  // Artifact Vault
  artifactVault: {
    plinthTop: '#ebe7de',
    plinthLeft: '#ddd7cd',
    plinthRight: '#cec7ba',
    plinthStroke: '#bcb4a6',
    shelfTop: '#94a3b8',
    shelfLeft: '#64748b',
    shelfFront: '#475569',
    shelfStroke: '#334155',
    shelfDivider: '#334155',
    boxBlue: '#3b82f6',
    boxGreen: '#10b981',
    boxYellow: '#f59e0b',
    boxRed: '#ef4444',
    boxNeutral: '#94a3b8',
  },

  // Collaboration Zone
  collaborationZone: {
    matTop: '#eae5dc',
    matStroke: '#d5ccbe',
    tableTop: '#f6f4ee',
    tableLeft: '#e8e2d4',
    tableRight: '#ded5c5',
    tableStroke: '#c9bfae',
    pedestal: '#64748b',
    speakerphone: '#334155',
  },

  // Break / Refreshment Lounge
  breakLounge: {
    rugFill: '#efe9e1',
    rugStroke: '#d6c8b8',
    counterTop: '#f8fafc',
    counterLeft: '#e2e8f0',
    counterRight: '#cbd5e1',
    counterStroke: '#94a3b8',
    espressoMachine: '#64748b',
    waterCooler: '#e2e8f0',
    bistroTop: '#ffffff',
    bistroStand: '#64748b',
    sofaTop: '#94a3b8',
    sofaLeft: '#64748b',
    sofaBack: '#475569',
    plantPot: '#f8fafc',
    plantFoliagePrimary: '#16a34a',
    plantFoliageSecondary: '#22c55e',
  },

  // Lighting & Material Effects
  shadowAmbient: 'rgba(15, 23, 42, 0.10)',
  shadowContact: 'rgba(15, 23, 42, 0.18)',
  shadowDeep: 'rgba(15, 23, 42, 0.28)',
  specularHighlight: 'rgba(255, 255, 255, 0.35)',
  glassSpecular: 'rgba(255, 255, 255, 0.45)',

  // Brand Accents
  brandPrimary: '#1d4ed8',
  brandSecondary: '#64748b',
  brandGlow: 'rgba(37, 99, 235, 0.12)',
}

export function getOffice2_5DPalette(isDark: boolean): Office2_5DPaletteSet {
  return isDark ? DARK : LIGHT
}

export function getZone2_5DConfig(type: OfficeZoneType, isDark: boolean): Zone2_5DConfig {
  const tier = ZONE_TIER[type];

  // Base wall colors
  const tier1WallTop = isDark ? '#475569' : '#e2e8f0'; // Brighter/lighter
  const tier1WallFace = isDark ? '#334155' : '#cbd5e1'; // More contrasting
  const tier2WallTop = isDark ? '#1e293b' : '#cbd5e1'; // Current neutral
  const tier2WallFace = isDark ? '#0f172a' : '#94a3b8'; // Current neutral
  const tier3WallTop = isDark ? '#1a1f26' : '#f0f0f0'; // Subdued/darker
  const tier3WallFace = isDark ? '#080b0f' : '#e0e0e0'; // Subdued/darker

  let currentWallTop = tier2WallTop;
  let currentWallFace = tier2WallFace;
  let floorFillBaseAlpha = 0.25; // Default alpha for floor
  let glassFillBaseAlpha = 0.10; // Default alpha for glass

  if (tier === 1) {
    currentWallTop = tier1WallTop;
    currentWallFace = tier1WallFace;
    floorFillBaseAlpha = 0.45; // Higher alpha for Tier 1
    glassFillBaseAlpha = 0.15; // Higher alpha for Tier 1
  } else if (tier === 3) {
    currentWallTop = tier3WallTop;
    currentWallFace = tier3WallFace;
    floorFillBaseAlpha = 0.15; // Lower alpha for Tier 3
    glassFillBaseAlpha = 0.05; // Lower alpha for Tier 3
  }

  const configs: Record<OfficeZoneType, Zone2_5DConfig> = {
    COMMAND: {
      accent: isDark ? '#3b82f6' : '#2563eb',
      floorFill: isDark ? `rgba(30, 41, 59, ${floorFillBaseAlpha})` : `rgba(226, 232, 240, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#334155' : '#cbd5e1',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#2563eb',
      glassFill: isDark ? `rgba(56, 189, 248, ${glassFillBaseAlpha})` : `rgba(56, 189, 248, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(56, 189, 248, 0.30)' : 'rgba(37, 99, 235, 0.30)',
      subtitleDefault: 'Strategy & Coordination',
    },
    DEV_ZONE: {
      accent: isDark ? '#06b6d4' : '#0891b2',
      floorFill: isDark ? `rgba(8, 47, 73, ${floorFillBaseAlpha})` : `rgba(207, 250, 254, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#164e63' : '#a5f3fc',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#06b6d4',
      glassFill: isDark ? `rgba(6, 182, 212, ${glassFillBaseAlpha})` : `rgba(6, 182, 212, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(6, 182, 212, 0.30)' : 'rgba(8, 145, 178, 0.35)',
      subtitleDefault: 'Build & Automate',
    },
    CAREER_ZONE: {
      accent: isDark ? '#8b5cf6' : '#7c3aed',
      floorFill: isDark ? `rgba(59, 7, 100, ${floorFillBaseAlpha})` : `rgba(243, 232, 255, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#4c1d95' : '#ddd6fe',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#8b5cf6',
      glassFill: isDark ? `rgba(139, 92, 246, ${glassFillBaseAlpha})` : `rgba(139, 92, 246, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(139, 92, 246, 0.30)' : 'rgba(124, 58, 237, 0.35)',
      subtitleDefault: 'People & Growth',
    },
    MARKETING_ZONE: {
      accent: isDark ? '#ec4899' : '#db2777',
      floorFill: isDark ? `rgba(80, 7, 36, ${floorFillBaseAlpha})` : `rgba(252, 231, 243, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#831843' : '#fbcfe8',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#ec4899',
      glassFill: isDark ? `rgba(236, 72, 153, ${glassFillBaseAlpha})` : `rgba(236, 72, 153, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(236, 72, 153, 0.30)' : 'rgba(219, 39, 119, 0.35)',
      subtitleDefault: 'Brand & Communication',
    },
    COLLABORATION: {
      accent: isDark ? '#38bdf8' : '#0284c7',
      floorFill: isDark ? `rgba(12, 74, 110, ${floorFillBaseAlpha})` : `rgba(224, 242, 254, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#0369a1' : '#bae6fd',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#38bdf8',
      glassFill: isDark ? `rgba(56, 189, 248, ${glassFillBaseAlpha})` : `rgba(2, 132, 199, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(56, 189, 248, 0.30)' : 'rgba(2, 132, 199, 0.35)',
      subtitleDefault: 'Mission Control',
    },
    APPROVAL: {
      accent: isDark ? '#f59e0b' : '#d97706',
      floorFill: isDark ? `rgba(69, 26, 3, ${floorFillBaseAlpha})` : `rgba(254, 243, 199, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#78350f' : '#fde68a',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#f59e0b',
      glassFill: isDark ? `rgba(245, 158, 11, ${glassFillBaseAlpha})` : `rgba(217, 119, 6, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(245, 158, 11, 0.30)' : 'rgba(217, 119, 6, 0.35)',
      subtitleDefault: 'Review & Decision',
    },
    RUNTIME: {
      accent: isDark ? '#38bdf8' : '#0284c7',
      floorFill: isDark ? `rgba(8, 47, 73, ${floorFillBaseAlpha})` : `rgba(224, 242, 254, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#0c4a6e' : '#bae6fd',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#38bdf8',
      glassFill: isDark ? `rgba(56, 189, 248, ${glassFillBaseAlpha})` : `rgba(2, 132, 199, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(56, 189, 248, 0.30)' : 'rgba(2, 132, 199, 0.35)',
      subtitleDefault: 'Infrastructure',
    },
    VAULT: {
      accent: isDark ? '#6366f1' : '#4f46e5',
      floorFill: isDark ? `rgba(49, 46, 129, ${floorFillBaseAlpha})` : `rgba(238, 242, 255, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#3730a3' : '#c7d2fe',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#6366f1',
      glassFill: isDark ? `rgba(99, 102, 241, ${glassFillBaseAlpha})` : `rgba(79, 70, 229, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(99, 102, 241, 0.30)' : 'rgba(79, 70, 229, 0.35)',
      subtitleDefault: 'Knowledge & Assets',
    },
    SPECIALIST: {
      accent: isDark ? '#10b981' : '#059669',
      floorFill: isDark ? `rgba(6, 78, 59, ${floorFillBaseAlpha})` : `rgba(209, 250, 229, ${floorFillBaseAlpha})`,
      floorStroke: isDark ? '#065f46' : '#a7f3d0',
      wallTop: currentWallTop,
      wallFace: currentWallFace,
      wallGlow: '#10b981',
      glassFill: isDark ? `rgba(16, 185, 129, ${glassFillBaseAlpha})` : `rgba(5, 150, 105, ${glassFillBaseAlpha})`,
      glassStroke: isDark ? 'rgba(16, 185, 129, 0.30)' : 'rgba(5, 150, 105, 0.35)',
      subtitleDefault: 'Operations Bay',
    },
  }
  return configs[type] || configs.DEV_ZONE
}

export function getAgentStatusVisual(status: AgentStatus, isDark: boolean) {
  switch (status) {
    case 'ACTIVE':
      return {
        screenFill: isDark ? '#033a2e' : '#065f46',
        screenStroke: isDark ? '#059669' : '#10b981',
        badgeBg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.20)',
        badgeText: isDark ? '#34d399' : '#059669',
        indicator: '#10b981',
        label: 'ACTIVE',
      }
    case 'AWAITING_APPROVAL':
      return {
        screenFill: isDark ? '#542602' : '#92400e',
        screenStroke: isDark ? '#d97706' : '#f59e0b',
        badgeBg: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.22)',
        badgeText: isDark ? '#fbbf24' : '#b45309',
        indicator: '#f59e0b',
        label: 'AWAITING APPROVAL',
      }
    case 'ERROR':
      return {
        screenFill: isDark ? '#5c1010' : '#991b1b',
        screenStroke: isDark ? '#dc2626' : '#ef4444',
        badgeBg: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.22)',
        badgeText: isDark ? '#f87171' : '#b91c1c',
        indicator: '#ef4444',
        label: 'ERROR',
      }
    case 'DEGRADED':
      return {
        screenFill: isDark ? '#5c2805' : '#9a3412',
        screenStroke: isDark ? '#ea580c' : '#f97316',
        badgeBg: isDark ? 'rgba(249, 115, 22, 0.18)' : 'rgba(249, 115, 22, 0.22)',
        badgeText: isDark ? '#fb923c' : '#c2410c',
        indicator: '#f97316',
        label: 'DEGRADED',
      }
    case 'OFFLINE':
      return {
        screenFill: isDark ? '#18202c' : '#334155',
        screenStroke: isDark ? '#334155' : '#64748b',
        badgeBg: isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.18)',
        badgeText: isDark ? '#94a3b8' : '#475569',
        indicator: '#64748b',
        label: 'OFFLINE',
      }
    case 'CONFIGURATION_INCOMPLETE':
      return {
        screenFill: isDark ? '#27272a' : '#52525b',
        screenStroke: isDark ? '#52525b' : '#71717a',
        badgeBg: isDark ? 'rgba(113, 113, 122, 0.15)' : 'rgba(113, 113, 122, 0.18)',
        badgeText: isDark ? '#a1a1aa' : '#52525b',
        indicator: '#71717a',
        label: 'CONFIG',
      }
    case 'IDLE':
    case 'RECENTLY_ACTIVE':
    default:
      return {
        screenFill: isDark ? '#0f172a' : '#1e293b',
        screenStroke: isDark ? '#1e293b' : '#475569',
        badgeBg: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.15)',
        badgeText: isDark ? '#60a5fa' : '#2563eb',
        indicator: '#3b82f6',
        label: status === 'RECENTLY_ACTIVE' ? 'RECENT' : 'IDLE',
      }
  }
}
