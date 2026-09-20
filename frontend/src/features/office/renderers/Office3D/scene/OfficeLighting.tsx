import React from 'react'
import type { GraphicsQuality } from '../types'
import { getQualityConfig } from '../systems/GraphicsQuality'
import { getOfficePalette } from '../systems/OfficePalette'

interface OfficeLightingProps {
  quality?: GraphicsQuality
  isDark?: boolean
}

export const OfficeLighting: React.FC<OfficeLightingProps> = ({ quality = 'balanced', isDark = true }) => {
  const cfg = getQualityConfig(quality)
  const p = getOfficePalette(isDark)
  const size = quality === 'ultra' ? 2048 : 1024

  return (
    <group>
      {/* Warm Golden Sky / Ground Hemisphere Ambient Light */}
      <hemisphereLight args={['#fff0d6', '#8b5e3c', isDark ? 0.70 : 0.85]} />

      {/* Main Warm Sunlight Key Directional Light (Angles in through large windows) */}
      <directionalLight
        position={[18, 22, 16]}
        color="#fff0d6"
        intensity={isDark ? 2.1 : 2.4}
        castShadow={cfg.shadows}
        shadow-mapSize-width={size}
        shadow-mapSize-height={size}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.00015}
        shadow-normalBias={0.03}
        shadow-radius={5.0}
      />

      {/* Secondary Cool Architectural Fill Light (Cyan/Blue shadow fill contrast) */}
      {cfg.maxLights >= 4 && (
        <>
          <ambientLight color="#fff0d6" intensity={0.22} />
          <directionalLight position={[-16, 14, -18]} color="#93c5fd" intensity={isDark ? 0.65 : 0.80} />
        </>
      )}

      {/* Accent Point Lights */}
      {cfg.maxLights >= 6 && (
        <>
          <pointLight position={[-8.5, 5.5, -4.5]} color={p.officeAccentBlue} intensity={0.40} distance={10} decay={2} />
          <pointLight position={[9, 4.5, -4.5]} color={p.officeAccentCyan} intensity={0.35} distance={9} decay={2} />
        </>
      )}
    </group>
  )
}
