import { Bezel, MetalBox, MetalCylinder } from './FurnitureInstances'
import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * Monitor3D — Premium Workstation Display
 *
 * Improvements (Sections 13, 25):
 *   - State-driven screen emissive with realistic intensities
 *   - Stand arm has proper geometry (not single box)
 *   - Screen has subtle active content lines
 *   - Bezel is slim (modern monitor proportion)
 *   - Command: 3-monitor arc — properly angled
 *   - No PointLight per monitor (emissive material only)
 */
import React, { useMemo } from 'react'
import type { AgentStatus } from '@/types/agent'
import { getOfficePalette } from '../systems/OfficePalette'

interface Monitor3DProps {
  position: [number, number, number]
  rotationY?: number
  state?: AgentStatus
  variant?: 'standard' | 'command' | 'career' | 'marketing'
  isDark?: boolean
}

// Single monitor sub-component (shared for all configs)
const MonitorUnit: React.FC<{
  offsetX?: number
  offsetY?: number
  offsetZ?: number
  angleY?: number
  screenWidth?: number
  screenHeight?: number
  screenColor: string
  screenEmissive: string
  emissiveIntensity: number
  bezelColor: string
  metalColor: string
}> = ({
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0,
  angleY = 0,
  screenWidth = 0.82,
  screenHeight = 0.48,
  screenColor,
  screenEmissive,
  emissiveIntensity,
  bezelColor,
  metalColor,
}) => {
  const SW = screenWidth
  const SH = screenHeight
  const BW = SW + 0.06
  const BH = SH + 0.05
  const screenY = 0.42

  return (
    <group position={[offsetX, offsetY, offsetZ]} rotation={[0, angleY, 0]}>
      {/* Stand base disk */}
      <MetalCylinder position={[0, 0.025, 0]} scale={[.15, .025, .15]} color={metalColor} />
      {/* Stand column — two segments for slight taper */}
      <MetalBox position={[0, .22, -.03]} scale={[.035, .38, .035]} color={metalColor} />
      {/* Stand neck bracket */}
      <mesh position={[0, 0.40, -0.01]} rotation={[-0.15, 0, 0]}>
        <SharedGeometry kind="box" args={[0.055, 0.05, 0.12]} />
        <SharedMaterial color={metalColor} roughness={0.25} metalness={0.7}  />
      </mesh>

      {/* Bezel frame */}
      <Bezel position={[0, screenY, 0]} scale={[BW/.88, BH/.53, 1]} color={bezelColor} />

      {/* Display screen */}
      <mesh position={[0, screenY, 0.016]}>
        <SharedGeometry kind="plane" args={[SW, SH]} />
        <SharedMaterial color={screenColor}
          emissive={screenEmissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.15}
          metalness={0.0}
         />
      </mesh>

      {/* Screen content lines (active only) */}
      {emissiveIntensity > 0.4 && (
        <>
          <mesh position={[0, screenY + SH * 0.22, 0.017]}>
            <SharedGeometry kind="plane" args={[SW * 0.7, 0.018]} />
            <SharedMaterial kind="basic" color={OFFICE_DETAIL_COLORS.white} transparent opacity={0.07}  />
          </mesh>
          <mesh position={[0, screenY, 0.017]}>
            <SharedGeometry kind="plane" args={[SW * 0.55, 0.014]} />
            <SharedMaterial kind="basic" color={OFFICE_DETAIL_COLORS.white} transparent opacity={0.05}  />
          </mesh>
          <mesh position={[0, screenY - SH * 0.22, 0.017]}>
            <SharedGeometry kind="plane" args={[SW * 0.45, 0.014]} />
            <SharedMaterial kind="basic" color={OFFICE_DETAIL_COLORS.white} transparent opacity={0.04}  />
          </mesh>
        </>
      )}
    </group>
  )
}

export const Monitor3D: React.FC<Monitor3DProps> = ({
  position,
  rotationY = 0,
  state = 'IDLE',
  variant = 'standard',
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  // State-driven screen color
  const { screenColor, emissive, emissiveIntensity } = useMemo(() => {
    switch (state) {
      case 'ACTIVE':
        return { screenColor: p.officeScreenActive, emissive: p.officeAccentCyan, emissiveIntensity: 0.65 }
      case 'AWAITING_APPROVAL':
        return { screenColor: p.officeScreenApproval, emissive: p.officeAccentAmber, emissiveIntensity: 0.60 }
      case 'DEGRADED':
      case 'ERROR':
        return { screenColor: p.officeScreenError, emissive: p.officeAccentRed, emissiveIntensity: 0.55 }
      case 'OFFLINE':
        return { screenColor: OFFICE_DETAIL_COLORS.screenOff, emissive: OFFICE_DETAIL_COLORS.black, emissiveIntensity: 0 }
      default:
        return { screenColor: p.officeScreenIdle, emissive: p.officeAccentCyan, emissiveIntensity: 0.18 }
    }
  }, [state, p])

  const isCommand   = variant === 'command'
  const isMarketing = variant === 'marketing'

  const monitorProps = {
    screenColor,
    screenEmissive: emissive,
    emissiveIntensity,
    bezelColor: p.officeBezel,
    metalColor: p.officeMetal,
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Primary center monitor */}
      <MonitorUnit {...monitorProps} screenWidth={isMarketing ? 1.05 : 0.82} />

      {/* Command: left angled monitor */}
      {isCommand && (
        <MonitorUnit
          {...monitorProps}
          offsetX={-0.88}
          offsetZ={0.14}
          angleY={0.38}
          screenWidth={0.72}
          screenHeight={0.44}
          screenColor={p.officeScreenActive}
          screenEmissive={p.officeAccentBlue}
          emissiveIntensity={0.55}
        />
      )}

      {/* Command: right angled monitor */}
      {isCommand && (
        <MonitorUnit
          {...monitorProps}
          offsetX={0.88}
          offsetZ={0.14}
          angleY={-0.38}
          screenWidth={0.72}
          screenHeight={0.44}
          screenColor={p.officeScreenIdle}
          screenEmissive={p.officeAccentPurple}
          emissiveIntensity={0.40}
        />
      )}
    </group>
  )
}
