import { ContactShadows } from '@react-three/drei'
import type { OfficeSceneProjection } from '@/features/office/types/office'
import { useOfficeQuality } from '../systems/OfficeQualityContext'

export function ClusterShadows({ scene }: { scene: OfficeSceneProjection }) {
  const cfg = useOfficeQuality()
  if (!cfg.contactShadows) return null
  // Bake only two frames after layout changes (first frame lets instances settle).
  // Separate clusters keep each 256px map useful without ongoing depth passes.
  const revision = scene.desks.map(d => `${d.agentId}:${d.zone}`).join('|')
  return <group key={revision}>
    {([[-8.5, -4, 8], [-7.5, 6, 11], [7.5, 6, 11], [0, 4.2, 6]] as const).map(([x, z, scale]) =>
      <ContactShadows key={`${x}:${z}`} position={[x, 0.065, z]} scale={scale}
        frames={2} opacity={0.16} blur={1.2} resolution={256} far={3} smooth={false} />)}
  </group>
}
