import { GRID_GEOMETRY, WALL_GEOMETRY, WALL_CAP_GEOMETRY, FLOOR_GEOMETRY } from './architecture-geometry'
import { surfaceNoise } from '../systems/scene-resources'
import { RoundedBox } from '@react-three/drei'
import { useOfficeQuality } from '../systems/OfficeQualityContext'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * Environment3D — Premium Architectural Foundation
 *
 * Improvements (Sections 21-26):
 *   - Richer floor with zone-specific material variation
 *   - Wall thickness + height + window glass panels
 *   - Floor tile grid lines for depth
 *   - Perimeter edge bevel
 *   - No z-fighting (careful y-offsets)
 *   - Branding emblem elevated off floor
 */
import React, { useMemo } from 'react'
import { Text } from '@react-three/drei'
import { getOfficePalette } from '../systems/OfficePalette'

interface Environment3DProps {
  isDark?: boolean
}

export const Environment3D: React.FC<Environment3DProps> = ({ isDark = true }) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  // Tile grid color
  const gridColor = p.officeMetal
  const quality = useOfficeQuality()

  return (
    <group>
      {/* ══ 1. Foundation Slab ══ */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <SharedGeometry kind="box" args={[31, 0.5, 23]} />
        <SharedMaterial color={p.officeSlab}
          roughness={0.8}
          metalness={0.0}
         />
      </mesh>

      {/* Perimeter bevel trim strip */}
      <mesh position={[0, -0.03, 0]}>
        <SharedGeometry kind="box" args={[31.1, 0.04, 23.1]} />
        <SharedMaterial color={p.officeEdgeTrim}
          roughness={0.3}
          metalness={0.7}
          emissive={p.officeEdgeTrim}
          emissiveIntensity={isDark ? 0.15 : 0.05}
         />
      </mesh>

      {/* ══ 2. Primary Interior Floor ══ */}
      <mesh geometry={FLOOR_GEOMETRY} receiveShadow dispose={null}>
        <SharedMaterial color={p.officeFloor}
          map={surfaceNoise}
          roughness={0.75}
          metalness={0.02}
         />
      </mesh>

      <mesh geometry={GRID_GEOMETRY} dispose={null}>
        <SharedMaterial kind="basic" color={gridColor} transparent opacity={0.12} />
      </mesh>

      {/* Central Corridor accent (darker runway strip) */}
      <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[4, 22]} />
        <SharedMaterial color={p.officeFloorCorridor} roughness={0.7}  />
      </mesh>

      {/* ══ 4. Center Floor Branding Emblem ══ */}
      <group position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Outer accent ring */}
        <mesh>
          <SharedGeometry kind="ring" args={[1.85, 1.95, 64]} />
          <SharedMaterial kind="basic" color={p.officeBrandPrimary} transparent opacity={isDark ? 0.60 : 0.40} />
        </mesh>
        {/* Inner thin ring */}
        <mesh>
          <SharedGeometry kind="ring" args={[1.72, 1.76, 64]} />
          <SharedMaterial kind="basic" color={p.officeEdgeTrim} transparent opacity={isDark ? 0.40 : 0.25} />
        </mesh>
        {/* Central Glowing Hexagon Node Emblem */}
        <mesh rotation={[0, 0, Math.PI / 6]}>
          <SharedGeometry kind="ring" args={[0.45, 0.52, 6]} />
          <SharedMaterial kind="basic" color={p.officeBrandPrimary} transparent opacity={isDark ? 0.75 : 0.50} />
        </mesh>
        {/* Core AI Pulse Center */}
        <mesh position={[0, 0, 0.001]}>
          <SharedGeometry kind="circle" args={[0.22, 32]} />
          <SharedMaterial kind="basic" color={p.officeBrandPrimary} transparent opacity={isDark ? 0.50 : 0.30} />
        </mesh>

        {/* Wordmark: SAGARA AGENTIC */}
        <Text
          position={[0, 0.95, 0]}
          fontSize={0.34}
          color={p.officeBrandPrimary}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.14}
        >
          SAGARA AGENTIC
        </Text>
        <Text
          position={[0, -0.95, 0]}
          fontSize={0.16}
          color={p.officeBrandSecondary}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.20}
        >
          MISSION CONTROL 3D • VIRTUAL OFFICE
        </Text>
      </group>

      <mesh geometry={WALL_GEOMETRY} castShadow receiveShadow dispose={null}>
        <SharedMaterial color={p.officeWall} map={surfaceNoise} roughness={0.78} metalness={0.02} />
      </mesh>
      <mesh geometry={WALL_CAP_GEOMETRY} dispose={null}>
        <SharedMaterial color={p.officeMetal} roughness={0.36} metalness={0.62} />
      </mesh>

      {/* ══ 6. Internal Glass Partitions ══ */}
      {/* Command Room separator glass */}
      <mesh position={[-4.2, 0.75, -4.5]}>
        <SharedGeometry kind="box" args={[0.07, 1.5, 7.5]} />
        <SharedMaterial kind="physical" color={p.officeGlass}
          transmission={quality.detailLevel === 'ultra' ? 0.65 : 0}
          opacity={quality.detailLevel === 'ultra' ? 0.88 : 0.18}
          transparent
          roughness={0.14}
          metalness={0.1}
          thickness={0.07}
         />
      </mesh>
      {/* Command Room glass frame top */}
      <RoundedBox position={[-4.2, 1.52, -4.5]} args={[0.12, 0.06, 7.5]} radius={0.02} smoothness={2} bevelSegments={2}>
        <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.6}  />
      </RoundedBox>

      {/* Server Room security glass */}
      <mesh position={[4.2, 0.75, -4.5]}>
        <SharedGeometry kind="box" args={[0.07, 1.5, 7.5]} />
        <SharedMaterial kind="physical" color={p.officeGlass}
          transmission={quality.detailLevel === 'ultra' ? 0.65 : 0}
          opacity={quality.detailLevel === 'ultra' ? 0.88 : 0.18}
          transparent
          roughness={0.14}
          metalness={0.1}
          thickness={0.07}
         />
      </mesh>
      {/* Server Room glass frame top */}
      <RoundedBox position={[4.2, 1.52, -4.5]} args={[0.12, 0.06, 7.5]} radius={0.02} smoothness={2} bevelSegments={2}>
        <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.6}  />
      </RoundedBox>

      {/* Artifact Vault rear glass wall */}
      <mesh position={[0, 0.75, -9.2]}>
        <SharedGeometry kind="box" args={[5.5, 1.5, 0.07]} />
        <SharedMaterial kind="physical" color={p.officeGlass}
          transmission={quality.detailLevel === 'ultra' ? 0.65 : 0}
          opacity={quality.detailLevel === 'ultra' ? 0.88 : 0.18}
          transparent
          roughness={0.06}
          metalness={0.1}
          thickness={0.07}
         />
      </mesh>
    </group>
  )
}
