import { workstationPosition } from '../camera/camera-navigation'
import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * SpecialistZone3D — Dev Bay & Specialist Pod
 *
 * Improvements:
 *   - Zone label signage
 *   - Floor zone accent pad
 *   - isDark passed through to all furniture + agents
 *   - Monitor variant set per zone (dev vs specialist)
 */
import React, { useMemo } from 'react'
import { Text } from '@react-three/drei'
import { Desk3D } from '../furniture/Desk3D'
import { Chair3D } from '../furniture/Chair3D'
import { Monitor3D } from '../furniture/Monitor3D'
import { Plant3D } from '../furniture/Plant3D'
import { AgentModel3D } from '../agents/AgentModel3D'
import { TemporaryWorker3D } from '../agents/TemporaryWorker3D'
import type { OfficeDeskProjection, OfficeWorkerProjection } from '@/features/office/types/office'
import { getOfficePalette } from '../systems/OfficePalette'

interface SpecialistZone3DProps {
  title: string
  desks: OfficeDeskProjection[]
  workers: OfficeWorkerProjection[]
  originPosition: [number, number, number]
  selectedAgentId?: string | null
  hoveredAgentId?: string | null
  onSelectAgent: (id: string) => void
  onHoverAgent?: (id: string | null) => void
  onSelectDelegation?: (id: string) => void
  isDark?: boolean
}

export const SpecialistZone3D: React.FC<SpecialistZone3DProps> = ({
  title,
  desks,
  workers,
  originPosition,
  selectedAgentId,
  hoveredAgentId,
  onSelectAgent,
  onHoverAgent,
  onSelectDelegation,
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const isDevZone    = title.toLowerCase().includes('dev')
  const floorColor = p.officeFloor
  const accentColor  = isDevZone ? p.officeAccentCyan : p.officeAccentPurple
  const labelColor   = isDark ? OFFICE_DETAIL_COLORS.textLight : OFFICE_DETAIL_COLORS.textDark

  return (
    <group position={originPosition}>
      {/* ── Zone Floor Pad ── */}
      {desks.length > 0 && (
        <mesh position={[0, 0.017, 1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <SharedGeometry kind="plane" args={[10.5, 11]} />
          <SharedMaterial color={floorColor} roughness={0.80}  />
        </mesh>
      )}

      {/* Zone accent strip (front edge) */}
      {desks.length > 0 && (
        <mesh position={[0, 0.022, 6.5]}>
          <SharedGeometry kind="box" args={[10.5, 0.016, 0.055]} />
          <SharedMaterial color={accentColor}
            emissive={accentColor}
            emissiveIntensity={isDark ? 0.20 : 0.06}
            roughness={0.3}
           />
        </mesh>
      )}

      {/* Zone label signage */}
      {desks.length > 0 && (
        <group position={[0, 1.60, -0.5]}>
          <mesh>
            <SharedGeometry kind="box" args={[2.2, 0.26, 0.022]} />
            <SharedMaterial color={isDark ? OFFICE_DETAIL_COLORS.signDark : OFFICE_DETAIL_COLORS.signLight}
              roughness={0.42}
              metalness={0.22}
             />
          </mesh>
          <Text
            position={[0, 0.025, 0.014]}
            fontSize={0.11}
            color={labelColor}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.10}
          >
            {title.toUpperCase()}
          </Text>
        </group>
      )}

      {/* Corner plants */}
      <Plant3D isDark={isDark} position={[-4.2, 0, 0]} scale={0.9} />
      <Plant3D isDark={isDark} position={[4.2, 0, 0]} scale={0.9} />

      {/* Workstation grid */}
      {desks.map((desk, idx) => {
        const [posX, , posZ] = workstationPosition(idx)

        const isSelected = selectedAgentId === desk.agentId
        const isHovered  = hoveredAgentId  === desk.agentId

        const agentWorkers = workers.filter((w) => w.parentAgentId === desk.agentId)

        return (
          <group key={desk.agentId} position={[posX, 0, posZ]}>
            <Desk3D
              position={[0, 0, 0]}
              variant={isDevZone ? 'standard' : 'career'}
              status={desk.agent.runtime.state}
              isDark={isDark}
            />
            <Chair3D position={[0, 0, 0.75]} isDark={isDark} />
            <Monitor3D
              position={[0, 0.90, -0.22]}
              state={desk.agent.runtime.state}
              variant={isDevZone ? 'standard' : 'career'}
              isDark={isDark}
            />
            <AgentModel3D
              agent={desk.agent}
              zone={desk.zone}
              position={[0, 0, 0.75]}
              isSelected={isSelected}
              isHovered={isHovered}
              onSelect={onSelectAgent}
              onHover={onHoverAgent}
              isDark={isDark}
            />
            {agentWorkers.map((worker, wIdx) => (
              <TemporaryWorker3D
                key={worker.id}
                worker={worker}
                position={[(wIdx + 1) * 1.65, 0, 0.5]}
                onSelectDelegation={onSelectDelegation}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}
