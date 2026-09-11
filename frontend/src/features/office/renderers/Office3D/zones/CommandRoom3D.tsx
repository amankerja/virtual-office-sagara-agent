import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * CommandRoom3D — Premium Command Center Zone
 *
 * Improvements (Section 28):
 *   - Cinematic wall display with structured content
 *   - Proper corner plants
 *   - Command-variant desk + monitor
 *   - Decorative wall panel detail
 *   - Zone label as architectural signage
 */
import React, { useMemo } from 'react'
import { Text } from '@react-three/drei'
import { Desk3D } from '../furniture/Desk3D'
import { Chair3D } from '../furniture/Chair3D'
import { Monitor3D } from '../furniture/Monitor3D'
import { Plant3D } from '../furniture/Plant3D'
import { AgentModel3D } from '../agents/AgentModel3D'
import type { OfficeDeskProjection } from '@/features/office/types/office'
import { getOfficePalette } from '../systems/OfficePalette'

interface CommandRoom3DProps {
  desk?: OfficeDeskProjection
  position?: [number, number, number]
  isSelected?: boolean
  isHovered?: boolean
  onSelectAgent: (id: string) => void
  onHoverAgent?: (id: string | null) => void
  isDark?: boolean
}

export const CommandRoom3D: React.FC<CommandRoom3DProps> = ({
  desk,
  position = [-8, 0, -4],
  isSelected = false,
  isHovered = false,
  onSelectAgent,
  onHoverAgent,
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const floorColor = p.officeFloor
  const panelColor = p.officeMetal
  const screenColor   = isDark ? OFFICE_DETAIL_COLORS.commandScreenDark : OFFICE_DETAIL_COLORS.commandScreenLight
  const accentBlue    = p.officeAccentBlue
  const accentCyan    = p.officeAccentCyan
  const textGray      = isDark ? OFFICE_DETAIL_COLORS.textSecondary : OFFICE_DETAIL_COLORS.textMuted
  const textWhite     = isDark ? OFFICE_DETAIL_COLORS.textLight : OFFICE_DETAIL_COLORS.textDark

  return (
    <group position={position}>
      {/* ── Zone Floor Inset ── */}
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <SharedGeometry kind="plane" args={[8.5, 7.2]} />
        <SharedMaterial color={floorColor} roughness={0.80}  />
      </mesh>

      {/* Accent perimeter strip (front) */}
      <mesh position={[0, 0.022, 3.55]}>
        <SharedGeometry kind="box" args={[8.5, 0.018, 0.055]} />
        <SharedMaterial color={accentBlue}
          emissive={accentBlue}
          emissiveIntensity={isDark ? 0.25 : 0.08}
          roughness={0.3}
         />
      </mesh>
      {/* Accent perimeter strip (rear) */}
      <mesh position={[0, 0.022, -3.55]}>
        <SharedGeometry kind="box" args={[8.5, 0.018, 0.055]} />
        <SharedMaterial color={accentBlue}
          emissive={accentBlue}
          emissiveIntensity={isDark ? 0.25 : 0.08}
          roughness={0.3}
         />
      </mesh>

      {/* ── Main Wall Command Display ── */}
      <group position={[0, 2.1, -3.4]}>
        {/* Display housing / bezel */}
        <mesh castShadow>
          <SharedGeometry kind="box" args={[5.0, 2.0, 0.075]} />
          <SharedMaterial color={OFFICE_DETAIL_COLORS.commandBezel} roughness={0.25} metalness={0.60}  />
        </mesh>
        {/* Screen surface */}
        <mesh position={[0, 0, 0.040]}>
          <SharedGeometry kind="plane" args={[4.78, 1.78]} />
          <SharedMaterial color={screenColor}
            emissive={accentBlue}
            emissiveIntensity={isDark ? 0.22 : 0.08}
            roughness={0.18}
           />
        </mesh>
        {/* Screen header bar */}
        <mesh position={[0, 0.70, 0.042]}>
          <SharedGeometry kind="plane" args={[4.78, 0.30]} />
          <SharedMaterial color={isDark ? OFFICE_DETAIL_COLORS.commandHeaderDark : OFFICE_DETAIL_COLORS.commandHeaderLight}
            emissive={accentBlue}
            emissiveIntensity={isDark ? 0.18 : 0.08}
            roughness={0.2}
           />
        </mesh>
        {/* Display housing accent frame */}
        <mesh position={[0, 0, 0.041]}>
          <SharedGeometry kind="plane" args={[4.78, 0.015]} />
          <SharedMaterial kind="basic" color={accentCyan} transparent opacity={isDark ? 0.5 : 0.2}  />
        </mesh>

        {/* Text content */}
        <Text
          position={[0, 0.72, 0.055]}
          fontSize={0.20}
          color={isDark ? OFFICE_DETAIL_COLORS.brandCyan : OFFICE_DETAIL_COLORS.brandBlueLight}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.10}
        >
          SAGARA COMMAND CENTER
        </Text>
        <Text
          position={[0, 0.36, 0.055]}
          fontSize={0.13}
          color={textGray}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
        >
          ORCHESTRATION & STRATEGIC OPERATIONS
        </Text>
        <group position={[-1.4, -0.08, 0.055]}>
          <mesh position={[-1.25, 0, 0]}>
            <circleGeometry args={[0.035, 12]} />
            <meshBasicMaterial color={isDark ? OFFICE_DETAIL_COLORS.statusGreen : OFFICE_DETAIL_COLORS.foliage} />
          </mesh>
          <Text
            position={[0.08, 0, 0]}
            fontSize={0.10}
            color={isDark ? OFFICE_DETAIL_COLORS.statusGreen : OFFICE_DETAIL_COLORS.foliage}
            anchorX="center"
            anchorY="middle"
          >
            AUTONOMOUS RUNTIME ACTIVE
          </Text>
        </group>
        <Text
          position={[0.8, -0.08, 0.055]}
          fontSize={0.10}
          color={textGray}
          anchorX="center"
          anchorY="middle"
        >
          ALL SYSTEMS NOMINAL
        </Text>

        {/* Decorative display side panels */}
        <mesh position={[-2.65, 0, 0]}>
          <SharedGeometry kind="box" args={[0.12, 2.0, 0.055]} />
          <SharedMaterial color={panelColor} roughness={0.40} metalness={0.30}  />
        </mesh>
        <mesh position={[2.65, 0, 0]}>
          <SharedGeometry kind="box" args={[0.12, 2.0, 0.055]} />
          <SharedMaterial color={panelColor} roughness={0.40} metalness={0.30}  />
        </mesh>
      </group>

      {/* ── Zone Label (Architectural Signage) ── */}
      <group position={[-3.85, 1.70, -3.35]}>
        <mesh>
          <SharedGeometry kind="box" args={[1.8, 0.28, 0.025]} />
          <SharedMaterial color={panelColor} roughness={0.45} metalness={0.25}  />
        </mesh>
        <Text
          position={[0, 0, 0.015]}
          fontSize={0.115}
          color={textWhite}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          COMMAND ROOM
        </Text>
      </group>

      {/* ── Corner Plants ── */}
      <Plant3D isDark={isDark} position={[-3.8, 0, -3.2]} scale={1.2} />
      <Plant3D isDark={isDark} position={[3.8, 0, -3.2]} scale={1.0} />

      {/* ── Commander Workstation ── */}
      <group position={[0, 0, 0.5]}>
        <Desk3D
          position={[0, 0, 0]}
          variant="command"
          status={desk?.agent.runtime.state || 'IDLE'}
          isDark={isDark}
        />
        <Chair3D position={[0, 0, 1.0]} isDark={isDark} />
        <Monitor3D
          position={[0, 0.90, -0.35]}
          state={desk?.agent.runtime.state || 'IDLE'}
          variant="command"
          isDark={isDark}
        />

        {desk && (
          <AgentModel3D
            agent={desk.agent}
            zone={desk.zone ?? 'COMMAND'}
            position={[0, 0, 1.0]}
            isSelected={isSelected}
            isHovered={isHovered}
            onSelect={onSelectAgent}
            onHover={onHoverAgent}
            isDark={isDark}
          />
        )}
      </group>
    </group>
  )
}
