import type { OfficeCameraPreset } from '../types'

/**
 * Camera Presets — Cinematic Zone Framing
 * Calibrated for premium architectural showcase feel.
 * Each preset frames its zone with a natural 3/4 elevated angle,
 * not a mathematically centered flat view.
 *
 * Office coordinate space:
 *   X: -15 (west/command) → +15 (east/server)
 *   Z: -11 (north/vault)  → +11 (south/open)
 *   Y: 0 = floor
 */
export const CAMERA_PRESETS: Record<string, OfficeCameraPreset> = {
  overview: {
    id: 'overview',
    label: 'Overview',
    // Lowered elevation & closer distance for realistic proportion on first-load
    position: [14, 18, 17],
    target: [1, 0.5, 0],
    fov: 42,
  },
  command: {
    id: 'command',
    label: 'Command',
    // Looking from right side across command desk toward wall display
    position: [-2, 11, 4],
    target: [-9, 1.4, -4],
    fov: 36,
  },
  dev: {
    id: 'dev',
    label: 'Dev Zone',
    // Looking diagonally from center toward dev bay
    position: [-2, 10, 10],
    target: [-7, 1.2, 4],
    fov: 38,
  },
  specialist: {
    id: 'specialist',
    label: 'Specialist',
    position: [4, 10, 10],
    target: [7, 1.2, 4],
    fov: 38,
  },
  approval: {
    id: 'approval',
    label: 'Approval',
    // Front-facing to approval pod from slightly west
    position: [-2, 8, 2],
    target: [0, 1.5, -4],
    fov: 34,
  },
  server: {
    id: 'server',
    label: 'Server Room',
    // Looking from center-north toward east server room
    position: [14, 9, -1],
    target: [9, 1.4, -4.5],
    fov: 35,
  },
  vault: {
    id: 'vault',
    label: 'Vault',
    // Looking north from center corridor
    position: [3, 9, -2],
    target: [0, 1.2, -8.5],
    fov: 34,
  },
}

export const DEFAULT_CAMERA_PRESET = CAMERA_PRESETS.overview

export function lookupCameraPreset(id?: string | null): OfficeCameraPreset {
  if (!id) return DEFAULT_CAMERA_PRESET
  return CAMERA_PRESETS[id] ?? DEFAULT_CAMERA_PRESET
}

export function calculateFitCamera(bounds = { minX: -14, maxX: 14, minZ: -10, maxZ: 10 }): {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
} {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2
  const spanX = Math.abs(bounds.maxX - bounds.minX)
  const spanZ = Math.abs(bounds.maxZ - bounds.minZ)
  const maxSpan = Math.max(spanX, spanZ)
  const elevation = Math.max(18, maxSpan * 0.85)
  const distance  = Math.max(20, maxSpan * 0.90)

  return {
    position: [centerX + distance * 0.65, elevation, centerZ + distance * 0.75],
    target: [centerX, 0, centerZ],
    fov: 40,
  }
}

export function clampZoomDistance(distance: number, minDistance = 6, maxDistance = 48): number {
  return Math.max(minDistance, Math.min(maxDistance, distance))
}


export function calculateFollowCamera(
  agentPos: [number, number, number],
  offset: [number, number, number] = [4.5, 5.5, 6]
): {
  position: [number, number, number]
  target: [number, number, number]
} {
  const [tx, ty, tz] = agentPos
  const [ox, oy, oz] = offset
  return {
    target: [tx, ty + 1.2, tz],
    position: [tx + ox, ty + oy, tz + oz],
  }
}

export function resolveExitFollowPreset(currentPresetId?: string | null): OfficeCameraPreset {
  if (currentPresetId && currentPresetId !== 'overview' && CAMERA_PRESETS[currentPresetId]) {
    return CAMERA_PRESETS[currentPresetId]
  }
  return DEFAULT_CAMERA_PRESET
}
