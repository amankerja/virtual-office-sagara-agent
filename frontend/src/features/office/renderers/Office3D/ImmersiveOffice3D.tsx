import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { PerformanceMonitor } from '@react-three/drei'
import { getOfficePalette } from './systems/OfficePalette'
import { workstationPosition } from './camera/camera-navigation'
import type { CameraAction } from './camera/CameraController'
import { CameraController } from './camera/CameraController'
import { CAMERA_PRESETS, DEFAULT_CAMERA_PRESET } from './camera/camera-presets'
import { OfficeScene3D } from './scene/OfficeScene3D'
import { getQualityConfig, downgradeQuality, resolveRuntimeQuality } from './systems/GraphicsQuality'
import type { GraphicsQuality, ImmersiveOffice3DProps, OfficeCameraPreset } from './types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Maximize2,
  UserCheck,
  X,
  Compass,
  Layers, Plus, Minus, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
} from 'lucide-react'

// Suppress transient upstream THREE.Clock deprecation warning until R3F migrates to THREE.Timer
if (typeof window !== 'undefined') {
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('THREE.Clock: This module has been deprecated') ||
       args[0].includes('Clock: This module has been deprecated'))
    ) {
      return
    }
    originalWarn.apply(console, args)
  }
}

const OfficePostProcessing = React.lazy(() => import('./scene/OfficePostProcessing'))

