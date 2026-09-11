import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * ArtifactVault3D — Premium Archive & Knowledge Store
 *
 * Improvements (Section 35):
 *   - Archive shelf units instead of simple pedestals
 *   - Digital catalog terminal
 *   - Artifact count display on screen
 *   - "Data canister" objects on shelves
 *   - Secure-room floor treatment
 *   - Zone label integrated
 */
import React, { useMemo } from 'react'
import { Text } from '@react-three/drei'
import type { OfficeVaultProjection } from '@/features/office/types/office'
import { getOfficePalette } from '../systems/OfficePalette'

interface ArtifactVault3DProps {
  vaultSummary?: OfficeVaultProjection
  position?: [number, number, number]
  onSelectVault?: () => void
  isDark?: boolean
}

export const ArtifactVault3D: React.FC<ArtifactVault3DProps> = ({
  vaultSummary,
  position = [0, 0, -8.5],
  onSelectVault,
  isDark = true,
}) => {
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const count        = vaultSummary?.totalArtifacts || 0
  const accentColor  = p.officeAccentPurple
  const shelfColor   = p.officeVaultPedestal
  const shelfDark    = p.officeVaultPedestalDark
  const floorColor = p.officeFloor



  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelectVault?.() }}
      onPointerOver={() => { if (typeof document !== 'undefined') document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { if (typeof document !== 'undefined') document.body.style.cursor = 'default' }}
    >
      {/* ── Vault Floor Inset ── */}
      <mesh position={[0, 0.022, 0]} receiveShadow>
        <SharedGeometry kind="box" args={[5.5, 0.044, 2.8]} />
        <SharedMaterial color={floorColor} roughness={0.80} metalness={0.12}  />
      </mesh>

      {/* Floor accent border */}
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <SharedGeometry kind="ring" args={[2.4, 2.5, 4]} />
        <SharedMaterial kind="basic" color={accentColor} transparent opacity={isDark ? 0.25 : 0.12}  />
      </mesh>

      {/* ── Left Archive Shelf Unit ── */}
      <group position={[-1.9, 0, 0]}>
        {/* Cabinet body */}
        <mesh position={[0, 0.82, 0]} castShadow>
          <SharedGeometry kind="box" args={[0.78, 1.64, 0.52]} />
          <SharedMaterial color={shelfDark} roughness={0.42} metalness={0.28}  />
        </mesh>
        {/* Shelf dividers */}
        {[0.38, 0.75, 1.12].map((y, i) => (
          <mesh key={i} position={[0, y, 0.012]}>
            <SharedGeometry kind="box" args={[0.74, 0.022, 0.48]} />
            <SharedMaterial color={shelfColor} roughness={0.55} metalness={0.15}  />
          </mesh>
        ))}
        {/* Data canisters on shelves */}
        {[0.24, 0.58, 0.96].map((y, si) => (
          [[-0.22, 0], [0, 0], [0.22, 0]].map(([cx], ci) => (
            <mesh key={`can-${si}-${ci}`} position={[cx, y, 0.08]}>
              <SharedGeometry kind="cylinder" args={[0.055, 0.055, 0.22, 10]} />
              <SharedMaterial color={si === 1 ? accentColor : p.officeAccentCyan}
                emissive={si === 1 ? accentColor : p.officeAccentCyan}
                emissiveIntensity={isDark ? 0.35 : 0.12}
                roughness={0.25}
               />
            </mesh>
          ))
        ))}
      </group>

      {/* ── Central Display Pedestal ── */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <SharedGeometry kind="box" args={[0.88, 1.3, 0.88]} />
          <SharedMaterial color={shelfDark} roughness={0.32} metalness={0.50}  />
        </mesh>
        {/* Pedestal rim */}
        <mesh position={[0, 1.32, 0]}>
          <SharedGeometry kind="box" args={[0.96, 0.05, 0.96]} />
          <SharedMaterial color={p.officeMetal} roughness={0.28} metalness={0.65}  />
        </mesh>
        {/* Core artifact crystal */}
        <mesh position={[0, 1.56, 0]}>
          <SharedGeometry kind="dodecahedron" args={[0.20, 0]} />
          <SharedMaterial color={accentColor}
            emissive={accentColor}
            emissiveIntensity={isDark ? 0.65 : 0.28}
            roughness={0.18}
            metalness={0.20}
           />
        </mesh>
        {/* Artifact count display on front face */}
        <mesh position={[0, 0.65, 0.45]}>
          <SharedGeometry kind="plane" args={[0.72, 0.52]} />
          <SharedMaterial color={isDark ? OFFICE_DETAIL_COLORS.vaultScreenDark : OFFICE_DETAIL_COLORS.vaultScreenLight}
            emissive={accentColor}
            emissiveIntensity={isDark ? 0.18 : 0.06}
            roughness={0.15}
           />
        </mesh>
        <Text
          position={[0, 0.78, 0.456]}
          fontSize={0.072}
          color={isDark ? OFFICE_DETAIL_COLORS.vaultLabelDark : OFFICE_DETAIL_COLORS.vaultLabelLight}
          anchorX="center"
          anchorY="middle"
        >
          ARTIFACT VAULT
        </Text>
        <Text
          position={[0, 0.65, 0.456]}
          fontSize={0.10}
          color={isDark ? OFFICE_DETAIL_COLORS.textLight : OFFICE_DETAIL_COLORS.textDark}
          anchorX="center"
          anchorY="middle"
        >
          {String(count).padStart(4, '0')}
        </Text>
        <Text
          position={[0, 0.53, 0.456]}
          fontSize={0.060}
          color={isDark ? OFFICE_DETAIL_COLORS.textDim : OFFICE_DETAIL_COLORS.textMuted}
          anchorX="center"
          anchorY="middle"
        >
          DELIVERABLES ARCHIVED
        </Text>
      </group>

      {/* ── Right Archive Shelf Unit ── */}
      <group position={[1.9, 0, 0]}>
        {/* Cabinet body */}
        <mesh position={[0, 0.82, 0]} castShadow>
          <SharedGeometry kind="box" args={[0.78, 1.64, 0.52]} />
          <SharedMaterial color={shelfDark} roughness={0.42} metalness={0.28}  />
        </mesh>
        {/* Shelf dividers */}
        {[0.38, 0.75, 1.12].map((y, i) => (
          <mesh key={i} position={[0, y, 0.012]}>
            <SharedGeometry kind="box" args={[0.74, 0.022, 0.48]} />
            <SharedMaterial color={shelfColor} roughness={0.55} metalness={0.15}  />
          </mesh>
        ))}
        {/* Data canisters */}
        {[0.24, 0.58, 0.96].map((y, si) => (
          [[-0.22, 0], [0, 0], [0.22, 0]].map(([cx], ci) => (
            <mesh key={`can-r-${si}-${ci}`} position={[cx, y, 0.08]}>
              <SharedGeometry kind="cylinder" args={[0.055, 0.055, 0.22, 10]} />
              <SharedMaterial color={si === 0 ? accentColor : p.officeAccentCyan}
                emissive={si === 0 ? accentColor : p.officeAccentCyan}
                emissiveIntensity={isDark ? 0.30 : 0.10}
                roughness={0.25}
               />
            </mesh>
          ))
        ))}
      </group>

      {/* ── Zone Label Plaque ── */}
      <group position={[0, 1.85, -1.1]}>
        <mesh>
          <SharedGeometry kind="box" args={[1.8, 0.26, 0.022]} />
          <SharedMaterial color={shelfDark} roughness={0.38} metalness={0.30}  />
        </mesh>
        <Text
          position={[0, 0.025, 0.014]}
          fontSize={0.10}
          color={isDark ? OFFICE_DETAIL_COLORS.vaultLabelDark : OFFICE_DETAIL_COLORS.vaultLabelLight}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          ARTIFACT VAULT
        </Text>
        <Text
          position={[0, -0.058, 0.014]}
          fontSize={0.065}
          color={isDark ? OFFICE_DETAIL_COLORS.textDim : OFFICE_DETAIL_COLORS.textMuted}
          anchorX="center"
          anchorY="middle"
        >
          VERIFIED DELIVERABLES
        </Text>
      </group>
    </group>
  )
}
