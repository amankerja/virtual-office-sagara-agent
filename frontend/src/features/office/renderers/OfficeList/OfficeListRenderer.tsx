import React from 'react'
import { OfficeListView } from '../../components/OfficeListView'
import type { OfficeSceneProjection } from '../../types/office'

interface OfficeListRendererProps {
  scene: OfficeSceneProjection
  onSelectAgent: (id: string) => void
}

export const OfficeListRenderer: React.FC<OfficeListRendererProps> = (props) => {
  return <OfficeListView {...props} />
}
