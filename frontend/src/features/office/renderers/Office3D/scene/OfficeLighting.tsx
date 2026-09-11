import React from 'react'
import type { GraphicsQuality } from '../types'
import { getQualityConfig } from '../systems/GraphicsQuality'
import { getOfficePalette } from '../systems/OfficePalette'
interface OfficeLightingProps { quality?: GraphicsQuality; isDark?: boolean }
export const OfficeLighting: React.FC<OfficeLightingProps> = ({ quality = 'balanced', isDark = true }) => {
  const cfg = getQualityConfig(quality)
  const p = getOfficePalette(isDark)
  const size = quality === 'ultra' ? 2048 : 1024
  return <group>
    <hemisphereLight args={[p.officeAmbientColor, p.officeFloor, isDark ? .65 : .8]} />
    <directionalLight position={[12, 28, 16]} color={p.officeAmbientColor} intensity={isDark ? 2.1 : 2.5}
      castShadow={cfg.shadows} shadow-mapSize-width={size} shadow-mapSize-height={size}
      shadow-camera-near={.5} shadow-camera-far={80}
      shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22}
      shadow-bias={-.0003} shadow-normalBias={.035} />
    {cfg.maxLights >= 4 && <>
      <ambientLight color={p.officeAmbientColor} intensity={.18} />
      <directionalLight position={[-16, 14, -18]} color={p.officeAmbientColor} intensity={isDark ? .5 : .7} />
    </>}
    {cfg.maxLights >= 6 && <>
      <pointLight position={[-8.5, 5.5, -4.5]} color={p.officeAccentBlue} intensity={.35} distance={9} decay={2} />
      <pointLight position={[9, 4.5, -4.5]} color={p.officeAccentCyan} intensity={.3} distance={8} decay={2} />
    </>}
  </group>
}
