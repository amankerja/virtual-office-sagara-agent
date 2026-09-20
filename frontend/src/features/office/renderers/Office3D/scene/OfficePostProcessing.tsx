import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { GraphicsQuality } from '../types'

interface OfficePostProcessingProps {
  quality?: GraphicsQuality
}

export default function OfficePostProcessing({ quality = 'balanced' }: OfficePostProcessingProps) {
  const isUltra = quality === 'ultra'

  return (
    <EffectComposer multisampling={isUltra ? 2 : 1} enableNormalPass={false}>
      {/* Bloom filter tuned per quality tier */}
      <Bloom
        intensity={isUltra ? 0.22 : 0.10}
        luminanceThreshold={isUltra ? 0.82 : 0.88}
        luminanceSmoothing={0.20}
        mipmapBlur
        resolutionScale={isUltra ? 0.75 : 0.50}
      />
      {/* ACES Filmic Tone Mapping restored in post-processing pipeline */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* Vignette depth framing */}
      <Vignette eskil={false} offset={isUltra ? 0.20 : 0.30} darkness={isUltra ? 0.22 : 0.10} />
    </EffectComposer>
  )
}
