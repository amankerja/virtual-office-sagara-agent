import React, { useMemo } from 'react'
import { Text } from '@react-three/drei'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
import { getOfficePalette, OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { Plant3D } from '../furniture/Plant3D'

interface PantryZone3DProps {
  position?: [number, number, number]
  isDark?: boolean
}

export const PantryZone3D: React.FC<PantryZone3DProps> = ({
  position = [22.5, 0, -1.5],
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const floorColor = isDark ? '#1e293b' : '#e2e8f0'
  const counterColor = p.officeDeskTop
  const accentColor = p.officeAccentAmber

  return (
    <group position={position}>
      {/* ── Zone Floor Pad ── */}
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[10.5, 7.8]} />
        <SharedMaterial color={floorColor} roughness={0.75} />
      </mesh>

      {/* Perimeter Accent Strip */}
      <mesh position={[0, 0.022, -3.85]}>
        <SharedGeometry kind="box" args={[10.5, 0.016, 0.055]} />
        <SharedMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={isDark ? 0.35 : 0.15}
          roughness={0.3}
        />
      </mesh>

      {/* ── Coffee Bar Counter ── */}
      <mesh position={[-2.2, 0.45, -1.8]} castShadow receiveShadow>
        <SharedGeometry kind="box" args={[3.2, 0.90, 0.90]} />
        <SharedMaterial color={counterColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Espresso Machine */}
      <mesh position={[-3.0, 0.96, -1.8]} castShadow>
        <SharedGeometry kind="box" args={[0.55, 0.38, 0.42]} />
        <SharedMaterial color={p.officeMetal} roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Espresso Steam / LED Indicator */}
      <mesh position={[-3.0, 1.18, -1.8]}>
        <SharedGeometry kind="cylinder" args={[0.04, 0.04, 0.06, 12]} />
        <SharedMaterial
          kind="basic"
          color={OFFICE_DETAIL_COLORS.statusGreen}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Water Dispenser */}
      <mesh position={[-1.2, 0.98, -1.8]} castShadow>
        <SharedGeometry kind="cylinder" args={[0.18, 0.18, 0.45, 16]} />
        <SharedMaterial color={OFFICE_DETAIL_COLORS.brandCyan} transparent opacity={0.65} />
      </mesh>

      {/* Snack & Drink Fridge */}
      <mesh position={[-3.6, 0.90, -0.2]} castShadow>
        <SharedGeometry kind="box" args={[0.85, 1.80, 0.85]} />
        <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Glass Door */}
      <mesh position={[-3.16, 0.90, -0.2]}>
        <SharedGeometry kind="plane" args={[0.02, 1.60]} />
        <SharedMaterial
          kind="basic"
          color={OFFICE_DETAIL_COLORS.brandCyan}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* ── Cafe Lounge Table & Chairs ── */}
      <mesh position={[1.8, 0.42, 0]} castShadow receiveShadow>
        <SharedGeometry kind="cylinder" args={[0.80, 0.80, 0.84, 24]} />
        <SharedMaterial color={p.officeDeskTop} roughness={0.4} />
      </mesh>
      {/* Table Support Column */}
      <mesh position={[1.8, 0.20, 0]}>
        <SharedGeometry kind="cylinder" args={[0.08, 0.28, 0.40, 16]} />
        <SharedMaterial color={p.officeMetal} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Lounge Chairs around cafe table */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <mesh
          key={i}
          position={[
            1.8 + Math.sin(angle) * 1.25,
            0.26,
            Math.cos(angle) * 1.25,
          ]}
          rotation={[0, angle, 0]}
        >
          <SharedGeometry kind="box" args={[0.48, 0.52, 0.48]} />
          <SharedMaterial color={p.officeAccentAmber} roughness={0.6} />
        </mesh>
      ))}

      {/* Plant */}
      <Plant3D isDark={isDark} position={[3.6, 0, -2.4]} scale={1.1} />

      {/* ── Architectural Signage ── */}
      <group position={[0, 1.80, -3.0]}>
        <mesh>
          <SharedGeometry kind="box" args={[2.4, 0.28, 0.025]} />
          <SharedMaterial color={p.officeMetal} roughness={0.4} metalness={0.3} />
        </mesh>
        <Text
          position={[0, 0, 0.015]}
          fontSize={0.11}
          color={isDark ? OFFICE_DETAIL_COLORS.textLight : OFFICE_DETAIL_COLORS.textDark}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          PANTRY & LOUNGE
        </Text>
      </group>
    </group>
  )
}
