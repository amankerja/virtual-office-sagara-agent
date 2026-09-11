import type { OfficeSceneProjection } from '../../types/office'

export type OfficeRenderMode = '3d' | '2.5d' | 'list'

export type GraphicsQuality = 'low' | 'balanced' | 'ultra'

export interface OfficeCameraPreset {
  id: string
  label: string
  position: [number, number, number]
  target: [number, number, number]
  fov?: number
}

export interface ImmersiveOffice3DProps {
  scene: OfficeSceneProjection
  focusedAgentId?: string | null
  hoveredAgentId?: string | null
  quality?: GraphicsQuality
  onSelectAgent: (id: string) => void
  onHoverAgent?: (id: string | null) => void
  onSelectTask?: (id: string) => void
  onSelectDelegation?: (id: string) => void
  onSelectApprovalPod?: () => void
  onSelectServerRoom?: () => void
  onSelectVault?: () => void
  isDark?: boolean
}
