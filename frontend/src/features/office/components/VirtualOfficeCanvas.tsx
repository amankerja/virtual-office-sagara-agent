import React from 'react'
import type { OfficeSceneProjection } from '@/features/office/types/office'
import { OfficeViewport } from './OfficeViewport'

export interface VirtualOfficeCanvasProps {
  fitRevision?: number
  scene: OfficeSceneProjection
  focusedAgentId?: string | null
  hoveredAgentId?: string | null
  zoom: number
  onZoomChange: (zoom: number) => void
  onSelectAgent: (agentId: string) => void
  onHoverAgent?: (agentId: string | null) => void
}

/**
 * VirtualOfficeCanvas:
 * The primary 2.5D Isometric Office Canvas component (Prompt 06 Section 5).
 * Occupies the main page workspace with responsive pan, zoom, and spatial workstation telemetry.
 */
export const VirtualOfficeCanvas: React.FC<VirtualOfficeCanvasProps> = (props) => {
  return <OfficeViewport {...props} />
}
