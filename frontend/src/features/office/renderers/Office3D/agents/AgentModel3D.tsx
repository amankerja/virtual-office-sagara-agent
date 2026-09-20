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
  const profileColor = useMemo(
    () => getProfileJacketColor(agent.id || agent.definition.role || zone, isDark, 0),
    [agent.id, agent.definition.role, zone, isDark]
  )
  const accent = profileColor
  const state: AgentStatus = agent.runtime.state

  const outerGroupRef = useRef<THREE.Group>(null)
  const torsoRef    = useRef<THREE.Mesh>(null)
  const headRef     = useRef<THREE.Group>(null)
  const leftArmRef  = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)
  const leftLegRef  = useRef<THREE.Mesh>(null)
  const rightLegRef = useRef<THREE.Mesh>(null)
  const beaconRef   = useRef<THREE.Mesh>(null)

  const isOffline          = state === 'OFFLINE'
  const isAwaitingApproval = state === 'AWAITING_APPROVAL'
  const isDegradedOrError  = state === 'DEGRADED' || state === 'ERROR'

  const suitColor = isOffline ? OFFICE_DETAIL_COLORS.offlineSuit : profileColor

  // Deterministic seed per agent
  const agentSeed = useMemo(() => {
    const str = agent.id || 'agent'
    let h = 0
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
    return Math.abs(h)
  }, [agent.id])

  // Frame-loop: autonomous walking, pantry coffee break, and sleeping in rest pod
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (!outerGroupRef.current) return

    if (state === 'ACTIVE') {
      // Return to desk immediately & perform typing
      outerGroupRef.current.position.set(0, 0, 0)
      outerGroupRef.current.rotation.set(0, 0, 0)

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -0.42 + Math.sin(t * 14) * 0.18
        leftArmRef.current.rotation.z = Math.cos(t * 9) * 0.06
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -0.45 + Math.cos(t * 12) * 0.16
        rightArmRef.current.rotation.z = -Math.sin(t * 7) * 0.05
      }
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * 1.6) * 0.15
        headRef.current.rotation.x = 0.08 + Math.sin(t * 3.5) * 0.035
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.05 + Math.sin(t * 2.2) * 0.015
        torsoRef.current.scale.y = 1 + Math.sin(t * 2.0) * 0.01
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (state === 'IDLE' || state === 'RECENTLY_ACTIVE') {
      // Autonomous schedule when IDLE / Bebas (90s cycle)
      const cycleT = (t + (agentSeed % 90)) % 90
      const relPantry: [number, number, number] = [
        22.5 + ((agentSeed % 3) - 1) * 1.1 - position[0],
        0,
        -2.5 + ((agentSeed % 2) * 0.8) - position[2],
      ]
      const relSleep: [number, number, number] = [
        22.5 + (((agentSeed >> 2) % 3) - 1) * 2.6 - position[0],
        0.42,
        7.5 - position[2],
      ]

      if (cycleT < 30) {
        // At Desk (Seated / Idle)
        outerGroupRef.current.position.set(0, 0, 0)
        outerGroupRef.current.rotation.set(0, 0, 0)
        if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 1.6) * 0.018
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.22
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.22
        if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.7) * 0.09
        if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
        if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
      } else if (cycleT >= 30 && cycleT < 38) {
        // Walking from Desk to Pantry
        const progress = (cycleT - 30) / 8
        const curX = relPantry[0] * progress
        const curZ = relPantry[2] * progress
        outerGroupRef.current.position.set(curX, Math.abs(Math.sin(t * 12)) * 0.04, curZ)
        outerGroupRef.current.rotation.set(0, Math.atan2(relPantry[0], relPantry[2]), 0)

        if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * 12) * 0.5
        if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * 12) * 0.5
        if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * 12) * 0.4
        if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * 12) * 0.4
      } else if (cycleT >= 38 && cycleT < 58) {
        // Standing / Relaxing at Pantry
        outerGroupRef.current.position.set(relPantry[0], 0, relPantry[2])
        outerGroupRef.current.rotation.set(0, Math.PI / 4, 0)
        if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 1.4) * 0.015
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.38
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.15
        if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.9) * 0.12
        if (leftLegRef.current) leftLegRef.current.rotation.x = 0
        if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      } else if (cycleT >= 58 && cycleT < 66) {
        // Walking from Pantry to Rest Pods / Kamar Tidur
        const progress = (cycleT - 58) / 8
        const curX = relPantry[0] + (relSleep[0] - relPantry[0]) * progress
        const curZ = relPantry[2] + (relSleep[2] - relPantry[2]) * progress
        outerGroupRef.current.position.set(curX, Math.abs(Math.sin(t * 12)) * 0.04, curZ)
        outerGroupRef.current.rotation.set(0, Math.atan2(relSleep[0] - relPantry[0], relSleep[2] - relPantry[2]), 0)

        if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * 12) * 0.5
        if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * 12) * 0.5
        if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * 12) * 0.4
        if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * 12) * 0.4
      } else if (cycleT >= 66 && cycleT < 84) {
        // Sleeping in Rest Pod (Lying down flat in capsule bed)
        outerGroupRef.current.position.set(relSleep[0], relSleep[1], relSleep[2])
        outerGroupRef.current.rotation.set(-Math.PI / 2, 0, 0) // Lying flat
        if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 0.9) * 0.025
        if (leftArmRef.current) leftArmRef.current.rotation.x = 0
        if (rightArmRef.current) rightArmRef.current.rotation.x = 0
        if (leftLegRef.current) leftLegRef.current.rotation.x = 0
        if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      } else {
        // Walking back to Desk
        const progress = (cycleT - 84) / 6
        const curX = relSleep[0] * (1 - progress)
        const curZ = relSleep[2] * (1 - progress)
        outerGroupRef.current.position.set(curX, Math.abs(Math.sin(t * 12)) * 0.04, curZ)
        outerGroupRef.current.rotation.set(0, Math.atan2(-relSleep[0], -relSleep[2]), 0)

        if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * 12) * 0.5
        if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * 12) * 0.5
        if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * 12) * 0.4
        if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * 12) * 0.4
      }
    } else if (state === 'AWAITING_APPROVAL') {
      outerGroupRef.current.position.set(0, 0, 0)
      outerGroupRef.current.rotation.set(0, 0, 0)
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.15
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.15
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * 1.2) * 0.12
        headRef.current.rotation.x = -0.08 + Math.sin(t * 0.8) * 0.02
      }
      if (beaconRef.current) {
        const pulse = 1 + Math.sin(t * 2.5) * 0.15
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

      {/* ── Avatar Character Outer Group (Walking / Sitting / Sleeping) ── */}
      <group ref={outerGroupRef}>
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

        {/* ── Legs — seated/standing/walking posture ── */}
        {/* Left thigh */}
        <mesh ref={leftLegRef} position={[-0.12, 0.72, -0.22]} rotation={[0.55, 0, 0]} castShadow>
          <boxGeometry args={[0.11, 0.38, 0.11]} />
          <meshStandardMaterial color={suitColor} roughness={0.60} />
        </mesh>
        {/* Right thigh */}
        <mesh ref={rightLegRef} position={[0.12, 0.72, -0.22]} rotation={[0.55, 0, 0]} castShadow>
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
      </group>

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
