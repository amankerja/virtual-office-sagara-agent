import { RoundedBox } from '@react-three/drei'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * Desk3D — Premium Sagara Workstation
 *
 * Improvements (Sections 25-27):
 *   - Recognizable silhouette even without labels
 *   - Desk surface has subtle top/edge separation
 *   - Under-desk cable management tray
 *   - Proper legs with feet detail
 *   - Modesty panel is structural, not decorative
 *   - Command variant wider with rear radius
 *   - Shared material logic from OfficePalette
 */
import React, { useMemo } from 'react'
import type { AgentStatus } from '@/types/agent'
import { getOfficePalette } from '../systems/OfficePalette'
import { getDeskStatusAccent } from '@/features/office/systems/OfficeStatusColors'

interface Desk3DProps {
  position: [number, number, number]
  rotationY?: number
  variant?: 'standard' | 'command' | 'career' | 'marketing'
  isDark?: boolean
  status?: AgentStatus
}

export const Desk3D: React.FC<Desk3DProps> = ({
  position,
  rotationY = 0,
  variant = 'standard',
  isDark = true,
  status = 'IDLE',
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])
  const statusAccent = useMemo(() => getDeskStatusAccent(status, isDark), [status, isDark])

  const isCommand   = variant === 'command'
  const isMarketing = variant === 'marketing'

  // Dimensions
  const W = isCommand ? 3.2 : isMarketing ? 2.6 : 2.2
  const D = isCommand ? 1.5 : 1.1
  const H = 0.86

  // Colors from palette
  const topColor    = isCommand ? p.officeDeskTopCommand : p.officeDeskTop
  const legColor    = p.officeDeskLeg

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ── Desktop Surface (Natural Material retained for realism) ── */}
      <RoundedBox position={[0, H, 0]} args={[W, 0.07, D]} radius={0.025} smoothness={2} bevelSegments={2} castShadow receiveShadow>
        <SharedMaterial color={topColor}
          roughness={0.56}
          metalness={0.02}
         />
      </RoundedBox>

      {/* ── Front-edge status accent bevel strip ── */}
      <mesh position={[0, H - 0.04, D / 2 - 0.01]}>
        <SharedGeometry kind="box" args={[W, 0.04, 0.04]} />
        <SharedMaterial
          color={statusAccent.color}
          emissive={statusAccent.emissive}
          emissiveIntensity={isDark ? 0.45 : 0.25}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* ── Corner Status LED Jewel on Desktop Surface ── */}
      <mesh position={[W / 2 - 0.12, H + 0.038, D / 2 - 0.12]}>
        <SharedGeometry kind="cylinder" args={[0.028, 0.028, 0.015, 12]} />
        <SharedMaterial
          color={statusAccent.color}
          emissive={statusAccent.emissive}
          emissiveIntensity={isDark ? 0.9 : 0.6}
          roughness={0.15}
        />
      </mesh>

      {/* ── Under-desk status accent trim (subtle ambient glow) ── */}
      <mesh position={[0, H - 0.075, 0]}>
        <SharedGeometry kind="box" args={[W * 0.9, 0.015, D * 0.9]} />
        <SharedMaterial
          color={statusAccent.color}
          emissive={statusAccent.emissive}
          emissiveIntensity={isDark ? 0.35 : 0.15}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* ── Legs — 4 corner square metal legs ── */}
      {([
        [-W / 2 + 0.14,  -D / 2 + 0.14],
        [ W / 2 - 0.14,  -D / 2 + 0.14],
        [-W / 2 + 0.14,   D / 2 - 0.14],
        [ W / 2 - 0.14,   D / 2 - 0.14],
      ] as [number, number][]).map(([lx, lz], i) => (
        <group key={i} position={[lx, H / 2, lz]}>
          {/* Leg column */}
          <mesh castShadow>
            <SharedGeometry kind="box" args={[0.07, H, 0.07]} />
            <SharedMaterial color={legColor} roughness={0.28 + (i % 2) * 0.06} metalness={0.65}  />
          </mesh>
          {/* Foot pad */}
          <mesh position={[0, -H / 2 + 0.02, 0]}>
            <SharedGeometry kind="box" args={[0.10, 0.04, 0.10]} />
            <SharedMaterial color={p.officeMetal} roughness={0.4} metalness={0.5}  />
          </mesh>
        </group>
      ))}

      {/* ── Modesty Panel (front face structural) ── */}
      <mesh position={[0, H * 0.52, -D / 2 + 0.08]} castShadow>
        <SharedGeometry kind="box" args={[W - 0.32, H * 0.55, 0.025]} />
        <SharedMaterial color={legColor} roughness={0.6} metalness={0.05}  />
      </mesh>

      {/* ── Under-desk cable tray ── */}
      <mesh position={[0, H * 0.28, 0]}>
        <SharedGeometry kind="box" args={[W * 0.7, 0.025, 0.14]} />
        <SharedMaterial color={p.officeMetal} roughness={0.5} metalness={0.4}  />
      </mesh>

      {/* ── Command Only: Side panel / return desk ── */}
      {isCommand && (
        <mesh position={[-W / 2 - 0.55, H, 0]} castShadow receiveShadow>
          <SharedGeometry kind="box" args={[0.9, 0.07, D * 0.7]} />
          <SharedMaterial color={topColor} roughness={0.4} metalness={0.12}  />
        </mesh>
      )}
    </group>
  )
}
