import React from 'react'
import { getOfficePalette } from '../systems/OfficePalette'
import { MetalBox, SatinBox, FabricBox, RubberCylinder, MetalCylinder } from './FurnitureInstances'
interface Chair3DProps { position: [number, number, number]; rotationY?: number; isDark?: boolean; color?: string }
const angles = [0, 72, 144, 216, 288].map(a => a * Math.PI / 180)
export const Chair3D: React.FC<Chair3DProps> = ({ position, rotationY = 0, isDark = true, color }) => {
  const p = getOfficePalette(isDark)
  const cushionColor = color || p.officeChairCushion
  return <group position={position} rotation={[0, rotationY, 0]}>
    <FabricBox position={[0, .52, 0]} scale={[.62, .075, .56]} color={cushionColor} />
    <SatinBox position={[0, .51, .27]} scale={[.58, .04, .06]} color={p.officeChairFrame} />
    <FabricBox position={[0, .91, .24]} rotation={[-.1, 0, 0]} scale={[.54, .70, .055]} color={cushionColor} />
    <SatinBox position={[0, .82, .264]} rotation={[-.1, 0, 0]} scale={[.34, .14, .022]} color={p.officeMetal} />
    <FabricBox position={[0, 1.295, .21]} rotation={[-.1, 0, 0]} scale={[.30, .18, .055]} color={cushionColor} />
    {[-.34, .34].map(x => <group key={x} position={[x, 0, 0]}>
      <MetalBox position={[0, .66, .04]} scale={[.05, .24, .05]} color={p.officeChairFrame} />
      <SatinBox position={[0, .78, .04]} scale={[.065, .03, .30]} color={p.officeChairFrame} />
    </group>)}
    <MetalCylinder position={[0, .28, 0]} scale={[.046, .48, .046]} color={p.officeMetal} />
    <MetalCylinder position={[0, .055, 0]} scale={[.065, .04, .065]} color={p.officeChairFrame} />
    {angles.map(angle => <group key={angle}>
      <MetalBox position={[Math.sin(angle)*.22, .055, Math.cos(angle)*.22]} rotation={[0, angle, 0]}
        scale={[.055, .04, .44]} color={p.officeChairFrame} />
      <RubberCylinder position={[Math.sin(angle)*.415, .026, Math.cos(angle)*.415]} rotation={[Math.PI/2, 0, 0]}
        scale={[.026, .048, .026]} color={p.officeChairFrame} />
    </group>)}
  </group>
}
