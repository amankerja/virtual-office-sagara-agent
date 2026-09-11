import { useOfficeQuality } from '../systems/OfficeQualityContext'
import { getOfficePalette } from '../systems/OfficePalette'
import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
import React from 'react'

interface Plant3DProps {
  position: [number, number, number]
  scale?: number
  isDark?: boolean
}

export const Plant3D: React.FC<Plant3DProps> = ({ position, scale = 1, isDark = true }) => {
  const quality = useOfficeQuality()
  const p = getOfficePalette(isDark)
  if (!quality.showDecorations) return null
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Ceramic Pot */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <SharedGeometry kind="cylinder" args={[0.3, 0.22, 0.7, 16]} />
        <SharedMaterial color={p.officeMetal} roughness={0.3}  />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.68, 0]}>
        <SharedGeometry kind="cylinder" args={[0.28, 0.28, 0.05, 12]} />
        <SharedMaterial color={OFFICE_DETAIL_COLORS.soil} roughness={0.9}  />
      </mesh>
      {/* Plant Leaves Cluster */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <SharedGeometry kind="dodecahedron" args={[0.42, 1]} />
        <SharedMaterial color={OFFICE_DETAIL_COLORS.foliage} roughness={0.6}  />
      </mesh>
      <mesh position={[0.15, 1.15, -0.05]} castShadow>
        <SharedGeometry kind="dodecahedron" args={[0.32, 1]} />
        <SharedMaterial color={OFFICE_DETAIL_COLORS.foliageLight} roughness={0.6}  />
      </mesh>
    </group>
  )
}
