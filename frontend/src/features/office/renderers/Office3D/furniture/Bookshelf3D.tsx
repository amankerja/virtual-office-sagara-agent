import React from 'react'
import { RoundedBox } from '@react-three/drei'

interface Bookshelf3DProps {
  position: [number, number, number]
  rotationY?: number
  isDark?: boolean
}

const BOOK_COLORS = [
  '#ef4444', // Crimson Red
  '#f59e0b', // Amber / Mustard
  '#14b8a6', // Teal
  '#8b5cf6', // Violet / Purple
  '#10b981', // Emerald
  '#3b82f6', // Cobalt Blue
  '#ec4899', // Coral Pink
]

export const Bookshelf3D: React.FC<Bookshelf3DProps> = ({
  position,
  rotationY = 0,
}) => {

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Wooden Outer Bookshelf Frame */}
      <RoundedBox position={[0, 1.25, 0]} args={[1.40, 2.40, 0.45]} radius={0.04} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#6d482f" roughness={0.50} metalness={0.05} />
      </RoundedBox>

      {/* Internal Back Panel */}
      <mesh position={[0, 1.25, 0.02]}>
        <boxGeometry args={[1.30, 2.30, 0.04]} />
        <meshStandardMaterial color="#4a2f19" roughness={0.70} />
      </mesh>

      {/* Shelves (3 Horizontals) */}
      {[0.65, 1.25, 1.85].map((shelfY, i) => (
        <group key={i}>
          <mesh position={[0, shelfY, 0]}>
            <boxGeometry args={[1.32, 0.06, 0.40]} />
            <meshStandardMaterial color="#8b5e3c" roughness={0.45} />
          </mesh>

          {/* Row of Colorful Books & File Folders */}
          {Array.from({ length: 9 }).map((_, idx) => {
            const color = BOOK_COLORS[(i * 9 + idx * 3) % BOOK_COLORS.length]
            const bookWidth = 0.08 + (idx % 3) * 0.02
            const bookHeight = 0.32 + (idx % 4) * 0.04
            const posX = -0.52 + idx * 0.125
            const tilt = idx === 8 ? 0.22 : 0

            return (
              <mesh
                key={idx}
                position={[posX, shelfY + bookHeight / 2 + 0.03, (idx % 2) * 0.02 - 0.04]}
                rotation={[0, 0, tilt]}
                castShadow
              >
                <boxGeometry args={[bookWidth, bookHeight, 0.28]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.12}
                  roughness={0.35}
                />
              </mesh>
            )
          })}
        </group>
      ))}
    </group>
  )
}