export const ImmersiveOffice3D: React.FC<ImmersiveOffice3DProps> = ({
  scene,
  focusedAgentId,
  hoveredAgentId,
  quality = 'balanced',
  onSelectAgent,
  onHoverAgent,
  onSelectDelegation,
  onSelectApprovalPod,
  onSelectServerRoom,
  onSelectVault,
  isDark = true,
}) => {
  const p = getOfficePalette(isDark)
  const [ceiling, setCeiling] = useState<GraphicsQuality>('ultra')
  const [contextLost, setContextLost] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0)
  const compact = false
  const effectiveQuality = resolveRuntimeQuality(quality, ceiling, false)
  const qualityCfg = getQualityConfig(effectiveQuality)

  const [activePreset, setActivePreset] = useState<OfficeCameraPreset>(DEFAULT_CAMERA_PRESET)
  const [rawIsFollowing, setRawIsFollowing] = useState(false)
  const [cameraCommand, setCameraCommand] = useState<{ action: CameraAction; revision: number } | null>(null)

  const sendCameraCommand = useCallback((action: CameraAction) => {
    setCameraCommand({ action, revision: Date.now() })
  }, [])

  const isFollowing = rawIsFollowing && !!focusedAgentId

  const followTarget = useMemo((): [number, number, number] => {
    if (!isFollowing || !focusedAgentId) return [0, 0, 0]
    let foundPos: [number, number, number] | null = null
    const spec = scene.desks
    spec.forEach((d, idx) => {
      if (d.agentId === focusedAgentId) {
        const [x, , z] = workstationPosition(idx)
        foundPos = [7.5 + x, 0, 5.25 + z]
      }
    })

    return foundPos || [0, 0, 0]
  }, [isFollowing, focusedAgentId, scene.desks])

  const handleSelectPreset = useCallback((preset: OfficeCameraPreset) => {
    setRawIsFollowing(false)
    setActivePreset({ ...preset })
  }, [])

  const handleFollowAgent = useCallback(() => {
    if (focusedAgentId) {
      setRawIsFollowing(true)
    }
  }, [focusedAgentId])

  const handleExitFollow = useCallback(() => {
    setRawIsFollowing(false)
    setActivePreset({ ...CAMERA_PRESETS.overview })
  }, [])

  // Keyboard shortcuts: 'F' -> fit overview, 'Esc' -> exit follow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"]'))) return
      if (e.key === 'f' || e.key === 'F') {
        setRawIsFollowing(false)
        setActivePreset({ ...CAMERA_PRESETS.overview })
      } else if (e.key === 'Escape') {
        if (isFollowing) {
          setRawIsFollowing(false)
          setActivePreset({ ...CAMERA_PRESETS.overview })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFollowing])

  const focusedAgent = useMemo(() => {
    return scene.desks.find((d) => d.agentId === focusedAgentId)?.agent
  }, [scene.desks, focusedAgentId])

  return (
    <div className="relative w-full h-165 md:h-180 rounded-xl overflow-hidden border border-border bg-slate-950 select-none">
      {/* 3D WebGL Canvas Viewport */}
      <Canvas
        key={canvasKey}
        shadows={qualityCfg.shadows ? { type: THREE.PCFShadowMap } : false}
        dpr={qualityCfg.dpr}
        gl={{
          antialias: qualityCfg.antialias,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isDark ? 0.95 : 1.10,
        }}
        onCreated={({ gl }) => {
          if (qualityCfg.shadows) {
            gl.shadowMap.type = THREE.PCFShadowMap
          }
          
          const canvas = gl.domElement
          const handleLost = (event: Event) => {
            event.preventDefault()
            setContextLost(true)
          }
          const handleRestored = () => {
            setContextLost(false)
            setCanvasKey((prev) => prev + 1)
          }

          canvas.addEventListener('webglcontextlost', handleLost)
          canvas.addEventListener('webglcontextrestored', handleRestored)
        }}
        camera={{
          position: [20, 24, 20],
          fov: 40,
          near: 0.2,
          far: 120,
        }}
      >
        {/* Sky / Clear background color matching theme */}
        <color attach="background" args={[p.officeBackground]} />

        {/* Orbit Camera Controller with presets and follow-agent interpolation */}
        <CameraController
          preset={activePreset}
          followTarget={followTarget}
          command={cameraCommand}
          onUserInteraction={() => setRawIsFollowing(false)}
        />

        {/* Main 3D Scene Composition */}
        <OfficeScene3D
          scene={scene}
          focusedAgentId={focusedAgentId}
          hoveredAgentId={hoveredAgentId}
          quality={effectiveQuality}
          onSelectAgent={onSelectAgent}
          onHoverAgent={onHoverAgent}
          onSelectDelegation={onSelectDelegation}
          onSelectApprovalPod={onSelectApprovalPod}
          onSelectServerRoom={onSelectServerRoom}
          onSelectVault={onSelectVault}
          isDark={isDark}
        />
        <PerformanceMonitor key={quality} bounds={() => [40, Infinity]} ms={1000} iterations={5}
          onDecline={() => {
            if (effectiveQuality !== 'low') setCeiling(downgradeQuality(effectiveQuality))
          }} />
        {qualityCfg.postProcessing && !compact && <React.Suspense fallback={null}>
          <OfficePostProcessing />
        </React.Suspense>}
      </Canvas>

      {/* WebGL Context Lost Fallback Modal */}
      {contextLost && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center select-none">
          <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3">
            <RotateCcw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-mono-tech text-white font-semibold mb-1">WebGL Rendering Interrupted</h3>
          <p className="text-xs text-text-muted max-w-sm mb-4">
            The graphics driver or browser reallocated the WebGL context. Click below to restore the 3D office view.
          </p>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setContextLost(false)
              setCanvasKey((k) => k + 1)
            }}
            className="bg-interactive hover:bg-interactive-hover text-white font-mono-tech text-xs"
          >
            Restore 3D View
          </Button>
        </div>
      )}

      {/* TOP FLOATING OVERLAY: Camera Presets & Follow Controls */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Camera Presets */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-surface/85 backdrop-blur-md border border-border shadow-sm pointer-events-auto">
          <div className="flex items-center gap-1 px-2 text-[11px] font-mono-tech text-text-muted font-medium">
            <Compass className="w-3.5 h-3.5 text-interactive" />
            <span className="hidden sm:inline">Camera:</span>
          </div>

          {Object.values(CAMERA_PRESETS).map((preset) => {
            const isActive = !isFollowing && activePreset.id === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 text-[11px] font-mono-tech rounded transition-all ${
                  isActive
                    ? 'bg-interactive text-white font-semibold shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Right: Follow Agent & Fit Shortcut */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface/85 backdrop-blur-md border border-border shadow-sm pointer-events-auto">
          {focusedAgent && (
            <>
              {isFollowing ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleExitFollow}
                  className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-mono-tech px-2.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit Follow (Esc)</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFollowAgent}
                  className="h-7 text-xs gap-1.5 border-interactive/50 text-interactive hover:bg-interactive/10 font-mono-tech px-2.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Follow {focusedAgent.definition.name.split(' ')[0]}</span>
                </Button>
              )}
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRawIsFollowing(false)
              setActivePreset({ ...CAMERA_PRESETS.overview })
            }}
            title="Reset to Overview [F]"
            className="h-7 px-2 text-xs text-text-muted hover:text-text-primary gap-1 font-mono-tech"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit [F]</span>
          </Button>
        </div>
      </div>

      {/* BOTTOM FLOATING BADGE & CONTROLS HINT */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface/90 backdrop-blur-md border border-border text-[11px] font-mono-tech text-text-muted">
          <Layers className="w-3 h-3 text-interactive" />
          <span>3D IMMERSIVE • QUALITY: {effectiveQuality.toUpperCase()}{effectiveQuality !== quality ? ' (AUTO)' : ''}</span>
        </div>

        {focusedAgent && (
          <Badge
            variant="outline"
            className="bg-surface/90 border-interactive/40 text-interactive font-mono-tech text-[10px]"
          >
            SELECTED: {focusedAgent.definition.name} ({focusedAgent.runtime.state})
          </Badge>
        )}
      </div>

      {/* Touch-sized controls also provide a keyboard alternative to dragging. */}
      <div className="absolute bottom-12 right-3 left-3 sm:left-auto flex flex-col items-end gap-2">
        <div role="toolbar" aria-label="Office camera controls" className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-2 rounded-lg bg-surface/90 backdrop-blur-md border border-border">
          {([
            ['zoom-in', 'Zoom in', Plus], ['zoom-out', 'Zoom out', Minus],
            ['left', 'Pan left', ArrowLeft], ['right', 'Pan right', ArrowRight],
            ['up', 'Pan up', ArrowUp], ['down', 'Pan down', ArrowDown],
          ] as const).map(([action, label, Icon]) => <button key={action} type="button" aria-label={label} title={label}
            onClick={() => sendCameraCommand(action)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-text-primary hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-interactive">
            <Icon className="h-4 w-4" />
          </button>)}
          <button type="button" aria-label="Reset view" title="Reset view (F)"
            onClick={() => handleSelectPreset(CAMERA_PRESETS.overview)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-text-primary hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-interactive">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="max-w-88 px-3 py-2 rounded-md bg-surface/90 border border-border text-xs text-text-secondary pointer-events-none">
          <span className="hidden md:block">Rotate: left drag / Zoom: scroll / Pan: right drag</span>
          <span>Touch: one finger rotates / Two fingers pan or pinch</span>
        </div>
      </div>
    </div>
  )
}

export default ImmersiveOffice3D
