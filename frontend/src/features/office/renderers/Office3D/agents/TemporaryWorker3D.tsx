import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { OfficeWorkerProjection } from '@/features/office/types/office'

interface TemporaryWorker3DProps {
  worker: OfficeWorkerProjection
  position: [number, number, number]
  onSelectDelegation?: (delegationId: string) => void
}

export const TemporaryWorker3D: React.FC<TemporaryWorker3DProps> = ({
  worker,
  position,
  onSelectDelegation,
}) => {
  const armRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (armRef.current && worker.state === 'RUNNING') {
      const t = clock.getElapsedTime()
      armRef.current.rotation.x = -0.3 + Math.sin(t * 12) * 0.1
    }
  })

  const isRunning = worker.state === 'RUNNING'
  const stateColor = isRunning ? '#10b981' : worker.state === 'QUEUED' ? '#f59e0b' : '#64748b'

  const displayTitle =
    worker.taskTitle.length > 16 ? `${worker.taskTitle.slice(0, 14)}...` : worker.taskTitle

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onSelectDelegation?.(worker.delegationId)
      }}
      onPointerOver={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'default'
      }}
    >
      {/* Nameplate */}
      <Billboard position={[0, 1.8, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.5, 0.45]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.8} />
        </mesh>
        <Text position={[0, 0.08, 0]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle">
          {displayTitle}
        </Text>
        <Text position={[0, -0.09, 0]} fontSize={0.09} color={stateColor} anchorX="center" anchorY="middle">
          WORKER | {worker.state}
        </Text>
      </Billboard>

      {/* Mini Desk */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.1, 0.05, 0.7]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
      {/* Mini Legs */}
      <mesh position={[-0.45, 0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color="#090d16" />
      </mesh>
      <mesh position={[0.45, 0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color="#090d16" />
      </mesh>

      {/* Mini Laptop */}
      <mesh position={[0, 0.54, -0.1]}>
        <boxGeometry args={[0.32, 0.02, 0.22]} />
        <meshStandardMaterial color="#090d16" />
      </mesh>
      <mesh position={[0, 0.64, -0.2]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.32, 0.2, 0.02]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.5} />
      </mesh>

      {/* Worker Figure */}
      {/* Head */}
      <mesh position={[0, 1.05, 0.2]} castShadow>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.75, 0.2]} castShadow>
        <boxGeometry args={[0.26, 0.35, 0.18]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      {/* Arms */}
      <mesh ref={armRef} position={[0, 0.75, 0.08]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.28, 0.08, 0.22]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  )
}
