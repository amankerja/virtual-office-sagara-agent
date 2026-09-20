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
      {/* ══ 1. UNIFIED SEAMLESS BUILDING COMPLEX SLAB ══ */}
      {/* Unified Foundation Base Slab (Main Office + Skyway Connector + Annex Building) */}
      <mesh position={[6.5, -0.25, 0.5]} receiveShadow>
        <SharedGeometry kind="box" args={[44, 0.5, 24]} />
        <SharedMaterial color={p.officeSlab} roughness={0.8} metalness={0.0} />
      </mesh>

      {/* Perimeter Bevel Edge Trim */}
      <mesh position={[6.5, -0.03, 0.5]}>
        <SharedGeometry kind="box" args={[44.1, 0.04, 24.1]} />
        <SharedMaterial color={p.officeEdgeTrim} roughness={0.3} metalness={0.7} emissive={p.officeEdgeTrim} emissiveIntensity={isDark ? 0.18 : 0.06} />
      </mesh>

      {/* ══ 2. DISTINCT FLOORING ZONES (Lantai Bangunan Utama vs Annex) ══ */}
      {/* 2A. Main Office Interior Floor */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[30.4, 22.4]} />
        <SharedMaterial color={p.officeFloor} roughness={0.75} metalness={0.02} />
      </mesh>

      {/* 2B. Recreation Annex Interior Floor (Pantry & Kamar Tidur) */}
      <mesh position={[22.5, 0.009, 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[12.5, 19.5]} />
        <SharedMaterial color={isDark ? '#0f172a' : '#e2e8f0'} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* ══ 3. MAIN INDOOR HIGHWAY / HALLWAY AISLE (Jalan Utama Berbeda Warna) ══ */}
      {/* Main East-West Highway Aisle Carpet (Runner from Main Office across Connector into Annex) */}
      <mesh position={[6.5, 0.015, 3.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[43.0, 3.2]} />
        <SharedMaterial color={isDark ? '#1e1b4b' : '#dbeafe'} roughness={0.55} metalness={0.25} />
      </mesh>

      {/* Glowing LED Border Trim Strip North for Main Highway */}
      <mesh position={[6.5, 0.018, 1.40]}>
        <SharedGeometry kind="box" args={[43.0, 0.012, 0.06]} />
        <SharedMaterial color={p.officeAccentCyan} emissive={p.officeAccentCyan} emissiveIntensity={isDark ? 0.7 : 0.35} roughness={0.2} />
      </mesh>
      {/* Glowing LED Border Trim Strip South for Main Highway */}
      <mesh position={[6.5, 0.018, 4.60]}>
        <SharedGeometry kind="box" args={[43.0, 0.012, 0.06]} />
        <SharedMaterial color={p.officeAccentCyan} emissive={p.officeAccentCyan} emissiveIntensity={isDark ? 0.7 : 0.35} roughness={0.2} />
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

      {/* ══ 5. GRAND SEAMLESS BUILDING CONNECTOR (Jembatan Koridor Kaca Melayang) ══ */}
      {/* Grand Arch Portal Gate at Main Office East Exit */}
      <group position={[15.2, 1.4, 3.0]}>
        {/* Frame Columns */}
        <mesh position={[0, 0, -1.65]}>
          <SharedGeometry kind="box" args={[0.22, 2.8, 0.15]} />
          <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, 1.65]}>
          <SharedGeometry kind="box" args={[0.22, 2.8, 0.15]} />
          <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Lintel Header */}
        <mesh position={[0, 1.4, 0]}>
          <SharedGeometry kind="box" args={[0.22, 0.35, 3.45]} />
          <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Illuminated Neon Arch Sign */}
        <Text position={[0.12, 1.4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.13} color={p.officeBrandPrimary} anchorX="center" anchorY="middle" letterSpacing={0.12}>
          RECREATION ANNEX ➔
        </Text>
      </group>

      {/* Corridor Glass Walls (North & South) */}
      <mesh position={[17.5, 1.25, 1.40]}>
        <SharedGeometry kind="box" args={[4.6, 2.5, 0.06]} />
        <SharedMaterial kind="physical" color={p.officeGlass} transmission={0.75} opacity={0.4} transparent roughness={0.1} />
      </mesh>
      <mesh position={[17.5, 1.25, 4.60]}>
        <SharedGeometry kind="box" args={[4.6, 2.5, 0.06]} />
        <SharedMaterial kind="physical" color={p.officeGlass} transmission={0.75} opacity={0.4} transparent roughness={0.1} />
      </mesh>
      {/* Corridor Roof Structure */}
      <mesh position={[17.5, 2.55, 3.0]}>
        <SharedGeometry kind="box" args={[4.7, 0.08, 3.26]} />
        <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* ══ 6. Clean Internal Glass Partitions (No Desk Collisions) ══ */}
      {/* Command Room separator glass (North-West) */}
      <mesh position={[-4.2, 0.75, -5.5]}>
        <SharedGeometry kind="box" args={[0.07, 1.5, 5.5]} />
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
      <RoundedBox position={[-4.2, 1.52, -5.5]} args={[0.12, 0.06, 5.5]} radius={0.02} smoothness={2} bevelSegments={2}>
        <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.6}  />
      </RoundedBox>

      {/* Server Room security glass (North-East) */}
      <mesh position={[4.2, 0.75, -5.5]}>
        <SharedGeometry kind="box" args={[0.07, 1.5, 5.5]} />
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
      <RoundedBox position={[4.2, 1.52, -5.5]} args={[0.12, 0.06, 5.5]} radius={0.02} smoothness={2} bevelSegments={2}>
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
