import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export default function OfficePostProcessing() {
  return <EffectComposer multisampling={2} enableNormalPass={false}>
    <Bloom intensity={0.12} luminanceThreshold={1} luminanceSmoothing={0.15} mipmapBlur resolutionScale={0.5} />
    {/* Composer disables renderer tone mapping; restore ACES in the effect chain. */}
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    <Vignette eskil={false} offset={0.2} darkness={0.16} />
  </EffectComposer>
}
