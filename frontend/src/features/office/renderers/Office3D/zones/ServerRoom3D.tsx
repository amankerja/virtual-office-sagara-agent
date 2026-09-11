import { OFFICE_DETAIL_COLORS } from '../systems/OfficePalette'
import { SharedGeometry, SharedMaterial } from '../systems/SceneResources'
/**
 * ServerRoom3D — Premium Datacenter Zone
 *
 * Improvements (Sections 14, 33):
 *   - 2 rows of racks for real depth
 *   - Overhead LED light bars above each row
 *   - Terminal console at room entrance
 *   - Industrial raised floor with anti-static tile seams
 *   - Zone label panel
 *   - Health-driven visual cue on overhead bar color
 */
import React, { useMemo, useState } from 'react'
import { Text, Html } from '@react-three/drei'
import { ServerRack3D } from '../furniture/ServerRack3D'
import type { OfficeRuntimeProjection } from '@/features/office/types/office'
import { getOfficePalette } from '../systems/OfficePalette'
import { getUtilizationStatus } from '@/features/office/systems/OfficeStatusColors'

interface ServerRoom3DProps {
  runtimeSummary: OfficeRuntimeProjection
  position?: [number, number, number]
  onSelectServerRoom?: () => void
  isDark?: boolean
}

export const ServerRoom3D: React.FC<ServerRoom3DProps> = ({
  runtimeSummary,
  position = [9, 0, -5],
  onSelectServerRoom,
  isDark = true,
}) => {
  const [showTelemetry, setShowTelemetry] = useState(false)
  const p = useMemo(() => getOfficePalette(isDark), [isDark])

  const isHealthy =
    runtimeSummary.gatewayState === 'HEALTHY' ||
    runtimeSummary.health?.gateway === 'HEALTHY'

  const hw = runtimeSummary.hardwareMetrics
  const cpuPercent = hw?.cpuPercent
  const memPercent = hw?.memoryPercent
  const cpuStatus = cpuPercent !== undefined ? getUtilizationStatus(cpuPercent) : undefined
  const memStatus = memPercent !== undefined ? getUtilizationStatus(memPercent) : undefined

  const statusColor    = isHealthy ? p.officeServerLedHealthy : p.officeServerLedWarning
  const rackLightColor = cpuStatus ? cpuStatus.color : (isHealthy ? p.officeServerLedNetwork : p.officeServerLedWarning)
  const floorColor     = p.officeServerFloor

  const handleRoomClick = (e: any) => {
    e.stopPropagation()
    // Toggle in-scene telemetry HUD, and if already showing, open full runtime view
    if (showTelemetry) {
      onSelectServerRoom?.()
    } else {
      setShowTelemetry(true)
    }
  }

  return (
    <group
      position={position}
      onClick={handleRoomClick}
      onPointerOver={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'default'
      }}
    >
      {/* ── Raised Industrial Floor Slab ── */}
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <SharedGeometry kind="box" args={[6.0, 0.05, 6.0]} />
        <SharedMaterial color={floorColor} roughness={0.72} metalness={0.28}  />
      </mesh>

      {/* Anti-static floor tile seams */}
      {([-1.2, 0, 1.2] as number[]).map((x) => (
        <mesh key={`hseam-${x}`} position={[x, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <SharedGeometry kind="plane" args={[0.03, 6.0]} />
          <SharedMaterial kind="basic" color={isDark ? OFFICE_DETAIL_COLORS.serverSeamDark : OFFICE_DETAIL_COLORS.serverSeamLight} transparent opacity={0.45}  />
        </mesh>
      ))}
      {([-2.4, -1.2, 0, 1.2, 2.4] as number[]).map((z) => (
        <mesh key={`vseam-${z}`} position={[0, 0.052, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <SharedGeometry kind="plane" args={[6.0, 0.03]} />
          <SharedMaterial kind="basic" color={isDark ? OFFICE_DETAIL_COLORS.serverSeamDark : OFFICE_DETAIL_COLORS.serverSeamLight} transparent opacity={0.45}  />
        </mesh>
      ))}

      {/* ── Row A: Front Racks ── */}
      <ServerRack3D position={[-1.7, 0, -0.8]} isHealthy={isHealthy} isDark={isDark} hardwareMetrics={hw} />
      <ServerRack3D position={[-0.3, 0, -0.8]} isHealthy={isHealthy} isDark={isDark} hardwareMetrics={hw} />
      <ServerRack3D position={[1.1, 0, -0.8]}  isHealthy={isHealthy} isDark={isDark} hardwareMetrics={hw} />

      {/* Row A overhead light bar */}
      <mesh position={[-0.3, 3.0, -0.8]}>
        <SharedGeometry kind="box" args={[3.4, 0.04, 0.14]} />
        <SharedMaterial color={rackLightColor}
          emissive={rackLightColor}
          emissiveIntensity={isDark ? 0.55 : 0.20}
          roughness={0.2}
         />
      </mesh>

      {/* ── Row B: Rear Racks ── */}
      <ServerRack3D position={[-1.7, 0, -2.2]} rotationY={Math.PI} isHealthy={isHealthy} isDark={isDark} hardwareMetrics={hw} />
      <ServerRack3D position={[-0.3, 0, -2.2]} rotationY={Math.PI} isHealthy={isHealthy} isDark={isDark} hardwareMetrics={hw} />

      {/* Row B overhead light bar */}
      <mesh position={[-1.0, 3.0, -2.2]}>
        <SharedGeometry kind="box" args={[2.2, 0.04, 0.14]} />
        <SharedMaterial color={rackLightColor}
          emissive={rackLightColor}
          emissiveIntensity={isDark ? 0.45 : 0.15}
          roughness={0.2}
         />
      </mesh>

      {/* ── Telemetry Terminal Console ── */}
      <group position={[1.9, 0, -1.5]}>
        {/* Console pedestal */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <SharedGeometry kind="box" args={[0.72, 1.1, 0.52]} />
          <SharedMaterial color={p.officeServerCabinet} roughness={0.42} metalness={0.55}  />
        </mesh>
        {/* Console screen */}
        <mesh position={[0, 1.15, 0.27]} rotation={[-0.28, 0, 0]}>
          <SharedGeometry kind="box" args={[0.62, 0.42, 0.025]} />
          <SharedMaterial color={OFFICE_DETAIL_COLORS.serverBezel} roughness={0.25} metalness={0.45}  />
        </mesh>
        <mesh position={[0, 1.15, 0.285]} rotation={[-0.28, 0, 0]}>
          <SharedGeometry kind="plane" args={[0.58, 0.38]} />
          <SharedMaterial color={isDark ? OFFICE_DETAIL_COLORS.serverScreenDark : OFFICE_DETAIL_COLORS.serverScreenLight}
            emissive={p.officeAccentCyan}
            emissiveIntensity={isDark ? 0.30 : 0.12}
            roughness={0.15}
           />
        </mesh>
        {/* Console text */}
        <Text
          position={[0, 1.36, 0.295]}
          fontSize={0.056}
          color={isDark ? OFFICE_DETAIL_COLORS.serverLabelDark : OFFICE_DETAIL_COLORS.serverLabelLight}
          anchorX="center"
          anchorY="middle"
          rotation={[-0.28, 0, 0]}
          maxWidth={0.52}
        >
          {cpuPercent !== undefined
            ? `CPU ${cpuPercent}% | MEM ${memPercent ?? 0}%\n${runtimeSummary.activeSessions ?? 0} SESS / ${runtimeSummary.activeDelegations ?? 0} WRK\n${runtimeSummary.gatewayState}`
            : `${runtimeSummary.gatewayState}\n${runtimeSummary.activeSessions ?? 0} SESS / ${runtimeSummary.activeDelegations ?? 0} WRK\n(Pending Telemetry)`}
        </Text>
      </group>

      {/* ── Floating Hardware Telemetry HUD (Active on Click/Toggle) ── */}
      {showTelemetry && (
        <Html center position={[-0.3, 3.8, -1.5]} distanceFactor={14} zIndexRange={[100, 0]}>
          <div
            onClick={(e) => {
              e.stopPropagation()
              onSelectServerRoom?.()
            }}
            className="w-80 rounded-xl bg-slate-950/95 border border-blue-500/50 shadow-2xl p-4 text-slate-100 font-sans cursor-pointer select-none backdrop-blur-md transition-all hover:border-blue-400"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
                <span className="text-xs font-mono font-bold tracking-wider text-slate-200">HERMES HARDWARE TELEMETRY</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                {runtimeSummary.gatewayState}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-mono mb-3">
              Cluster: <span className="text-slate-200 font-semibold">{runtimeSummary.host}</span> ({runtimeSummary.backendId})
            </div>

            {cpuPercent !== undefined && cpuStatus && memPercent !== undefined && memStatus ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-400">CPU UTILIZATION</span>
                    <span className="font-bold" style={{ color: cpuStatus.color }}>
                      {cpuPercent}% [{cpuStatus.label}]
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(cpuPercent, 100)}%`, backgroundColor: cpuStatus.color }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-400">MEMORY UTILIZATION</span>
                    <span className="font-bold" style={{ color: memStatus.color }}>
                      {memPercent}% ({hw?.memoryUsedMb ?? 0} / {hw?.memoryTotalMb ?? 0} MB) [{memStatus.label}]
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(memPercent, 100)}%`, backgroundColor: memStatus.color }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-amber-400 text-xs font-mono">
                <div>HARDWARE TELEMETRY PENDING</div>
                <div className="text-[10px] text-slate-400 mt-1">Awaiting telemetry agent metrics stream</div>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-sky-400 hover:text-sky-300">
              <span>&gt; CLICK TO OPEN FULL /RUNTIME VIEW</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTelemetry(false)
                }}
                className="text-slate-500 hover:text-slate-300 px-1"
              >
                [close]
              </button>
            </div>
          </div>
        </Html>
      )}

      {/* ── Zone Label Plaque ── */}
      <group position={[2.2, 1.60, -3.0]}>
        <mesh>
          <SharedGeometry kind="box" args={[1.5, 0.25, 0.022]} />
          <SharedMaterial color={p.officeServerCabinet} roughness={0.40} metalness={0.35}  />
        </mesh>
        <Text
          position={[0, 0.025, 0.014]}
          fontSize={0.10}
          color={isDark ? OFFICE_DETAIL_COLORS.serverLabelDark : OFFICE_DETAIL_COLORS.serverLabelLight}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          SERVER ROOM
        </Text>
        {/* Status indicator dot and text */}
        <group position={[0, -0.065, 0.014]}>
          <mesh position={[-0.32, 0, 0]}>
            <circleGeometry args={[0.022, 12]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>
          <Text
            position={[0.04, 0, 0]}
            fontSize={0.072}
            color={statusColor}
            anchorX="center"
            anchorY="middle"
          >
            {runtimeSummary.gatewayState}
          </Text>
        </group>
      </group>
    </group>
  )
}
