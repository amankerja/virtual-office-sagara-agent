/**
 * OfficeScene3D — Root 3D Scene Composition
 * Wires all zone components together with shared isDark + quality props.
 */
import React, { useMemo } from 'react'
import { FurnitureInstances } from '../furniture/FurnitureInstances'
import { OfficeQualityContext } from '../systems/OfficeQualityContext'
import { getQualityConfig } from '../systems/GraphicsQuality'
import { ClusterShadows } from './ClusterShadows'
import { ProceduralEnvironment } from './ProceduralEnvironment'
import { OfficeLighting } from './OfficeLighting'
import { Environment3D } from './Environment3D'
import { CommandRoom3D } from '../zones/CommandRoom3D'
import { SpecialistZone3D } from '../zones/SpecialistZone3D'
import { ApprovalPod3D } from '../zones/ApprovalPod3D'
import { ServerRoom3D } from '../zones/ServerRoom3D'
import { ArtifactVault3D } from '../zones/ArtifactVault3D'
import { ConferenceTable3D } from '../furniture/ConferenceTable3D'
import type { OfficeSceneProjection, OfficeDeskProjection } from '@/features/office/types/office'
import type { GraphicsQuality } from '../types'

interface OfficeScene3DProps {
  scene: OfficeSceneProjection
  focusedAgentId?: string | null
  hoveredAgentId?: string | null
  quality?: GraphicsQuality
  onSelectAgent: (id: string) => void
  onHoverAgent?: (id: string | null) => void
  onSelectDelegation?: (id: string) => void
  onSelectApprovalPod?: () => void
  onSelectServerRoom?: () => void
  onSelectVault?: () => void
  isDark?: boolean
}

export const OfficeScene3D: React.FC<OfficeScene3DProps> = ({
  scene,
  focusedAgentId,
  hoveredAgentId,
  quality = 'balanced',
  onSelectAgent,
  onHoverAgent,
  onSelectDelegation,
  onSelectApprovalPod,
  onSelectServerRoom,
  onSelectVault,
  isDark = true,
}) => {
  const { commandDesk, devDesks, specialistDesks } = useMemo(() => {
    const cmd = scene.desks.find((d) => d.zone === 'COMMAND') || scene.desks[0]
    const dev: OfficeDeskProjection[] = []
    const spec: OfficeDeskProjection[] = []

    scene.desks.forEach((d) => {
      if (cmd && d.agentId === cmd.agentId) return
      if (d.zone === 'DEV_ZONE') dev.push(d)
      else spec.push(d)
    })

    return { commandDesk: cmd, devDesks: dev, specialistDesks: spec }
  }, [scene.desks])

  return (
    <OfficeQualityContext value={getQualityConfig(quality)}>
    <FurnitureInstances key={scene.desks.length} capacity={Math.max(512, scene.desks.length * 32 + 384)}>
    <group>
      <ProceduralEnvironment isDark={isDark} />
      <ClusterShadows scene={scene} />
      {/* 1. Lighting System */}
      <OfficeLighting quality={quality} isDark={isDark} />

      {/* 2. Architectural Environment */}
      <Environment3D isDark={isDark} />

      {/* 3. Command Room — North-West */}
      <CommandRoom3D
        desk={commandDesk}
        position={[-8.5, 0, -4.5]}
        isSelected={focusedAgentId === commandDesk?.agentId}
        isHovered={hoveredAgentId === commandDesk?.agentId}
        onSelectAgent={onSelectAgent}
        onHoverAgent={onHoverAgent}
        isDark={isDark}
      />

      {/* 4. Development Bay — South-West */}
      <SpecialistZone3D
        title="Development Bay"
        desks={devDesks}
        workers={scene.workers}
        originPosition={[-7.5, 0, 4.5]}
        selectedAgentId={focusedAgentId}
        hoveredAgentId={hoveredAgentId}
        onSelectAgent={onSelectAgent}
        onHoverAgent={onHoverAgent}
        onSelectDelegation={onSelectDelegation}
        isDark={isDark}
      />

      {/* 5. Specialist Pod — South-East */}
      <SpecialistZone3D
        title="Specialist Pod"
        desks={specialistDesks}
        workers={scene.workers}
        originPosition={[7.5, 0, 4.5]}
        selectedAgentId={focusedAgentId}
        hoveredAgentId={hoveredAgentId}
        onSelectAgent={onSelectAgent}
        onHoverAgent={onHoverAgent}
        onSelectDelegation={onSelectDelegation}
        isDark={isDark}
      />

      {/* 6. Approval Pod — Center-North */}
      <ApprovalPod3D
        approvalSummary={scene.approvalSummary}
        position={[0, 0, -4]}
        onSelectApprovalPod={onSelectApprovalPod}
        isDark={isDark}
      />

      {/* 7. Server Room — North-East */}
      <ServerRoom3D
        runtimeSummary={scene.runtimeSummary}
        position={[9.0, 0, -4.5]}
        onSelectServerRoom={onSelectServerRoom}
        isDark={isDark}
      />

      {/* 8. Artifact Vault — Far North-Center */}
      <ArtifactVault3D
        vaultSummary={scene.vaultSummary}
        position={[0, 0, -8.5]}
        onSelectVault={onSelectVault}
        isDark={isDark}
      />

      {/* 9. Central Collaboration Table */}
      <ConferenceTable3D position={[0, 0, 4.2]} isDark={isDark} />
    </group>
    </FurnitureInstances>
    </OfficeQualityContext>
  )
}
