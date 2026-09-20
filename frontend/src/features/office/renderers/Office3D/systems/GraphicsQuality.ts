import type { GraphicsQuality, OfficeRenderMode } from '../types'

export const RENDER_MODE_STORAGE_KEY = 'sagara-office-render-mode'
export const GRAPHICS_QUALITY_STORAGE_KEY = 'sagara-office-graphics-quality'

export interface QualityConfig {
  dpr: number | [number, number]
  shadows: boolean
  antialias: boolean
  maxLights: number
  showDecorations: boolean
  detailLevel: 'low' | 'balanced' | 'ultra'
  contactShadows: boolean
  postProcessing: boolean
}

export function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return Boolean(gl && gl instanceof WebGLRenderingContext || (window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext))
  } catch {
    return false
  }
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= 768 && window.innerWidth < 1024
}

export function getDefaultRenderMode(): OfficeRenderMode {
  if (!detectWebGLSupport()) return '2.5d'
  if (isMobileDevice() || isTabletDevice()) return '2.5d'
  return '3d'
}

export function getSavedRenderMode(): OfficeRenderMode {
  if (typeof window === 'undefined') return '2.5d'
  const saved = localStorage.getItem(RENDER_MODE_STORAGE_KEY)
  if (saved === '3d' || saved === '2.5d' || saved === 'list') {
    // If user saved 3d but WebGL is unsupported, fall back
    if (saved === '3d' && !detectWebGLSupport()) return '2.5d'
    return saved
  }
  return getDefaultRenderMode()
}

export function saveRenderMode(mode: OfficeRenderMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RENDER_MODE_STORAGE_KEY, mode)
}

export function getSavedGraphicsQuality(): GraphicsQuality {
  if (typeof window === 'undefined') return 'balanced'
  const saved = localStorage.getItem(GRAPHICS_QUALITY_STORAGE_KEY)
  if (saved === 'low' || saved === 'balanced' || saved === 'ultra') {
    return saved
  }
  return 'balanced'
}

export function saveGraphicsQuality(quality: GraphicsQuality): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GRAPHICS_QUALITY_STORAGE_KEY, quality)
}

export function getQualityConfig(quality: GraphicsQuality): QualityConfig {
  switch (quality) {
    case 'low':
      return {
        dpr: 1,
        shadows: false,
        antialias: false,
        maxLights: 2,
        showDecorations: false,
        detailLevel: 'low',
        contactShadows: false,
        postProcessing: false,
      }
    case 'ultra':
      return {
        dpr: [1, 2],
        shadows: true,
        antialias: true,
        maxLights: 6,
        showDecorations: true,
        detailLevel: 'ultra',
        contactShadows: true,
        postProcessing: true,
      }
    case 'balanced':
    default:
      return {
        dpr: [1, 1.5],
        shadows: true,
        antialias: true,
        maxLights: 4,
        showDecorations: true,
        detailLevel: 'balanced',
        contactShadows: true,
        postProcessing: true,
      }
  }
}

export function downgradeQuality(quality: GraphicsQuality): GraphicsQuality {
  return quality === 'ultra' ? 'balanced' : 'low'
}

export function resolveRuntimeQuality(requested: GraphicsQuality, ceiling: GraphicsQuality, compact: boolean): GraphicsQuality {
  const order: GraphicsQuality[] = ['low', 'balanced', 'ultra']
  return order[Math.min(order.indexOf(requested), order.indexOf(ceiling), compact ? 1 : 2)]
}
