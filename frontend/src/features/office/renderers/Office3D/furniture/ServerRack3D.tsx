import React, { useMemo } from 'react'
import { Color } from 'three'
import { useOfficeQuality } from '../systems/OfficeQualityContext'
import { getOfficePalette } from '../systems/OfficePalette'
import { getUtilizationStatus } from '@/features/office/systems/OfficeStatusColors'
import type { HardwareMetrics } from '@/features/office/types/office'
import { MetalBox, SatinBox, Led } from './FurnitureInstances'

interface ServerRack3DProps {
  position: [number, number, number]
  rotationY?: number
  isHealthy?: boolean
  isDark?: boolean
  hardwareMetrics?: HardwareMetrics
}

const bladeYs = Array.from({ length: 12 }, (_, i) => .32 + i * .2)

export const ServerRack3D: React.FC<ServerRack3DProps> = ({
  position,
  rotationY = 0,
  isHealthy = true,
  isDark = true,
  hardwareMetrics,
}) => {
  const p = getOfficePalette(isDark)
  const utilColor = hardwareMetrics?.cpuPercent !== undefined
    ? getUtilizationStatus(hardwareMetrics.cpuPercent).color
    : undefined
  const primary = utilColor ?? (isHealthy ? p.officeServerLedHealthy : p.officeServerLedWarning)
  const quality = useOfficeQuality()
  const ledColors = useMemo(() => {
    const intensity = quality.postProcessing ? 4 : 1
    return { primary: new Color(primary).multiplyScalar(intensity), network: new Color(p.officeServerLedNetwork).multiplyScalar(intensity) }
  }, [primary, p, quality.postProcessing])
  return <group position={position} rotation={[0, rotationY, 0]}>
    <MetalBox position={[0, 1.4, 0]} scale={[1.04, 2.8, .96]} color={p.officeServerCabinet} />
    <SatinBox position={[0, 1.4, .485]} scale={[.96, 2.68, .01]} color={p.officeServerFace} />
    {bladeYs.map((y, i) => <group key={y}>
      {i % 3 === 0
        ? <MetalBox position={[0, y, .502]} scale={[.84, .055, .022]} color={p.officeMetal} />
        : <SatinBox position={[0, y, .502]} scale={[.84, .055, .022]} color={p.officeServerFace} />}
      <SatinBox position={[0, y-.028, .516]} scale={[.84, .004, .004]} color={p.officeBezel} />
      {i < 8 && <Led position={[-.36, y, .518]} scale={[.024, .024, .008]} color={ledColors.primary} />}
      {i < 6 && <Led position={[-.28, y, .518]} scale={[.024, .024, .008]} color={ledColors.network} />}
    </group>)}
    <Led position={[0, 2.83, .42]} scale={[.9, .035, .08]} color={ledColors.network} />
    {[.8, 1.1, 1.4, 1.7, 2, 2.3].map(y => <SatinBox key={y} position={[-.525, y, 0]}
      scale={[.01, .08, .72]} color={p.officeMetal} />)}
    <MetalBox position={[0, .04, 0]} scale={[1.04, .08, .96]} color={p.officeMetal} />
  </group>
}
