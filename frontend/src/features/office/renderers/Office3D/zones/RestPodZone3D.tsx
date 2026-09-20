import React, { useMemo } from 'react'
import { Text, RoundedBox } from '@react-three/drei'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
import { getOfficePalette, OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { Plant3D } from '../furniture/Plant3D'

interface RestPodZone3DProps {
  position?: [number, number, number]
  isDark?: boolean
}

export const RestPodZone3D: React.FC<RestPodZone3DProps> = ({
  position = [22.5, 0, 7.5],
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const floorColor = isDark ? '#0f172a' : '#cbd5e1'
  const podBodyColor = isDark ? '#1e293b' : '#f1f5f9'
  const accentColor = p.officeAccentPurple

  return (
    <group position={position}>
      {/* ── Zone Floor Pad (Acoustic Soft Carpet) ── */}
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[10.5, 7.8]} />
        <SharedMaterial color={floorColor} roughness={0.90} />
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

      {/* ── 3 Futuristic Smooth Capsule Sleeping Pods (Kamar Tidur) ── */}
      {[-2.6, 0, 2.6].map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, -0.4]}>
          {/* Capsule Outer Frame (Smooth Rounded Outer Pod) */}
          <RoundedBox position={[0, 0.55, 0]} args={[1.65, 0.85, 2.45]} radius={0.18} smoothness={4} castShadow receiveShadow>
            <SharedMaterial color={podBodyColor} roughness={0.3} metalness={0.2} />
          </RoundedBox>

          {/* Capsule Mattress / Bed Cushion (Ergonomic Soft Cushion) */}
          <RoundedBox position={[0, 0.42, 0]} args={[1.35, 0.22, 2.15]} radius={0.08} smoothness={4}>
            <SharedMaterial color={p.officeChairFrame} roughness={0.7} />
          </RoundedBox>

          {/* Pillow Headrest (Soft Rounded Contour) */}
          <RoundedBox position={[0, 0.58, -0.85]} args={[0.90, 0.12, 0.35]} radius={0.06} smoothness={4}>
            <SharedMaterial color={p.officeAccentCyan} roughness={0.5} />
          </RoundedBox>

          {/* Blanket Cover (Smooth Quilt) */}
          <RoundedBox position={[0, 0.52, 0.35]} args={[1.36, 0.08, 1.35]} radius={0.04} smoothness={4}>
            <SharedMaterial color={p.officeAccentPurple} roughness={0.6} />
          </RoundedBox>

          {/* Glowing Ambient Headlight Strip */}
          <mesh position={[0, 0.86, -1.05]}>
            <SharedGeometry kind="box" args={[1.40, 0.04, 0.08]} />
            <SharedMaterial
              color={p.officeAccentCyan}
              emissive={p.officeAccentCyan}
              emissiveIntensity={isDark ? 0.8 : 0.4}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Corner Plant */}
      <Plant3D isDark={isDark} position={[-3.6, 0, 2.4]} scale={1.0} />

      {/* ── Architectural Signage ── */}
      <group position={[0, 1.80, -3.0]}>
        <RoundedBox args={[2.6, 0.28, 0.025]} radius={0.05} smoothness={4}>
          <SharedMaterial color={p.officeMetal} roughness={0.4} metalness={0.3} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.015]}
          fontSize={0.11}
          color={isDark ? OFFICE_DETAIL_COLORS.textLight : OFFICE_DETAIL_COLORS.textDark}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          REST PODS & BEDROOMS
        </Text>
      </group>
    </group>
  )
}
