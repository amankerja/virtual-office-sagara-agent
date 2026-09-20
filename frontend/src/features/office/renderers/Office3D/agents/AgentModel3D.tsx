import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, RoundedBox } from '@react-three/drei'
import type { AgentProjection, AgentStatus } from '@/types/agent'
import type { TaskProjection } from '@/types/task'
import type { DelegationProjection } from '@/types/runtime'
import type { ApprovalProjection } from '@/types/approval'
import type { OfficeZoneType } from '@/features/office/types/office'
import { resolveOfficeBehavior, type OfficeBehaviorState } from '@/features/office/animation/behavior'
import { AgentNameplate3D } from './AgentNameplate3D'
import { getOfficePalette, OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { getProfileJacketColor } from '@/features/office/systems/OfficeStatusColors'

interface AgentModel3DProps {
  agent: AgentProjection
  task?: TaskProjection
  delegations?: DelegationProjection[]
  approvals?: ApprovalProjection[]
  collaborating?: boolean
  elapsedSeconds?: number
  zone?: OfficeZoneType
  position: [number, number, number]
  rotationY?: number
  isSelected?: boolean
  isHovered?: boolean
  onSelect: (id: string) => void
  onHover?: (id: string | null) => void
  isDark?: boolean
}

/**
 * Safety clamp helper to enforce indoor floor boundary limits.
 * Prevents character target positions from rendering outside perimeter walls.
 */
function clampToFloorBounds(absX: number, absZ: number): [number, number] {
  // Annex Building Bounds (X >= 16.5)
  if (absX >= 16.5) {
    return [
      Math.max(17.8, Math.min(28.5, absX)),
      Math.max(-5.5, Math.min(11.5, absZ)),
    ]
  }
  // Skybridge Corridor Transition (13.5 < X < 16.5)
  if (absX > 13.5) {
    return [
      Math.max(13.6, Math.min(16.4, absX)),
      Math.max(0.4, Math.min(2.6, absZ)),
    ]
  }
  // Main Office Bounds (X <= 13.5)
  return [
    Math.max(-14.2, Math.min(14.2, absX)),
    Math.max(-10.2, Math.min(10.2, absZ)),
  ]
}

// Reusable geometries & materials
const HEAD_GEO    = new THREE.SphereGeometry(0.20, 16, 16)
const VISOR_GEO   = new THREE.BoxGeometry(0.24, 0.072, 0.072)
const BADGE_GEO   = new THREE.PlaneGeometry(0.14, 0.10)
const SHADOW_GEO  = new THREE.CircleGeometry(0.26, 20)
const JOINT_GEO   = new THREE.SphereGeometry(0.065, 12, 12)

export const AgentModel3D: React.FC<AgentModel3DProps> = ({
  agent,
  task,
  delegations,
  approvals,
  collaborating = false,
  elapsedSeconds,
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
  const innerScaleRef = useRef<THREE.Group>(null)
  const torsoRef    = useRef<THREE.Mesh>(null)
  const headRef     = useRef<THREE.Group>(null)
  const visorMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const leftArmRef  = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef  = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const beaconRef   = useRef<THREE.Mesh>(null)

  const isOffline          = state === 'OFFLINE'
  const isAwaitingApproval = state === 'AWAITING_APPROVAL'
  const isDegradedOrError  = state === 'DEGRADED' || state === 'ERROR'

  const suitColor = isOffline ? OFFICE_DETAIL_COLORS.offlineSuit : profileColor

  // Deterministic seed per agent for proportional variations & animation offsets
  const agentSeed = useMemo(() => {
    const str = agent.id || 'agent'
    let h = 0
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
    return Math.abs(h)
  }, [agent.id])

  // Body scale variations derived from seed
  const bodyScaleH = useMemo(() => 0.94 + (agentSeed % 10) * 0.012, [agentSeed])
  const bodyScaleW = useMemo(() => 0.94 + ((agentSeed >> 3) % 8) * 0.015, [agentSeed])

  // Position & Rotation Damping Refs (Smooth delta-time interpolation)
  const currPos = useRef(new THREE.Vector3(0, 0, 0))
  const targetPos = useRef(new THREE.Vector3(0, 0, 0))
  const currYaw = useRef(0)
  const targetYaw = useRef(0)
  const scaleMultiplier = useRef(1.0)
  const distanceWalked = useRef(0)

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    if (!outerGroupRef.current) return

    // ── 1. Resolve Dynamic Behavior State ──
    const sec = elapsedSeconds ?? t
    const behavior: OfficeBehaviorState = resolveOfficeBehavior({
      agent,
      task,
      delegations,
      approvals,
      collaborating,
      elapsedSeconds: sec,
    })

    // ── 2. Hover & Selection Scale Damping ──
    const desiredScale = isSelected ? 1.06 : isHovered ? 1.04 : 1.0
    scaleMultiplier.current = THREE.MathUtils.damp(scaleMultiplier.current, desiredScale, 12, delta)
    if (innerScaleRef.current) {
      innerScaleRef.current.scale.set(bodyScaleW * scaleMultiplier.current, bodyScaleH * scaleMultiplier.current, bodyScaleW * scaleMultiplier.current)
    }

    // ── 3. Waypoint Navigation & Damped Movement ──
    const isWorkAtDesk =
      behavior.startsWith('WORK_') && behavior !== 'WORK_COLLABORATING' ||
      behavior === 'THINKING' ||
      behavior === 'CONFIGURING' ||
      behavior === 'WAITING_APPROVAL' ||
      behavior === 'TROUBLESHOOTING' ||
      behavior === 'ERROR_REVIEW'

    // Open Floor Meeting Spot in Main Office (North-West Central Aisle x=-4.5, z=-2.5, well clear of walls & desks)
    const MEETING_SPOT_X = -4.5
    const MEETING_SPOT_Z = -2.5

    const relPantry: [number, number, number] = [
      22.5 + ((agentSeed % 3) - 1) * 1.1 - position[0],
      0,
      -4.5 + ((agentSeed % 2) * 0.8) - position[2],
    ]
    const relSleep: [number, number, number] = [
      22.5 + (((agentSeed >> 2) % 3) - 1) * 2.6 - position[0],
      0.36,
      4.5 - position[2],
    ]
    const relMeeting: [number, number, number] = [
      MEETING_SPOT_X + ((agentSeed % 2) - 0.5) * 1.2 - position[0],
      0,
      MEETING_SPOT_Z + (((agentSeed >> 1) % 2) - 0.5) * 1.2 - position[2],
    ]

    const wp1: [number, number, number] = [0, 0, 1.5 - position[2]]
    const wp2: [number, number, number] = [22.5 - position[0], 0, 1.5 - position[2]]

    const setClampedTarget = (relX: number, relY: number, relZ: number) => {
      const absX = position[0] + relX
      const absZ = position[2] + relZ
      const [safeAbsX, safeAbsZ] = clampToFloorBounds(absX, absZ)
      targetPos.current.set(safeAbsX - position[0], relY, safeAbsZ - position[2])
    }

    let isSleepingAtPod = false

    if (isWorkAtDesk) {
      // Immediate return / wake up to desk when task / work is active
      setClampedTarget(0, 0, 0)
      targetYaw.current = 0
    } else if (behavior === 'WORK_COLLABORATING') {
      // Gather at Shared Open Meeting Spot & face partner
      setClampedTarget(relMeeting[0], 0, relMeeting[2])
      targetYaw.current = Math.PI / 4
    } else {
      // Free / Idle time cycle (Pantry -> Rest Pod Bed -> Desk)
      const cycleT = (t + (agentSeed % 120)) % 120

      if (cycleT < 45) {
        // Seated at Desk
        setClampedTarget(0, 0, 0)
        targetYaw.current = 0
      } else if (cycleT >= 45 && cycleT < 55) {
        // Walking to Pantry
        const p = (cycleT - 45) / 10
        const easeP = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        let x = 0, z = 0, dx = 0, dz = 0
        if (easeP < 0.25) {
          const sp = easeP / 0.25
          x = wp1[0] * sp; z = wp1[2] * sp; dx = wp1[0] || 0.001; dz = wp1[2]
        } else if (easeP < 0.70) {
          const sp = (easeP - 0.25) / 0.45
          x = wp1[0] + (wp2[0] - wp1[0]) * sp; z = wp1[2] + (wp2[2] - wp1[2]) * sp; dx = wp2[0] - wp1[0]; dz = wp2[2] - wp1[2]
        } else {
          const sp = (easeP - 0.70) / 0.30
          x = wp2[0] + (relPantry[0] - wp2[0]) * sp; z = wp2[2] + (relPantry[2] - wp2[2]) * sp; dx = relPantry[0] - wp2[0]; dz = relPantry[2] - wp2[2]
        }
        setClampedTarget(x, 0, z)
        targetYaw.current = Math.atan2(dx, dz)
      } else if (cycleT >= 55 && cycleT < 75) {
        // Standing at Pantry
        setClampedTarget(relPantry[0], 0, relPantry[2])
        targetYaw.current = Math.PI / 4
      } else if (cycleT >= 75 && cycleT < 85) {
        // Walking to Rest Pod
        const p = (cycleT - 75) / 10
        const easeP = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        const x = relPantry[0] + (relSleep[0] - relPantry[0]) * easeP
        const z = relPantry[2] + (relSleep[2] - relPantry[2]) * easeP
        setClampedTarget(x, 0, z)
        targetYaw.current = Math.atan2(relSleep[0] - relPantry[0], relSleep[2] - relPantry[2])
      } else if (cycleT >= 85 && cycleT < 110) {
        // Truly Free -> Reclined Sleeping at Rest Pod Bed
        setClampedTarget(relSleep[0], 0.36, relSleep[2])
        targetYaw.current = Math.PI / 2
        isSleepingAtPod = true
      } else {
        // Walking back to Desk
        const p = (cycleT - 110) / 10
        const easeP = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        let x = 0, z = 0, dx = 0, dz = 0
        if (easeP < 0.30) {
          const sp = easeP / 0.30
          x = relSleep[0] + (wp2[0] - relSleep[0]) * sp; z = relSleep[2] + (wp2[2] - relSleep[2]) * sp; dx = wp2[0] - relSleep[0]; dz = wp2[2] - relSleep[2]
        } else if (easeP < 0.75) {
          const sp = (easeP - 0.30) / 0.45
          x = wp2[0] + (wp1[0] - wp2[0]) * sp; z = wp2[2] + (wp1[2] - wp2[2]) * sp; dx = wp1[0] - wp2[0]; dz = wp1[2] - wp2[2]
        } else {
          const sp = (easeP - 0.75) / 0.25
          x = wp1[0] * (1 - sp); z = wp1[2] * (1 - sp); dx = -wp1[0] || -0.001; dz = -wp1[2]
        }
        setClampedTarget(x, 0, z)
        targetYaw.current = Math.atan2(dx, dz)
      }
    }

    // ── 4. Visor Emissive intensity (Dimmed 0.05 when sleeping) ──
    if (visorMatRef.current) {
      if (isOffline) {
        visorMatRef.current.emissiveIntensity = 0
      } else if (isSleepingAtPod) {
        visorMatRef.current.emissiveIntensity = 0.05
      } else {
        visorMatRef.current.emissiveIntensity = 0.55 + Math.sin(t * 3.5 + agentSeed) * 0.20
      }
    }

    // Smooth frame-rate independent position & rotation damp
    const prevX = currPos.current.x
    const prevZ = currPos.current.z

    currPos.current.x = THREE.MathUtils.damp(currPos.current.x, targetPos.current.x, 9.0, delta)
    currPos.current.y = THREE.MathUtils.damp(currPos.current.y, targetPos.current.y, 9.0, delta)
    currPos.current.z = THREE.MathUtils.damp(currPos.current.z, targetPos.current.z, 9.0, delta)

    // Yaw shortest-path angle lerp
    let diff = targetYaw.current - currYaw.current
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    currYaw.current += diff * (1 - Math.exp(-12.0 * delta))

    // Calculate actual movement velocity
    const vx = (currPos.current.x - prevX) / Math.max(0.001, delta)
    const vz = (currPos.current.z - prevZ) / Math.max(0.001, delta)
    const moveSpeed = Math.hypot(vx, vz)

    distanceWalked.current += moveSpeed * delta * 7.5

    // Set outer group damped position
    const stepBob = isSleepingAtPod ? 0 : Math.abs(Math.sin(distanceWalked.current * 2)) * 0.035 * Math.min(1.0, moveSpeed * 0.8)
    outerGroupRef.current.position.set(currPos.current.x, currPos.current.y + stepBob, currPos.current.z)
    outerGroupRef.current.rotation.set(0, currYaw.current, 0)

    // ── 5. Distinct Limb & Posture Animations by Behavior State ──
    if (moveSpeed > 0.12) {
      // Walking gait synced with ground movement
      const stride = Math.sin(distanceWalked.current) * Math.min(0.55, moveSpeed * 0.40)
      if (leftLegRef.current) leftLegRef.current.rotation.x = stride
      if (rightLegRef.current) rightLegRef.current.rotation.x = -stride
      if (leftArmRef.current) leftArmRef.current.rotation.x = -stride * 0.8
      if (rightArmRef.current) rightArmRef.current.rotation.x = stride * 0.8
      if (headRef.current) headRef.current.rotation.set(0, Math.sin(distanceWalked.current) * 0.06, 0)
      if (torsoRef.current) torsoRef.current.rotation.set(0, 0, 0)
    } else if (isSleepingAtPod) {
      // Reclined Sleeping pose in Rest Pod bed
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.05
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.05
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0
      if (headRef.current) headRef.current.rotation.set(0, 0, 0)
      if (torsoRef.current) {
        torsoRef.current.rotation.set(-0.45, 0, 0)
        torsoRef.current.scale.y = 1 + Math.sin(t * 0.8) * 0.04
      }
    } else if (behavior === 'WORK_TYPING') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.42 + Math.sin(t * 14) * 0.18
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.45 + Math.cos(t * 12) * 0.16
      if (headRef.current) headRef.current.rotation.set(0.08 + Math.sin(t * 3.5) * 0.035, Math.sin(t * 1.6) * 0.15, 0)
      if (torsoRef.current) {
        torsoRef.current.rotation.set(0.05 + Math.sin(t * 2.2) * 0.015, 0, 0)
        torsoRef.current.scale.y = 1 + Math.sin(t * 2.0) * 0.01
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (behavior === 'WORK_MOUSE') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.38
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -0.35 + Math.sin(t * 2) * 0.05
        rightArmRef.current.rotation.z = Math.sin(t * 3) * 0.08
      }
      if (headRef.current) headRef.current.rotation.set(0.05, Math.sin(t * 1.2) * 0.10, 0)
      if (torsoRef.current) torsoRef.current.rotation.set(0.02, 0, 0)
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (behavior === 'WORK_READING') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.28
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.28
      if (headRef.current) headRef.current.rotation.set(0.22 + Math.sin(t * 0.6) * 0.02, 0, 0)
      if (torsoRef.current) torsoRef.current.rotation.set(0.04, 0, 0)
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (behavior === 'WORK_MONITORING') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.30
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.30
      if (headRef.current) headRef.current.rotation.set(0.06, Math.sin(t * 1.4) * 0.35, 0)
      if (torsoRef.current) torsoRef.current.rotation.set(0, 0, 0)
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (behavior === 'WORK_SUPERVISING') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.20
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.65 + Math.sin(t * 2.2) * 0.18, 0.25, 0)
      if (headRef.current) headRef.current.rotation.set(0, Math.sin(t * 1.5) * 0.20, 0)
      if (torsoRef.current) torsoRef.current.rotation.set(0, 0, 0)
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (behavior === 'WORK_COLLABORATING') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.15
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.30 + Math.sin(t * 2.8) * 0.14
      if (headRef.current) headRef.current.rotation.set(0.06 + Math.sin(t * 3.5) * 0.09, Math.sin(t * 1.8) * 0.15, 0)
      if (torsoRef.current) torsoRef.current.rotation.set(0, 0, 0)
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
    } else if (behavior === 'THINKING') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.20
      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.15 + Math.sin(t * 0.8) * 0.04, 0, 0.35)
      if (headRef.current) headRef.current.rotation.set(-0.05, 0, 0.14)
      if (torsoRef.current) torsoRef.current.rotation.set(0, 0, 0)
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (behavior === 'TROUBLESHOOTING' || behavior === 'ERROR_REVIEW') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.80
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.80
      if (headRef.current) headRef.current.rotation.set(0.18 + Math.sin(t * 4) * 0.04, 0, 0)
      if (torsoRef.current) torsoRef.current.rotation.set(0.14, 0, 0)
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
    } else if (behavior === 'WAITING_APPROVAL') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.15
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.15
      if (headRef.current) headRef.current.rotation.set(-0.08 + Math.sin(t * 0.8) * 0.02, Math.sin(t * 1.2) * 0.12, 0)
      if (beaconRef.current) {
        const pulse = 1 + Math.sin(t * 2.5) * 0.15
        beaconRef.current.scale.set(pulse, pulse, pulse)
      }
    } else if (behavior === 'IDLE_LOOK_AROUND') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.18
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.18
      if (headRef.current) headRef.current.rotation.set(Math.sin(t * 1.2) * 0.08, Math.sin(t * 0.8) * 0.45, 0)
      if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 1.4) * 0.012
    } else if (behavior === 'BREAK_STRETCH') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -1.4 + Math.sin(t * 2) * 0.10
      if (rightArmRef.current) rightArmRef.current.rotation.x = -1.4 + Math.sin(t * 2) * 0.10
      if (headRef.current) headRef.current.rotation.set(-0.15, 0, 0)
    } else {
      // Default Seated / Standing Rest
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.55
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.55
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.18
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.18
      if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 1.4) * 0.012
    }
  })

  if (isOffline) {
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
        <meshBasicMaterial color={OFFICE_DETAIL_COLORS.black} transparent opacity={isDark ? 0.35 : 0.15} />
      </mesh>

      {/* ── Selection/Hover Floor Halo ── */}
      {(isSelected || isHovered) && (
        <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.44, 32]} />
          <meshBasicMaterial
            color={isSelected ? OFFICE_DETAIL_COLORS.brandBlue : OFFICE_DETAIL_COLORS.brandCyan}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      {/* ── Mini 3D Tooltip Badge on Hover ── */}
      {isHovered && (
        <Html position={[0, 2.50, 0]} center distanceFactor={12}>
          <div className="bg-slate-900/90 backdrop-blur-md text-slate-100 border border-cyan-500/40 px-3 py-1.5 rounded-lg shadow-xl text-xs flex flex-col gap-0.5 whitespace-nowrap pointer-events-none">
            <div className="font-bold text-cyan-400">{agent.definition.name}</div>
            <div className="text-[10px] text-slate-300">{agent.definition.role || zone}</div>
            <div className="text-[9px] text-emerald-400 uppercase tracking-wider">{state}</div>
          </div>
        </Html>
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

      {/* ── Status Indicator (DEGRADED/ERROR) ── */}
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
        <group ref={innerScaleRef}>
          {/* ── Head Group ── */}
          <group ref={headRef} position={[0, 1.44, 0]}>
            <mesh geometry={HEAD_GEO} castShadow>
              <meshStandardMaterial
                color={p.officeAgentSkin}
                roughness={0.45}
                metalness={0.02}
              />
            </mesh>
            {/* Visor / sensor strip */}
            <mesh position={[0, 0.02, -0.16]} geometry={VISOR_GEO}>
              <meshStandardMaterial
                ref={visorMatRef}
                color={accent}
                emissive={accent}
                emissiveIntensity={isOffline ? 0 : 0.65}
                roughness={0.15}
              />
            </mesh>
          </group>

          {/* ── Torso (Rounded Box) ── */}
          <RoundedBox ref={torsoRef} position={[0, 1.04, 0]} args={[0.40, 0.50, 0.26]} radius={0.06} smoothness={4} castShadow>
            <meshStandardMaterial color={suitColor} roughness={0.50} />
          </RoundedBox>
          {/* Chest badge */}
          <mesh position={[0, 1.14, -0.140]} geometry={BADGE_GEO}>
            <meshBasicMaterial color={accent} />
          </mesh>

          {/* ── Left Arm (With Shoulder & Elbow Joints) ── */}
          <group ref={leftArmRef} position={[-0.26, 1.04, 0]}>
            <mesh position={[0, 0.20, 0]} geometry={JOINT_GEO}>
              <meshStandardMaterial color={suitColor} roughness={0.4} />
            </mesh>
            <RoundedBox position={[0, 0, 0]} args={[0.13, 0.42, 0.13]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial color={suitColor} roughness={0.50} />
            </RoundedBox>
          </group>

          {/* ── Right Arm (With Shoulder & Elbow Joints) ── */}
          <group ref={rightArmRef} position={[0.26, 1.04, 0]}>
            <mesh position={[0, 0.20, 0]} geometry={JOINT_GEO}>
              <meshStandardMaterial color={suitColor} roughness={0.4} />
            </mesh>
            <RoundedBox position={[0, 0, 0]} args={[0.13, 0.42, 0.13]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial color={suitColor} roughness={0.50} />
            </RoundedBox>
          </group>

          {/* ── Legs (With Knee Joints & Rounded Primitives) ── */}
          <group ref={leftLegRef} position={[-0.12, 0.72, -0.22]}>
            <mesh position={[0, 0.16, 0]} geometry={JOINT_GEO}>
              <meshStandardMaterial color={suitColor} roughness={0.4} />
            </mesh>
            <RoundedBox position={[0, -0.10, 0]} args={[0.13, 0.38, 0.13]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial color={suitColor} roughness={0.55} />
            </RoundedBox>
          </group>
          <group ref={rightLegRef} position={[0.12, 0.72, -0.22]}>
            <mesh position={[0, 0.16, 0]} geometry={JOINT_GEO}>
              <meshStandardMaterial color={suitColor} roughness={0.4} />
            </mesh>
            <RoundedBox position={[0, -0.10, 0]} args={[0.13, 0.38, 0.13]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial color={suitColor} roughness={0.55} />
            </RoundedBox>
          </group>
        </group>
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
