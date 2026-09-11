import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * ApprovalPod3D — Premium Human-in-the-Loop Review Station
 *
 * Improvements (Sections 15, 34, 45):
 *   - Restrained ambient → pending amber → critical red progression
 *   - No strobe — slow pulse only
 *   - Console has angled screen with proper screen content
 *   - Reviewer seating
 *   - Floor perimeter treatment with readable geometry
 *   - Zone label integrated
 */
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { OfficeApprovalProjection } from '@/features/office/types/office'
import { getOfficePalette } from '../systems/OfficePalette'

interface ApprovalPod3DProps {
  approvalSummary: OfficeApprovalProjection
  position?: [number, number, number]
  onSelectApprovalPod?: () => void
  isDark?: boolean
}

export const ApprovalPod3D: React.FC<ApprovalPod3DProps> = ({
  approvalSummary,
  position = [0, 0, -5],
  onSelectApprovalPod,
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const pendingCount = approvalSummary.pendingCount || 0
  const hasCritical  = (approvalSummary.byRisk?.critical || 0) > 0
  const hasHigh      = (approvalSummary.byRisk?.high || 0) > 0

  // Restrained color progression (Section 15)
  const beaconColor = hasCritical
    ? p.officeAccentRed
    : hasHigh
    ? p.officeAccentAmber
    : pendingCount > 0
    ? OFFICE_DETAIL_COLORS.statusBlue
    : p.officeAccentGreen

  // Animation refs — no new objects created per frame
  const beaconRef = useRef<THREE.Mesh>(null)
  const ringRef   = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (beaconRef.current && pendingCount > 0) {
      // Slow, calm pulse — not alarming
      const pulse = 1 + Math.sin(t * 1.8) * 0.08
      beaconRef.current.scale.set(pulse, pulse, pulse)
    }
    if (ringRef.current && pendingCount > 0) {
      // Very slow ring rotation — 0.4 rad/s
      ringRef.current.rotation.z = t * 0.4
    }
  })

  const floorColor = p.officeFloor
  const consoleColor = p.officeApprovalConsole
  const screenColor  = isDark ? OFFICE_DETAIL_COLORS.approvalScreenDark : OFFICE_DETAIL_COLORS.approvalScreenLight

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelectApprovalPod?.() }}
      onPointerOver={() => { if (typeof document !== 'undefined') document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { if (typeof document !== 'undefined') document.body.style.cursor = 'default' }}
    >
      {/* ── Pod Floor Base (raised disk) ── */}
      <mesh position={[0, 0.022, 0]} receiveShadow>
        <SharedGeometry kind="cylinder" args={[2.4, 2.5, 0.044, 40]} />
        <SharedMaterial color={floorColor} roughness={0.72} metalness={0.08}  />
      </mesh>

      {/* ── Outer Ring (glowing perimeter) ── */}
      <mesh ref={ringRef} position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <SharedGeometry kind="ring" args={[2.20, 2.34, 48]} />
        <SharedMaterial kind="basic" color={beaconColor}
          transparent
          opacity={pendingCount > 0 ? 0.70 : 0.30}
         />
      </mesh>

      {/* ── Secondary inner accent ring ── */}
      <mesh position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <SharedGeometry kind="ring" args={[1.80, 1.86, 40]} />
        <SharedMaterial kind="basic" color={p.officeAccentBlue}
          transparent
          opacity={isDark ? 0.25 : 0.12}
         />
      </mesh>

      {/* ── Central Review Console ── */}
      {/* Pedestal base */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <SharedGeometry kind="cylinder" args={[0.52, 0.68, 1.3, 18]} />
        <SharedMaterial color={consoleColor} roughness={0.38} metalness={0.50}  />
      </mesh>
      {/* Pedestal rim */}
      <mesh position={[0, 1.32, 0]}>
        <SharedGeometry kind="cylinder" args={[0.58, 0.56, 0.06, 18]} />
        <SharedMaterial color={p.officeMetal} roughness={0.28} metalness={0.65}  />
      </mesh>

      {/* Console angled screen housing */}
      <mesh position={[0, 1.30, -0.20]} rotation={[-0.42, 0, 0]} castShadow>
        <SharedGeometry kind="box" args={[0.82, 0.065, 0.56]} />
        <SharedMaterial color={OFFICE_DETAIL_COLORS.consoleBezel} roughness={0.25} metalness={0.55}  />
      </mesh>
      {/* Console screen surface */}
      <mesh position={[0, 1.365, -0.19]} rotation={[-0.42, 0, 0]}>
        <SharedGeometry kind="plane" args={[0.74, 0.48]} />
        <SharedMaterial color={screenColor}
          emissive={beaconColor}
          emissiveIntensity={pendingCount > 0 ? 0.38 : 0.12}
          roughness={0.15}
         />
      </mesh>
      {/* Screen text */}
      <Text
        position={[0, 1.42, -0.15]}
        rotation={[-0.42, 0, 0]}
        fontSize={0.08}
        color={beaconColor}
        anchorX="center"
        anchorY="middle"
      >
        {pendingCount > 0 ? `${pendingCount} PENDING REVIEW` : 'APPROVAL GATE'}
      </Text>
      <Text
        position={[0, 1.34, -0.15]}
        rotation={[-0.42, 0, 0]}
        fontSize={0.058}
        color={isDark ? OFFICE_DETAIL_COLORS.textMuted : OFFICE_DETAIL_COLORS.textDim}
        anchorX="center"
        anchorY="middle"
      >
        HUMAN-IN-THE-LOOP
      </Text>

      {/* ── Beacon Crystal (floating above console) ── */}
      <mesh ref={beaconRef} position={[0, 1.90, 0]} castShadow>
        <SharedGeometry kind="octahedron" args={[0.22, 0]} />
        <SharedMaterial color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={pendingCount > 0 ? 0.70 : 0.25}
          roughness={0.20}
          metalness={0.15}
         />
      </mesh>

      {/* ── Reviewer Chair (human-in-the-loop symbolism) ── */}
      <group position={[0, 0, 1.4]} rotation={[0, Math.PI, 0]}>
        {/* Seat */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <SharedGeometry kind="box" args={[0.58, 0.07, 0.52]} />
          <SharedMaterial color={p.officeChairCushion} roughness={0.80}  />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.88, 0.22]} rotation={[-0.08, 0, 0]} castShadow>
          <SharedGeometry kind="box" args={[0.50, 0.62, 0.05]} />
          <SharedMaterial color={p.officeChairCushion} roughness={0.80}  />
        </mesh>
        {/* Column */}
        <mesh position={[0, 0.28, 0]}>
          <SharedGeometry kind="cylinder" args={[0.038, 0.048, 0.44, 10]} />
          <SharedMaterial color={p.officeChairFrame} roughness={0.22} metalness={0.78}  />
        </mesh>
        {/* Base */}
        <mesh position={[0, 0.055, 0]}>
          <SharedGeometry kind="cylinder" args={[0.30, 0.35, 0.045, 5]} />
          <SharedMaterial color={p.officeChairFrame} roughness={0.28} metalness={0.65}  />
        </mesh>
      </group>

      {/* ── Zone Label ── */}
      <group position={[-1.8, 1.55, -2.2]}>
        <mesh>
          <SharedGeometry kind="box" args={[1.6, 0.24, 0.022]} />
          <SharedMaterial color={consoleColor} roughness={0.40} metalness={0.30}  />
        </mesh>
        <Text
          position={[0, 0.02, 0.014]}
          fontSize={0.10}
          color={isDark ? OFFICE_DETAIL_COLORS.textLight : OFFICE_DETAIL_COLORS.textDark}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.10}
        >
          APPROVAL GATE
        </Text>
        <group position={[0, -0.06, 0.014]}>
          {pendingCount === 0 && (
            <mesh position={[-0.26, 0, 0]}>
              <circleGeometry args={[0.018, 12]} />
              <meshBasicMaterial color={beaconColor} />
            </mesh>
          )}
          <Text
            position={[pendingCount === 0 ? 0.03 : 0, 0, 0]}
            fontSize={0.065}
            color={beaconColor}
            anchorX="center"
            anchorY="middle"
          >
            {pendingCount > 0 ? `${pendingCount} PENDING` : 'ALL CLEAR'}
          </Text>
        </group>
      </group>
    </group>
  )
}
