import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { OfficeCameraPreset } from '../types'
import { DEFAULT_CAMERA_PRESET, calculateFollowCamera, clampZoomDistance } from './camera-presets'
import { clampCameraTarget } from './camera-navigation'

export type CameraAction = 'zoom-in' | 'zoom-out' | 'left' | 'right' | 'up' | 'down'

interface CameraControllerProps {
  preset: OfficeCameraPreset
  followTarget?: [number, number, number] | null
  onUserInteraction?: () => void
  command?: { action: CameraAction; revision: number } | null
}

export const CameraController: React.FC<CameraControllerProps> = ({
  preset = DEFAULT_CAMERA_PRESET,
  followTarget,
  onUserInteraction,
  command,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()

  // Target vectors for smooth interpolation
  const desiredPos = useRef(new THREE.Vector3(...preset.position))
  const desiredTarget = useRef(new THREE.Vector3(...preset.target))
  const isReducedMotion = useRef(false)
  const transitioning = useRef(true)
  const manuallyExitedFollow = useRef(false)
  const scratch = useRef(new THREE.Vector3())

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      isReducedMotion.current = mediaQuery.matches
      const handler = (e: MediaQueryListEvent) => {
        isReducedMotion.current = e.matches
      }
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [])

  // When preset or follow target changes, update desired positions
  useEffect(() => {
    if (manuallyExitedFollow.current && !followTarget) {
      manuallyExitedFollow.current = false
      return
    }
    transitioning.current = true
    if (followTarget) {
      const { position, target } = calculateFollowCamera(followTarget)
      desiredTarget.current.set(...target)
      desiredPos.current.set(...position)
    } else {
      desiredPos.current.set(...preset.position)
      desiredTarget.current.set(...preset.target)
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = followTarget ? 38 : (preset.fov ?? 42)
      camera.updateProjectionMatrix()
    }
    // If reduced motion is requested, snap immediately
    if (isReducedMotion.current && controlsRef.current) {
      camera.position.copy(desiredPos.current)
      controlsRef.current.target.copy(desiredTarget.current)
      controlsRef.current.update()
    }
  }, [preset, followTarget, camera])

  const beginManual = () => {
    transitioning.current = false
    manuallyExitedFollow.current = Boolean(followTarget)
    onUserInteraction?.()
  }

  useEffect(() => {
    if (!command || !controlsRef.current) return
    beginManual()
    const controls = controlsRef.current
    const offset = scratch.current
    if (command.action.startsWith('zoom')) {
      offset.copy(camera.position).sub(controls.target)
      offset.setLength(clampZoomDistance(offset.length() * (command.action === 'zoom-in' ? 0.8 : 1.25)))
      camera.position.copy(controls.target).add(offset)
    } else {
      const horizontal = command.action === 'left' || command.action === 'right'
      offset.setFromMatrixColumn(camera.matrix, horizontal ? 0 : 1)
      offset.multiplyScalar(command.action === 'left' || command.action === 'down' ? -1 : 1)
      camera.position.add(offset)
      controls.target.add(offset)
    }
    clampCameraTarget(controls.target, camera.position)
    controls.update()
    // Commands are events; callback changes must not replay the last command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, camera])

  // Smooth frame loop interpolation (Rule 28)
  useFrame((_, delta) => {
    if (!controlsRef.current) return

    // Lerp factor adjusted by delta for frame-rate independence
    if (transitioning.current) {
      const factor = isReducedMotion.current ? 1 : 1 - Math.exp(-5 * delta)
      camera.position.lerp(desiredPos.current, factor)
      controlsRef.current.target.lerp(desiredTarget.current, factor)
      if (camera.position.distanceToSquared(desiredPos.current) < 0.0001 &&
          controlsRef.current.target.distanceToSquared(desiredTarget.current) < 0.0001) transitioning.current = false
      controlsRef.current.update()
    }
    clampCameraTarget(controlsRef.current.target, camera.position)
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      panSpeed={0.8}
      rotateSpeed={0.65}
      zoomSpeed={0.85}
      screenSpacePanning={true}
      zoomToCursor
      mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      minDistance={6}
      maxDistance={48}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI / 2.1}
      onStart={beginManual}
    />
  )
}
