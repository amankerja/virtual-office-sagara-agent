import React, { useCallback, useState, memo } from 'react'
import type { OfficeSceneProjection } from '@/features/office/types/office'
import { useTheme } from '@/app/theme-provider'
import { OfficeDefs2_5D } from './OfficeDefs2_5D'
import { OfficeZone } from './OfficeZone'
import { OfficeFloor } from './OfficeFloor'
import { CommandRoomStation } from './CommandRoomStation'
import { AgentDesk } from './AgentDesk'
import { TemporaryWorker } from './TemporaryWorker'
import { ZoneLounge } from './zone/ZoneLounge'
import { OfficeCharacterLayer } from './OfficeCharacterLayer'
import { useAnimationSettings } from '../animation/useAnimationSettings'
import type { OfficeBehaviorState } from '../animation/behavior'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'
import { ZONE_ANCHORS } from '../layout/office-zone-anchors'

interface OfficeSceneProps {
  scene: OfficeSceneProjection
  focusedAgentId?: string | null
  hoveredAgentId?: string | null
  isDark?: boolean
  onSelectAgent: (agentId: string) => void
  onHoverAgent?: (agentId: string | null) => void
}

export const OfficeScene: React.FC<OfficeSceneProps> = memo(({
  scene,
  focusedAgentId,
  hoveredAgentId,
  isDark: propIsDark,
  onSelectAgent,
  onHoverAgent,
}) => {
  const { resolvedTheme } = useTheme()
  const isDark = propIsDark ?? (resolvedTheme === 'dark')
  const palette = getOffice2_5DPalette(isDark)

  const settings = useAnimationSettings()
  const [behaviors, setBehaviors] = useState<Record<string, OfficeBehaviorState>>({})
  const onBehaviorsChange = useCallback((next: Record<string, OfficeBehaviorState>) => setBehaviors(next), [])

  const {
    zones,
    desks,
    workers,
    approvalSummary,
    runtimeSummary,
    vaultSummary,
    collaborationItems,
  } = scene

  const commandDesk = desks.find((d) => d.zone === 'COMMAND')
  const specialistDesks = desks.filter((d) => d.zone !== 'COMMAND')

  // Find any desks whose task is AWAITING_APPROVAL to render connector toward Approval Pod
  const approvalTargetPos = ZONE_ANCHORS.APPROVAL;
  const awaitingApprovalDesks = desks.filter(
    (d) => d.agent.runtime.state === 'AWAITING_APPROVAL' || d.currentTask?.state === 'AWAITING_APPROVAL'
  )

  const floorHeight = Math.max(920, 845 + Math.ceil(workers.length / 10) * 85)
  const totalHeight = Math.max(940, 865 + Math.ceil(workers.length / 10) * 85)

  return (
    <svg
      viewBox={`0 0 1400 ${totalHeight}`}
      className="w-full h-auto select-none block overflow-visible"
      data-office-quality={settings.quality}
      aria-label="Sagara Virtual Office 2.5D Operational Map"
    >
      {/* Centralized SVG <defs> with Gradients, Patterns, and Filters */}
      <OfficeDefs2_5D isDark={isDark} quality={settings.quality} reducedMotion={settings.reducedMotion} />

      {/* Continuous 2.5D Architectural Office Floor System */}
      <OfficeFloor floorHeight={floorHeight} isDark={isDark} />

      {/* Layer 1: Architectural Rooms & Low Isometric Walls */}
      <g id="office-zones">
        {zones.map((zone) => (
          <OfficeZone
            key={zone.id}
            zone={zone}
            isDark={isDark}
            runtimeSummary={runtimeSummary}
            vaultSummary={vaultSummary}
            collaborationItems={collaborationItems}
            approvalSummary={approvalSummary}
          />
        ))}
      </g>

      {/* Layer 2: Break / Lounge Area */}
      <ZoneLounge
        x={ZONE_ANCHORS.LOUNGE.x}
        y={ZONE_ANCHORS.LOUNGE.y}
        isDark={isDark}
        palette={palette}
      />

      {/* Layer 3: Operational Connectors */}
      <g id="office-connectors" className="pointer-events-none opacity-60">
        {/* Awaiting Approval Connectors (Agent Desk -> Approval Pod) */}
        {awaitingApprovalDesks.map((d) => (
          <path
            key={`conn-appr-${d.agentId}`}
            d={`M ${d.position.x} ${d.position.y} C ${d.position.x - 80} ${d.position.y + 80}, ${
              approvalTargetPos.x + 60
            } ${approvalTargetPos.y - 60}, ${approvalTargetPos.x} ${approvalTargetPos.y}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="motion-safe:animate-pulse"
          />
        ))}

        {/* Temporary Worker Links (Parent Desk -> Worker) */}
        {workers.map((w) => {
          const parent = desks.find((d) => d.agentId === w.parentAgentId)
          if (!parent) return null
          return (
            <line
              key={`conn-worker-${w.id}`}
              x1={parent.position.x}
              y1={parent.position.y}
              x2={w.position.x}
              y2={w.position.y}
              stroke={palette.brandPrimary}
              strokeWidth="1.2"
              strokeDasharray="2 2"
              opacity="0.75"
            />
          )
        })}
      </g>

      {/* Layer 5: Command Room Orchestration Desk (Top Left) */}
      <CommandRoomStation
        desk={commandDesk}
        visualBehavior={commandDesk ? behaviors[commandDesk.agentId] : undefined}
        isFocused={focusedAgentId === commandDesk?.agentId}
        isDark={isDark}
        onSelectAgent={onSelectAgent}
        onHoverAgent={onHoverAgent}
        position={ZONE_ANCHORS.COMMAND}
      />

      {/* Layer 6: Dynamic Specialist Workstations */}
      <g id="office-specialist-desks">
        {specialistDesks.map((desk) => (
          <AgentDesk
            key={desk.agentId}
            desk={desk}
            visualBehavior={behaviors[desk.agentId]}
            isFocused={focusedAgentId === desk.agentId}
            isDark={isDark}
            onSelectAgent={onSelectAgent}
            onHoverAgent={onHoverAgent}
          />
        ))}
      </g>

      {/* Layer 7: Temporary Worker Workstations */}
      <g id="office-temporary-workers">
        {workers.map((worker) => (
          <TemporaryWorker key={worker.id} worker={worker} isDark={isDark} />
        ))}
      </g>

      {/* Layer 8: Dynamic Character Rig Layer */}
      <OfficeCharacterLayer
        scene={scene}
        settings={settings}
        hoveredAgentId={hoveredAgentId}
        onSelectAgent={onSelectAgent}
        onHoverAgent={onHoverAgent}
        onBehaviorsChange={onBehaviorsChange}
      />
    </svg>
  )
})
