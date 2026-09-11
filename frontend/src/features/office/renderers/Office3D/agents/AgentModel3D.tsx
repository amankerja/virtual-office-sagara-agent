import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
/**
 * AgentModel3D — Premium Agent Character
 *
 * Improvements (Sections 38-47):
 *   - Correct seated proportions (legs forward, not down)
 *   - Refined head + visor placement
 *   - State animations: subtle, not game-like
 *   - ACTIVE: gentle typing arm oscillation
 *   - IDLE: breathing torso only
 *   - AWAITING_APPROVAL: slow attention head tilt, hands resting
 *   - OFFLINE: empty chair placeholder, avatar absent
 *   - DEGRADED/ERROR: small status indicator, no dramatic animation
 *   - All animation in refs — zero React setState per frame
 *   - Contact shadow oval under character
 */
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AgentProjection, AgentStatus } from '@/types/agent'
import type { OfficeZoneType } from '@/features/office/types/office'
import { AgentNameplate3D } from './AgentNameplate3D'
import { getOfficePalette } from '../systems/OfficePalette'
import { getProfileJacketColor } from '@/features/office/systems/OfficeStatusColors'

interface AgentModel3DProps {
  agent: AgentProjection
  zone?: OfficeZoneType
  position: [number, number, number]
  rotationY?: number
  isSelected?: boolean
  isHovered?: boolean
  onSelect: (id: string) => void
  onHover?: (id: string | null) => void
  isDark?: boolean
}

// Reusable geometries
const TORSO_GEO   = new THREE.BoxGeometry(0.40, 0.50, 0.26)
const HEAD_GEO    = new THREE.SphereGeometry(0.20, 14, 14)
const VISOR_GEO   = new THREE.BoxGeometry(0.24, 0.072, 0.072)
const ARM_GEO     = new THREE.BoxGeometry(0.09, 0.42, 0.09)
const BADGE_GEO   = new THREE.PlaneGeometry(0.14, 0.10)
const SHADOW_GEO  = new THREE.CircleGeometry(0.24, 18)

