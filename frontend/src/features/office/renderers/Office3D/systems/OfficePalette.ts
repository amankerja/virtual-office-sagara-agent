/**
 * OfficePalette — Centralized 3D Scene Color Tokens
 * Single source of truth for all 3D material colors.
 * Referenced by lighting, environment, furniture, and zone components.
 * DO NOT scatter hex values through individual components.
 */

export interface OfficePaletteSet {
  officeBackground: string
  officeFloor: string
  officeFloorCorridor: string
  officeWall: string
  officeGlass: string
  officeEdgeTrim: string
  officeSlab: string
  officeDeskTop: string
  officeDeskTopCommand: string
  officeDeskLeg: string
  officeChairCushion: string
  officeChairFrame: string
  officeMetal: string
  officeBezel: string
  officeScreenIdle: string
  officeScreenActive: string
  officeScreenApproval: string
  officeScreenError: string
  officeServerCabinet: string
  officeServerFace: string
  officeServerLedHealthy: string
  officeServerLedWarning: string
  officeServerLedNetwork: string
  officeServerFloor: string
  officeAccentBlue: string
  officeAccentCyan: string
  officeAccentAmber: string
  officeAccentGreen: string
  officeAccentRed: string
  officeAccentPurple: string
  officeAccentPink: string
  officeAgentSuit: string
  officeAgentSkin: string
  officeAmbientColor: string
  officeFogColor: string
  officeApprovalBase: string
  officeApprovalConsole: string
  officeVaultPedestal: string
  officeVaultPedestalDark: string
  officeBrandPrimary: string
  officeBrandSecondary: string
}

const DARK: OfficePaletteSet = {
  officeBackground:       '#12151c',
  officeFloor:            '#8b5e3c',
  officeFloorCorridor:    '#6d482f',
  officeWall:             '#5c5a52',
  officeGlass:            '#e0f2fe',
  officeEdgeTrim:         '#2563eb',
  officeSlab:             '#252826',
  officeDeskTop:          '#92795d',
  officeDeskTopCommand:   '#70543e',
  officeDeskLeg:          '#494944',
  officeChairCushion:     '#55524e',
  officeChairFrame:       '#292c2b',
  officeMetal:            '#92958f',
  officeBezel:            '#202523',
  officeScreenIdle:       '#0b1827',
  officeScreenActive:     '#023e6b',
  officeScreenApproval:   '#6b3200',
  officeScreenError:      '#5c1010',
  officeServerCabinet:    '#323a37',
  officeServerFace:       '#454f49',
  officeServerLedHealthy: '#10b981',
  officeServerLedWarning: '#f59e0b',
  officeServerLedNetwork: '#38bdf8',
  officeServerFloor:      '#383e3b',
  officeAccentBlue:       '#2563eb',
  officeAccentCyan:       '#0ea5e9',
  officeAccentAmber:      '#d97706',
  officeAccentGreen:      '#059669',
  officeAccentRed:        '#dc2626',
  officeAccentPurple:     '#7c3aed',
  officeAccentPink:       '#ec4899',
  officeAgentSuit:        '#1a2d42',
  officeAgentSkin:        '#d4a87a',
  officeAmbientColor:     '#c9c7ba',
  officeFogColor:         '#171b20',
  officeApprovalBase:     '#4b4a43',
  officeApprovalConsole:  '#5c6057',
  officeVaultPedestal:    '#626159',
  officeVaultPedestalDark:'#3b403b',
  officeBrandPrimary:     '#38bdf8',
  officeBrandSecondary:   '#475569',
}

const LIGHT: OfficePaletteSet = {
  officeBackground:       '#dddcd7',
  officeFloor:            '#e3e0d8',
  officeFloorCorridor:    '#d0cec6',
  officeWall:             '#c9c6bc',
  officeGlass:            '#c5ddda',
  officeEdgeTrim:         '#2563eb',
  officeSlab:             '#b5b3ab',
  officeDeskTop:          '#c6aa83',
  officeDeskTopCommand:   '#b89368',
  officeDeskLeg:          '#73756f',
  officeChairCushion:     '#77736b',
  officeChairFrame:       '#454b49',
  officeMetal:            '#a4aaa5',
  officeBezel:            '#343b37',
  officeScreenIdle:       '#1e3558',
  officeScreenActive:     '#1d4ed8',
  officeScreenApproval:   '#b45309',
  officeScreenError:      '#991b1b',
  officeServerCabinet:    '#4c5651',
  officeServerFace:       '#69746b',
  officeServerLedHealthy: '#16a34a',
  officeServerLedWarning: '#d97706',
  officeServerLedNetwork: '#0284c7',
  officeServerFloor:      '#b3b8af',
  officeAccentBlue:       '#2563eb',
  officeAccentCyan:       '#0284c7',
  officeAccentAmber:      '#b45309',
  officeAccentGreen:      '#15803d',
  officeAccentRed:        '#b91c1c',
  officeAccentPurple:     '#6d28d9',
  officeAccentPink:       '#db2777',
  officeAgentSuit:        '#334155',
  officeAgentSkin:        '#c9a87a',
  officeAmbientColor:     '#e9e5d9',
  officeFogColor:         '#dddcd7',
  officeApprovalBase:     '#c7c5b9',
  officeApprovalConsole:  '#a9b0a1',
  officeVaultPedestal:    '#bab9ad',
  officeVaultPedestalDark:'#8d978b',
  officeBrandPrimary:     '#1d4ed8',
  officeBrandSecondary:   '#64748b',
}

export function getOfficePalette(isDark: boolean): OfficePaletteSet {
  return isDark ? DARK : LIGHT
}

// Existing small screen, foliage and status details; all fixed hues stay centralized.
export const OFFICE_DETAIL_COLORS = {
  brandBlue: '#2563eb',
  navyBase: '#0f172a',
  white: '#ffffff',
  screenOff: '#060a14',
  black: '#000000',
  slateFrame: '#334155',
  soil: '#1c1917',
  foliage: '#15803d',
  foliageLight: '#16a34a',
  statusBlue: '#60a5fa',
  approvalScreenDark: '#0c1a30',
  approvalScreenLight: '#1a3560',
  consoleBezel: '#040a14',
  textMuted: '#64748b',
  textDim: '#475569',
  textLight: '#e2e8f0',
  textDark: '#1e293b',
  vaultScreenDark: '#08101e',
  vaultScreenLight: '#1a2d50',
  vaultLabelDark: '#a5b4fc',
  vaultLabelLight: '#6d28d9',
  commandScreenDark: '#0b1827',
  commandScreenLight: '#1e3a5f',
  textSecondary: '#94a3b8',
  commandBezel: '#040a12',
  commandHeaderDark: '#0e2244',
  commandHeaderLight: '#1a3a7a',
  brandCyan: '#38bdf8',
  brandBlueLight: '#1d4ed8',
  statusGreen: '#10b981',
  serverSeamDark: '#1a3050',
  serverSeamLight: '#8da8c0',
  serverBezel: '#030810',
  serverScreenDark: '#051020',
  serverScreenLight: '#0a2040',
  serverLabelDark: '#67e8f9',
  serverLabelLight: '#0284c7',
  signDark: '#0d1e35',
  signLight: '#c8d5e8',
  rolePink: '#ec4899',
  offlineSuit: '#2a3a50',
  taskPanel: '#060e1c',
} as const
