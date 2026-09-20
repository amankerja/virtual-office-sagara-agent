/* oxlint-disable react/immutability -- R3F owns mutable Three.js scene/renderer objects; synchronize them in a layout effect. */
import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getOfficePalette } from '../systems/OfficePalette'
import { getRoomEnvironment, releaseRoomEnvironment } from '../systems/scene-resources'

export function ProceduralEnvironment({ isDark }: { isDark: boolean }) {
  const { scene, gl } = useThree()
  useLayoutEffect(() => {
    const previous = { environment: scene.environment, intensity: scene.environmentIntensity, fog: scene.fog }
    const restore = () => { scene.environment = getRoomEnvironment(gl) }
    restore()
    scene.environmentIntensity = isDark ? 0.38 : 0.50
    scene.fog = new THREE.FogExp2(getOfficePalette(isDark).officeFogColor, isDark ? 0.010 : 0.008)
    gl.toneMappingExposure = isDark ? 0.98 : 1.02
    const lost = () => { releaseRoomEnvironment(gl) }
    gl.domElement.addEventListener('webglcontextlost', lost)
    gl.domElement.addEventListener('webglcontextrestored', restore)
    return () => {
      scene.environment = previous.environment
      scene.environmentIntensity = previous.intensity
      scene.fog = previous.fog
      gl.domElement.removeEventListener('webglcontextlost', lost)
      gl.domElement.removeEventListener('webglcontextrestored', restore)
    }
  }, [gl, scene, isDark])
  return null
}