export const AgentModel3D: React.FC<AgentModel3DProps> = ({
  agent,
  zone = 'SPECIALIST',
  position,
  rotationY = 0,
  isSelected = false,
  isHovered = false,
  onSelect,
  onHover,
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])
  const profileColor = useMemo(() => getProfileJacketColor(zone, isDark, 0), [zone, isDark])
  const accent = profileColor
  const state: AgentStatus = agent.runtime.state

  const torsoRef    = useRef<THREE.Mesh>(null)
  const headRef     = useRef<THREE.Group>(null)
  const leftArmRef  = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)
  const beaconRef   = useRef<THREE.Mesh>(null)

  const isOffline          = state === 'OFFLINE'
  const isAwaitingApproval = state === 'AWAITING_APPROVAL'
  const isDegradedOrError  = state === 'DEGRADED' || state === 'ERROR'

  const suitColor = isOffline ? OFFICE_DETAIL_COLORS.offlineSuit : profileColor

  // Frame-loop: all animation in refs, no new objects created
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (state === 'ACTIVE') {
      // Subtle typing oscillation (±8°)
      if (leftArmRef.current)  leftArmRef.current.rotation.x  = -0.45 + Math.sin(t * 10) * 0.14
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.45 + Math.cos(t * 10) * 0.14
      // Very slight head bob
      if (headRef.current) headRef.current.rotation.x = 0.10 + Math.sin(t * 3.5) * 0.025
    } else if (state === 'IDLE' || state === 'RECENTLY_ACTIVE') {
      // Breathing only (scale y gently)
      if (torsoRef.current) {
        const breath = 1 + Math.sin(t * 1.6) * 0.018
        torsoRef.current.scale.y = breath
      }
      if (leftArmRef.current)  leftArmRef.current.rotation.x  = -0.18
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.18
      if (headRef.current) headRef.current.rotation.x = 0.04
    } else if (state === 'AWAITING_APPROVAL') {
      // Hands resting, slight upward head tilt — waiting posture
      if (leftArmRef.current)  leftArmRef.current.rotation.x  = -0.12
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.12
      if (headRef.current) headRef.current.rotation.x = -0.10 + Math.sin(t * 0.8) * 0.02
      // Attention beacon slow pulse
      if (beaconRef.current) {
        const pulse = 1 + Math.sin(t * 2.0) * 0.10
        beaconRef.current.scale.set(pulse, pulse, pulse)
      }
    }
  })

  if (isOffline) {
    // Offline: show empty chair shadow only — no avatar
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <AgentNameplate3D
          name={agent.definition.name}
          role={agent.definition.role}
          state={state}
          position={[0, 1.80, 0]}
          isSelected={isSelected}
          isHovered={isHovered}
        />
        {/* Ground contact shadow (ghosted) */}
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={SHADOW_GEO} />
          <meshBasicMaterial color={OFFICE_DETAIL_COLORS.black} transparent opacity={0.10} />
        </mesh>
      </group>
    )
  }

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(agent.id) }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover?.(agent.id)
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        onHover?.(null)
        if (typeof document !== 'undefined') document.body.style.cursor = 'default'
      }}
    >
      {/* ── Ground Contact Shadow ── */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={SHADOW_GEO} />
        <meshBasicMaterial color={OFFICE_DETAIL_COLORS.black} transparent opacity={isDark ? 0.32 : 0.14} />
      </mesh>

      {/* ── Selection/Hover Floor Halo ── */}
      {(isSelected || isHovered) && (
        <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.40, 28]} />
          <meshBasicMaterial
            color={isSelected ? OFFICE_DETAIL_COLORS.brandBlue : OFFICE_DETAIL_COLORS.brandCyan}
            transparent
            opacity={0.65}
          />
        </mesh>
      )}

      {/* ── Floating Nameplate ── */}
      <AgentNameplate3D
        name={agent.definition.name}
        role={agent.definition.role}
        state={state}
        position={[0, 2.10, 0]}
        isSelected={isSelected}
        isHovered={isHovered}
      />

      {/* ── Attention Beacon (AWAITING_APPROVAL) ── */}
      {isAwaitingApproval && (
        <mesh ref={beaconRef} position={[0, 2.55, 0]}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial
            color={p.officeAccentAmber}
            emissive={p.officeAccentAmber}
            emissiveIntensity={0.65}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* ── Status Indicator (DEGRADED/ERROR) — small monitor marker, no animation ── */}
      {isDegradedOrError && (
        <mesh position={[0.26, 1.05, -0.18]}>
          <boxGeometry args={[0.10, 0.065, 0.010]} />
          <meshStandardMaterial
            color={p.officeAccentRed}
            emissive={p.officeAccentRed}
            emissiveIntensity={0.75}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* ── Head Group ── */}
      <group ref={headRef} position={[0, 1.44, 0]}>
        <mesh geometry={HEAD_GEO} castShadow>
          <meshStandardMaterial
            color={p.officeAgentSkin}
            roughness={0.48}
            metalness={0.02}
          />
        </mesh>
        {/* Visor / sensor strip facing away from desk */}
        <mesh position={[0, 0.02, -0.16]} geometry={VISOR_GEO}>
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={isOffline ? 0 : 0.65}
            roughness={0.18}
          />
        </mesh>
      </group>

      {/* ── Torso ── */}
      <mesh ref={torsoRef} position={[0, 1.04, 0]} geometry={TORSO_GEO} castShadow>
        <meshStandardMaterial color={suitColor} roughness={0.55} />
      </mesh>
      {/* Chest badge */}
      <mesh position={[0, 1.14, -0.140]} geometry={BADGE_GEO}>
        <meshBasicMaterial color={accent} />
      </mesh>

      {/* ── Left Arm (positioned at desk typing angle) ── */}
      <mesh ref={leftArmRef} position={[-0.26, 1.04, 0]} geometry={ARM_GEO} castShadow
        rotation={[-0.35, 0, 0]}>
        <meshStandardMaterial color={suitColor} roughness={0.55} />
      </mesh>

      {/* ── Right Arm ── */}
      <mesh ref={rightArmRef} position={[0.26, 1.04, 0]} geometry={ARM_GEO} castShadow
        rotation={[-0.35, 0, 0]}>
        <meshStandardMaterial color={suitColor} roughness={0.55} />
      </mesh>

      {/* ── Legs — seated posture: thighs forward ── */}
      {/* Left thigh */}
      <mesh position={[-0.12, 0.72, -0.22]} rotation={[0.55, 0, 0]} castShadow>
        <boxGeometry args={[0.11, 0.38, 0.11]} />
        <meshStandardMaterial color={suitColor} roughness={0.60} />
      </mesh>
      {/* Right thigh */}
      <mesh position={[0.12, 0.72, -0.22]} rotation={[0.55, 0, 0]} castShadow>
        <boxGeometry args={[0.11, 0.38, 0.11]} />
        <meshStandardMaterial color={suitColor} roughness={0.60} />
      </mesh>
      {/* Left lower leg (shin) */}
      <mesh position={[-0.12, 0.44, 0.12]} rotation={[-0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.09, 0.32, 0.09]} />
        <meshStandardMaterial color={suitColor} roughness={0.60} />
      </mesh>
      {/* Right lower leg */}
      <mesh position={[0.12, 0.44, 0.12]} rotation={[-0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.09, 0.32, 0.09]} />
        <meshStandardMaterial color={suitColor} roughness={0.60} />
      </mesh>

      {/* ── Active Task Desk Panel ── */}
      {agent.runtime.currentTaskId && (
        <mesh position={[0, 0.94, -0.55]}>
          <boxGeometry args={[0.42, 0.065, 0.30]} />
          <meshStandardMaterial
            color={OFFICE_DETAIL_COLORS.taskPanel}
            emissive={p.officeAccentBlue}
            emissiveIntensity={0.35}
            roughness={0.18}
          />
        </mesh>
      )}
    </group>
  )
}
