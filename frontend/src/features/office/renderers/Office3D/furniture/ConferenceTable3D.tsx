import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { getOfficePalette } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
import React from 'react'
import { Chair3D } from './Chair3D'

interface ConferenceTable3DProps {
  position: [number, number, number]
  isDark?: boolean
}

export const ConferenceTable3D: React.FC<ConferenceTable3DProps> = ({
  position,
  isDark = true,
}) => {
  const p = getOfficePalette(isDark)
  const surfaceColor = p.officeDeskTop
  const centerConsoleColor = p.officeMetal

  return (
    <group position={position}>
      {/* Table Surface */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <SharedGeometry kind="box" args={[4.2, 0.08, 1.8]} />
        <SharedMaterial color={surfaceColor} roughness={0.4}  />
      </mesh>

      {/* Center Media/Power Console */}
      <mesh position={[0, 0.89, 0]}>
        <SharedGeometry kind="box" args={[2.4, 0.02, 0.4]} />
        <SharedMaterial color={centerConsoleColor}
          emissive={OFFICE_DETAIL_COLORS.brandBlue}
          emissiveIntensity={0.2}
          roughness={0.5}
         />
      </mesh>

      {/* Dual Pedestal Bases */}
      <mesh position={[-1.2, 0.42, 0]} castShadow>
        <SharedGeometry kind="box" args={[0.3, 0.84, 1.0]} />
        <SharedMaterial color={OFFICE_DETAIL_COLORS.navyBase} roughness={0.5}  />
      </mesh>
      <mesh position={[1.2, 0.42, 0]} castShadow>
        <SharedGeometry kind="box" args={[0.3, 0.84, 1.0]} />
        <SharedMaterial color={OFFICE_DETAIL_COLORS.navyBase} roughness={0.5}  />
      </mesh>

      {/* Surrounding Chairs (Top side) */}
      <Chair3D position={[-1.2, 0, -1.3]} rotationY={0} isDark={isDark} />
      <Chair3D position={[0, 0, -1.3]} rotationY={0} isDark={isDark} />
      <Chair3D position={[1.2, 0, -1.3]} rotationY={0} isDark={isDark} />

      {/* Surrounding Chairs (Bottom side) */}
      <Chair3D position={[-1.2, 0, 1.3]} rotationY={Math.PI} isDark={isDark} />
      <Chair3D position={[0, 0, 1.3]} rotationY={Math.PI} isDark={isDark} />
      <Chair3D position={[1.2, 0, 1.3]} rotationY={Math.PI} isDark={isDark} />
    </group>
  )
}
