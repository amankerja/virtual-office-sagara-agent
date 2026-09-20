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

      {/* Holographic Projection Hub (Center Floor/Table Disk) */}
      <group position={[0, 0.905, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <SharedGeometry kind="circle" args={[0.35, 32]} />
          <SharedMaterial kind="basic" color={OFFICE_DETAIL_COLORS.brandCyan} transparent opacity={0.45} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <SharedGeometry kind="cylinder" args={[0.18, 0.28, 0.30, 24]} />
          <SharedMaterial kind="basic" color={OFFICE_DETAIL_COLORS.brandCyan} transparent opacity={0.15} />
        </mesh>
      </group>

      {/* Conference Room Laptops */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <React.Fragment key={i}>
          {/* Top Laptop */}
          <mesh position={[x, 0.90, -0.55]} rotation={[0, 0, 0]}>
            <SharedGeometry kind="box" args={[0.32, 0.012, 0.22]} />
            <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Bottom Laptop */}
          <mesh position={[x, 0.90, 0.55]} rotation={[0, Math.PI, 0]}>
            <SharedGeometry kind="box" args={[0.32, 0.012, 0.22]} />
            <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.8} />
          </mesh>
        </React.Fragment>
      ))}

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
