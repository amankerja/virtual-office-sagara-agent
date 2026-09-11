import React, { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { OfficeRuntimeProjection } from '@/features/office/types/office'
import { getOffice2_5DPalette } from '../renderers/Office2_5D/Office2_5DPalette'
import { getUtilizationStatus } from '../systems/OfficeStatusColors'

interface RuntimeRoomProps {
  summary: OfficeRuntimeProjection
  position?: { x: number; y: number }
  isDark?: boolean
}

export const RuntimeRoom: React.FC<RuntimeRoomProps> = memo(({
  summary,
  position = { x: 0, y: 0 },
  isDark = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const navigate = useNavigate()
  const { gatewayState, activeSessions, activeDelegations, host, hardwareMetrics } = summary

  const palette = getOffice2_5DPalette(isDark)

  const isHealthy = gatewayState === 'HEALTHY'
  const isDegraded = gatewayState === 'DEGRADED' || gatewayState === 'STALE'

  const cpuPercent = hardwareMetrics?.cpuPercent
  const memPercent = hardwareMetrics?.memoryPercent
  const cpuStatus = cpuPercent !== undefined ? getUtilizationStatus(cpuPercent) : undefined
  const memStatus = memPercent !== undefined ? getUtilizationStatus(memPercent) : undefined

  const handleClick = () => {
    navigate('/runtime')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      className="cursor-pointer group select-none outline-none"
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="button"
      aria-label={`Server Runtime Room: Gateway is ${gatewayState}, ${activeSessions} active sessions, ${activeDelegations} delegations`}
      onKeyDown={handleKeyDown}
    >




      {/* Perforated Cooling Vent Tiles (Grid lines) */}
      <g stroke={palette.runtimeRoom.ledBlue} strokeWidth="0.6" opacity="0.3">
        <line x1="-90" y1="-10" x2="0" y2="20" />
        <line x1="-45" y1="-25" x2="45" y2="5" />
        <line x1="0" y1="-40" x2="90" y2="-10" />
        <line x1="-45" y1="5" x2="45" y2="-25" />
      </g>

      {/* Overhead Cable Management Ladder Raceway */}
      <g stroke={palette.deskLeg} strokeWidth="1.2" opacity="0.55">
        <line x1="-80" y1="-85" x2="75" y2="-85" />
        <line x1="-80" y1="-80" x2="75" y2="-80" />
        {/* Rungs */}
        <line x1="-70" y1="-85" x2="-70" y2="-80" />
        <line x1="-45" y1="-85" x2="-45" y2="-80" />
        <line x1="-20" y1="-85" x2="-20" y2="-80" />
        <line x1="5" y1="-85" x2="5" y2="-80" />
        <line x1="30" y1="-85" x2="30" y2="-80" />
        <line x1="55" y1="-85" x2="55" y2="-80" />
      </g>

      {/* SERVER RACK 1 (Left Enterprise Rack) */}
      <g transform="translate(-80, -28)">
        {/* Top Surface (Light) */}
        <polygon points="-24,-12 0,-20 24,-12 0,-4" fill={palette.runtimeRoom.rackTop} stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        <line x1="-24" y1="-12" x2="0" y2="-20" stroke={palette.specularHighlight} strokeWidth="1" />
        {/* Left Face (Mid) */}
        <polygon points="-24,-12 0,-4 0,56 -24,48" fill={palette.runtimeRoom.rackLeft} stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        {/* Front Rack Face with Brushed Steel Finish */}
        <polygon points="0,-4 24,-12 24,48 0,56" fill="url(#office-server-face-gradient)" stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        {/* Rack Blades (1U/2U horizontal slots) */}
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={`rack1-blade-${i}`}>
            <line x1="2" y1={-1 + i * 7} x2="22" y2={-8 + i * 7} stroke={palette.runtimeRoom.bladeSeam} strokeWidth="1" />
            <circle
              cx={6}
              cy={-3 + i * 7}
              r={1.2}
              fill={isHealthy ? (i % 2 === 0 ? palette.runtimeRoom.ledGreen : palette.runtimeRoom.ledBlue) : isDegraded ? palette.runtimeRoom.ledAmber : palette.runtimeRoom.ledRed}
              className={isHealthy && i % 3 === 0 ? 'motion-safe:animate-pulse' : ''}
            />
            <circle cx={11} cy={-5 + i * 7} r={1.2} fill={isHealthy ? palette.runtimeRoom.ledGreen : palette.deskLeg} />
          </g>
        ))}
      </g>

      {/* SERVER RACK 2 (Center Core Network & Fiber Rack) */}
      <g transform="translate(-25, -48)">
        {/* Top */}
        <polygon points="-22,-11 0,-18 22,-11 0,-4" fill={palette.runtimeRoom.rackTop} stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        <line x1="-22" y1="-11" x2="0" y2="-18" stroke={palette.specularHighlight} strokeWidth="1" />
        {/* Left */}
        <polygon points="-22,-11 0,-4 0,56 -22,49" fill={palette.runtimeRoom.rackLeft} stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        {/* Front */}
        <polygon points="0,-4 22,-11 22,49 0,56" fill="url(#office-server-face-gradient)" stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        {/* Fiber Optic LEDs */}
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={`rack2-blade-${i}`}>
            <line x1="2" y1={-1 + i * 7} x2="20" y2={-8 + i * 7} stroke={palette.runtimeRoom.bladeSeam} strokeWidth="1" />
            <circle cx={5} cy={-3 + i * 7} r={1.2} fill={palette.runtimeRoom.ledBlue} className="motion-safe:animate-pulse" />
            <circle cx={10} cy={-5 + i * 7} r={1.2} fill={palette.runtimeRoom.ledBlue} />
            <circle cx={15} cy={-7 + i * 7} r={1.2} fill={isDark ? '#60a5fa' : '#0284c7'} />
          </g>
        ))}
      </g>

      {/* SERVER RACK 3 (Right GPU Compute & Storage Rack) */}
      <g transform="translate(30, -42)">
        {/* Top */}
        <polygon points="-24,-12 0,-20 24,-12 0,-4" fill={palette.runtimeRoom.rackTop} stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        <line x1="-24" y1="-12" x2="0" y2="-20" stroke={palette.specularHighlight} strokeWidth="1" />
        {/* Left */}
        <polygon points="-24,-12 0,-4 0,56 -24,48" fill={palette.runtimeRoom.rackLeft} stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        {/* Front */}
        <polygon points="0,-4 24,-12 24,48 0,56" fill="url(#office-server-face-gradient)" stroke={palette.runtimeRoom.rackStroke} strokeWidth="1" />
        {/* Activity Blinkers */}
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={`rack3-blade-${i}`}>
            <line x1="2" y1={-1 + i * 7} x2="22" y2={-8 + i * 7} stroke={palette.runtimeRoom.bladeSeam} strokeWidth="1" />
            <circle cx={6} cy={-3 + i * 7} r={1.2} fill={isHealthy ? palette.runtimeRoom.ledGreen : palette.runtimeRoom.ledAmber} />
            <circle cx={12} cy={-5 + i * 7} r={1.2} fill={isHealthy ? palette.runtimeRoom.ledGreen : palette.runtimeRoom.ledRed} className="motion-safe:animate-pulse" />
            <circle cx={18} cy={-7 + i * 7} r={1.2} fill={isHealthy ? '#059669' : palette.deskLeg} />
          </g>
        ))}
      </g>

      {/* OPERATOR DIAGNOSTIC CONSOLE DESK */}
      <g transform="translate(85, -6)">
        {/* Desk Base (3-Tone Facet Shading) */}
        <polygon points="-32,-8 0,-20 32,-8 0,4" fill={palette.runtimeRoom.consoleTop} stroke={palette.deskStroke} strokeWidth="1" />
        <polygon points="-32,-8 0,4 0,9 -32,-3" fill={palette.runtimeRoom.consoleLeft} stroke={palette.deskStroke} strokeWidth="1" />
        <polygon points="0,4 32,-8 32,-3 0,9" fill={palette.runtimeRoom.consoleRight} stroke={palette.deskStroke} strokeWidth="1" />
        {/* Support Legs */}
        <line x1="-28" y1="-3" x2="-28" y2="12" stroke={palette.deskLeg} strokeWidth="2" />
        <line x1="28" y1="-3" x2="28" y2="12" stroke={palette.deskLeg} strokeWidth="2" />
        <line x1="0" y1="9" x2="0" y2="24" stroke={palette.deskLeg} strokeWidth="2" />
        {/* Console Diagnostic Monitor */}
        <g transform="translate(0, -16)">
          <rect x="-18" y="-12" width="36" height="20" rx="2" fill={palette.screenBezel} stroke={palette.screenBezelStroke} strokeWidth="1" />
          <rect x="-16" y="-10" width="32" height="16" rx="1" fill={isDark ? '#022c22' : '#064e3b'} />
          {/* Specular gleam */}
          <polygon points="-16,-10 -4,-10 -16,2" fill="url(#office-specular-gleam)" />
          {/* Telemetry Line */}
          <line x1="-12" y1="-5" x2="10" y2="-5" stroke="#34d399" strokeWidth="0.8" />
          <line x1="-12" y1="-1" x2="6" y2="-1" stroke="#34d399" strokeWidth="0.8" />
          <line x1="-12" y1="3" x2="12" y2="3" stroke="#6ee7b7" strokeWidth="0.8" />
        </g>
        {/* Console Keyboard */}
        <polygon points="-12,-3 0,-7 12,-3 0,1" fill={palette.keyboardBase} />
        {/* Swivel Chair */}
        <ellipse cx="0" cy="18" rx="10" ry="5" fill={palette.chairCushionTop} stroke={palette.deskStroke} strokeWidth="0.8" />
      </g>



      {/* Interactive Tooltip Card on Hover / Focus */}
      {showTooltip && (
        <foreignObject x="-125" y="-280" width="250" height="195" className="overflow-visible pointer-events-none z-50">
          <div className="bg-surface border border-border rounded-xl p-3 shadow-md text-left text-xs">
            <div className="flex items-center justify-between border-b border-border pb-1 mb-1.5">
              <span className="font-semibold text-text-primary">Hermes Cluster Gateway</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tech text-text-secondary mb-1">
              <span>Status:</span>
              <span className={`font-bold uppercase ${isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                {gatewayState}
              </span>
            </div>
            <div className="text-[10px] text-text-secondary mb-1">
              <span>Active Sessions:</span> <span className="font-bold text-text-primary">{activeSessions}</span>
            </div>
            <div className="text-[10px] text-text-secondary mb-1">
              <span>Active Delegations:</span> <span className="font-bold text-text-primary">{activeDelegations}</span>
            </div>
            <div className="text-[10px] text-text-secondary mb-1">
              <span>Host / Backend:</span> <span className="font-mono-tech text-[9px]">{host}</span>
            </div>

            {/* Hardware Telemetry Section */}
            {cpuPercent !== undefined && cpuStatus && memPercent !== undefined && memStatus ? (
              <div className="mt-1.5 pt-1.5 border-t border-border space-y-1.5">
                <div>
                  <div className="flex items-center justify-between text-[9.5px] mb-0.5">
                    <span className="text-text-secondary font-mono-tech">CPU Load:</span>
                    <span className="font-bold font-mono-tech" style={{ color: cpuStatus.color }}>
                      {cpuPercent}% · {cpuStatus.label}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(cpuPercent, 100)}%`, backgroundColor: cpuStatus.color }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[9.5px] mb-0.5">
                    <span className="text-text-secondary font-mono-tech">Memory:</span>
                    <span className="font-bold font-mono-tech" style={{ color: memStatus.color }}>
                      {memPercent}% · {memStatus.label}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(memPercent, 100)}%`, backgroundColor: memStatus.color }}
                    />
                  </div>
                  {hardwareMetrics?.memoryUsedMb !== undefined && hardwareMetrics?.memoryTotalMb !== undefined && (
                    <div className="text-[8.5px] text-text-muted font-mono-tech mt-0.5 text-right">
                      {hardwareMetrics.memoryUsedMb} MB / {hardwareMetrics.memoryTotalMb} MB
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-1.5 pt-1 border-t border-border flex items-center justify-between text-[9px] text-amber-500">
                <span>Hardware Telemetry:</span>
                <span>Pending stream...</span>
              </div>
            )}

            <div className="text-[9px] text-text-muted mt-1.5 pt-1 border-t border-border-subtle">
              Click to view runtime cluster topology & logs
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
})
