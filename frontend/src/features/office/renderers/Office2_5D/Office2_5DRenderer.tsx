import React from 'react'
import { VirtualOfficeCanvas } from '../../components/VirtualOfficeCanvas'
import type { OfficeSceneProjection } from '../../types/office'

interface Office2_5DRendererProps {
  scene: OfficeSceneProjection
  focusedAgentId?: string | null
  hoveredAgentId?: string | null
  zoom: number
  fitRevision: number
  onZoomChange: (zoom: number) => void
  onSelectAgent: (id: string) => void
  onHoverAgent?: (id: string | null) => void
}

export const Office2_5DRenderer: React.FC<Office2_5DRendererProps> = (props) => {
  return <VirtualOfficeCanvas {...props} />
}
