import React from 'react'
import { createInstances, RoundedBoxGeometry } from '@react-three/drei'
import { getGeometry } from '../systems/scene-resources'
import { SharedMaterial } from '../systems/SceneResources'

// Global batches: a chair's 20 parts and all rack blades share these draw calls.
// drei Instance preserves nested transforms and parent zone pointer callbacks.
const [MetalBoxes, MetalBox] = createInstances()
const [SatinBoxes, SatinBox] = createInstances()
const [FabricBoxes, FabricBox] = createInstances()
const [RubberCylinders, RubberCylinder] = createInstances()
const [MetalCylinders, MetalCylinder] = createInstances()
const [Bezels, Bezel] = createInstances()
const [Leds, Led] = createInstances()
export { MetalBox, SatinBox, FabricBox, RubberCylinder, MetalCylinder, Bezel, Led }

export function FurnitureInstances({ children, capacity = 2048 }: { children: React.ReactNode; capacity?: number }) {
  const common = { limit: capacity, frames: 2, frustumCulled: false, dispose: null, castShadow: true, receiveShadow: true }
  return <MetalBoxes {...common} geometry={getGeometry('box', [1, 1, 1])}>
    <SharedMaterial roughness={0.32} metalness={0.68} />
    <SatinBoxes {...common} geometry={getGeometry('box', [1, 1, 1])}>
      <SharedMaterial roughness={0.52} metalness={0.35} />
      <FabricBoxes {...common} geometry={getGeometry('box', [1, 1, 1])}>
        <SharedMaterial roughness={0.84} metalness={0.01} />
        <RubberCylinders {...common} geometry={getGeometry('cylinder', [1, 1, 1, 8])}>
          <SharedMaterial roughness={0.92} metalness={0} />
          <MetalCylinders {...common} geometry={getGeometry('cylinder', [1, 1, 1, 12])}>
            <SharedMaterial roughness={0.24} metalness={0.76} />
            <Bezels {...common}>
              <RoundedBoxGeometry args={[0.88, 0.53, 0.028]} radius={0.012} smoothness={2} bevelSegments={2} />
              <SharedMaterial roughness={0.42} metalness={0.12} />
              <Leds {...common} castShadow={false} geometry={getGeometry('box', [1, 1, 1])}>
                {/* Instance color supplies the LED hue, no per-LED light or animation. */}
                <SharedMaterial kind="basic" toneMapped={false} />
                {children}
              </Leds>
            </Bezels>
          </MetalCylinders>
        </RubberCylinders>
      </FabricBoxes>
    </SatinBoxes>
  </MetalBoxes>
}
