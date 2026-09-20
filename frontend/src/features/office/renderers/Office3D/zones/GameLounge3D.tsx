import React, { useMemo } from 'react'
import { Text, RoundedBox } from '@react-three/drei'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
import { getOfficePalette, OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'

interface GameLounge3DProps {
  position?: [number, number, number]
  isDark?: boolean
}

export const GameLounge3D: React.FC<GameLounge3DProps> = ({
  position = [22.5, 0, 14.5],
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const feltColor = '#15803d' // Classic green billiard felt
  const woodColor = '#451a03' // Rich mahogany wood frame

  return (
    <group position={position}>
      {/* ── Zone Floor Pad (Luxury Game Lounge Flooring) ── */}
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[10.5, 6.2]} />
        <SharedMaterial color={isDark ? '#1e1b4b' : '#ede9fe'} roughness={0.7} />
      </mesh>

      {/* ── Billiard / Pool Table ── */}
      <group position={[0, 0, 0]}>
        {/* Mahogany Outer Wood Frame */}
        <RoundedBox position={[0, 0.76, 0]} args={[2.6, 0.18, 1.4]} radius={0.06} smoothness={4} castShadow receiveShadow>
          <SharedMaterial color={woodColor} roughness={0.3} metalness={0.1} />
        </RoundedBox>

        {/* Green Felt Playing Surface */}
        <RoundedBox position={[0, 0.85, 0]} args={[2.3, 0.02, 1.1]} radius={0.02} smoothness={2}>
          <SharedMaterial color={feltColor} roughness={0.8} />
        </RoundedBox>

        {/* 6 Corner & Center Drop Pockets */}
        {[
          [-1.08, -0.48], [0, -0.48], [1.08, -0.48],
          [-1.08,  0.48], [0,  0.48], [1.08,  0.48],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 0.865, pz]}>
            <SharedGeometry kind="cylinder" args={[0.055, 0.055, 0.025, 12]} />
            <SharedMaterial color="#171717" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}

        {/* Billiard Balls Triangle Rack */}
        {[
          [0.6, 0], [0.7, -0.05], [0.7, 0.05], [0.8, -0.1], [0.8, 0], [0.8, 0.1]
        ].map(([bx, bz], idx) => (
          <mesh key={idx} position={[bx, 0.88, bz]}>
            <SharedGeometry kind="sphere" args={[0.032, 12, 12]} />
            <SharedMaterial
              color={idx === 0 ? '#ef4444' : idx === 4 ? '#171717' : idx % 2 === 0 ? '#f59e0b' : '#3b82f6'}
              roughness={0.1}
            />
          </mesh>
        ))}

        {/* Cue Stick Ball */}
        <mesh position={[-0.5, 0.88, 0.08]}>
          <SharedGeometry kind="sphere" args={[0.032, 12, 12]} />
          <SharedMaterial color="#ffffff" roughness={0.1} />
        </mesh>

        {/* 4 Sturdy Table Legs */}
        {[
          [-1.15, -0.55], [1.15, -0.55],
          [-1.15,  0.55], [1.15,  0.55],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.38, lz]} castShadow>
            <SharedGeometry kind="cylinder" args={[0.08, 0.06, 0.76, 14]} />
            <SharedMaterial color={woodColor} roughness={0.4} />
          </mesh>
        ))}

        {/* Overhead Brass Billiard Light Fixture */}
        <group position={[0, 1.85, 0]}>
          <mesh>
            <SharedGeometry kind="box" args={[1.8, 0.05, 0.05]} />
            <SharedMaterial color={p.officeMetal} roughness={0.2} metalness={0.8} />
          </mesh>
          {[-0.6, 0, 0.6].map((lx, idx) => (
            <mesh key={idx} position={[lx, -0.12, 0]}>
              <SharedGeometry kind="cylinder" args={[0.02, 0.16, 0.16, 16]} />
              <SharedMaterial color={p.officeAccentAmber} emissive={p.officeAccentAmber} emissiveIntensity={isDark ? 0.6 : 0.2} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ── Architectural Signage ── */}
      <group position={[0, 2.15, 2.8]}>
        <RoundedBox args={[2.5, 0.22, 0.025]} radius={0.04} smoothness={4}>
          <SharedMaterial color={p.officeMetal} roughness={0.4} metalness={0.3} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.015]}
          fontSize={0.09}
          color={isDark ? OFFICE_DETAIL_COLORS.textLight : OFFICE_DETAIL_COLORS.textDark}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          RECREATION & GAME LOUNGE
        </Text>
      </group>
    </group>
  )
}
