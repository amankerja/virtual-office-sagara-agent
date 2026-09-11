import * as THREE from 'three'
import { useOfficeQuality } from './OfficeQualityContext'
import { getGeometry, materials } from './scene-resources'
import type { MaterialProps } from './scene-resources'

export function SharedGeometry({ kind, args }: { kind: Parameters<typeof getGeometry>[0]; args: number[] }) {
  return <primitive attach="geometry" object={getGeometry(kind, args)} dispose={null} />
}

export function SharedMaterial({ kind = 'standard', ...props }: MaterialProps) {
  const quality = useOfficeQuality()
  if (quality.postProcessing && props.emissive && (props.emissiveIntensity ?? 0) >= 0.4) {
    props.emissiveIntensity = Math.max(4, (props.emissiveIntensity ?? 0) * 3.5)
    props.toneMapped = false
  }
  const key = `${kind}:${JSON.stringify(props, (_key, value) => value?.isTexture ? value.uuid : value)}`
  let material = materials.get(key)
  if (!material) {
    material = kind === 'physical' ? new THREE.MeshPhysicalMaterial(props)
      : kind === 'basic' ? new THREE.MeshBasicMaterial(props) : new THREE.MeshStandardMaterial(props)
    materials.set(key, material)
  }
  return <primitive attach="material" object={material} dispose={null} />
}
