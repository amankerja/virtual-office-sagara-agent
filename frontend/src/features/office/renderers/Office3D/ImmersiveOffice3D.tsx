import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { PerformanceMonitor } from '@react-three/drei'
import { getOfficePalette } from './systems/OfficePalette'
import { workstationPosition, isTypingTarget, type WasdKeys } from './camera/camera-navigation'
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
  Minimize2,
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

  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const keysRef = useRef<WasdKeys>({ w: false, a: false, s: false, d: false, shift: false })

  const isFullscreenSupported = typeof document !== 'undefined' && Boolean(
    document.fullscreenEnabled ??
    (document as any).webkitFullscreenEnabled ??
    (document.documentElement && ('requestFullscreen' in document.documentElement || 'webkitRequestFullscreen' in document.documentElement))
  )

  const toggleFullscreen = useCallback(async () => {
    try {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement
      if (fsEl) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        }
      } else if (containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen()
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err)
    }
  }, [])

  // Fullscreen change & window blur listeners
  useEffect(() => {
    const handleFsChange = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement
      const isFs = fsEl === containerRef.current
      setIsFullscreen(isFs)
      keysRef.current = { w: false, a: false, s: false, d: false, shift: false }
    }

    const handleWindowBlur = () => {
      keysRef.current = { w: false, a: false, s: false, d: false, shift: false }
    }

    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [])

  const followTarget = useMemo((): [number, number, number] | null => {
    if (!isFollowing || !focusedAgentId) return null
    let foundPos: [number, number, number] | null = null
    const spec = scene.desks
    spec.forEach((d, idx) => {
      if (d.agentId === focusedAgentId) {
        const [x, , z] = workstationPosition(idx)
        foundPos = [7.5 + x, 0, 5.25 + z]
      }
    })

    return foundPos
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

  useEffect(() => {
    if (focusedAgentId) {
      setRawIsFollowing(true)
    }
  }, [focusedAgentId])

  const handleExitFollow = useCallback(() => {
    setRawIsFollowing(false)
    setActivePreset({ ...CAMERA_PRESETS.overview })
  }, [])

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      // Fullscreen shortcut: Shift + F
      if (e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        void toggleFullscreen()
        return
      }

      // Fit / Overview: F (without Shift)
      if (!e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setRawIsFollowing(false)
        setActivePreset({ ...CAMERA_PRESETS.overview })
        return
      }

      // Escape: exit follow mode when not fullscreen (browser handles Esc in fullscreen)
      if (e.key === 'Escape') {
        if (!isFullscreen && isFollowing) {
          setRawIsFollowing(false)
          setActivePreset({ ...CAMERA_PRESETS.overview })
        }
        return
      }

      // WASD continuous navigation (only active when viewport is focused or in fullscreen)
      if (isFocused || isFullscreen) {
        const key = e.key.toLowerCase()
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
          keysRef.current[key] = true
          keysRef.current.shift = e.shiftKey
          // Prevent default scroll
          e.preventDefault()
        } else if (e.key === 'Shift') {
          keysRef.current.shift = true
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keysRef.current[key] = false
      }
      if (e.key === 'Shift') {
        keysRef.current.shift = false
      } else {
        keysRef.current.shift = e.shiftKey
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isFollowing, isFullscreen, isFocused, toggleFullscreen])

  const focusedAgent = useMemo(() => {
    return scene.desks.find((d) => d.agentId === focusedAgentId)?.agent
  }, [scene.desks, focusedAgentId])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="3D Virtual Office Viewport. Use WASD keys to navigate, Shift to boost speed, F to fit overview, Shift+F to toggle fullscreen."
      className={`relative select-none outline-none focus:outline-none transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0 bg-slate-950'
          : 'w-full h-165 md:h-180 rounded-xl overflow-hidden border border-border bg-slate-950'
      }`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false)
        keysRef.current = { w: false, a: false, s: false, d: false, shift: false }
      }}
      onPointerDown={() => {
        containerRef.current?.focus()
      }}
    >
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
          keysRef={keysRef}
          isNavActive={isFocused || isFullscreen}
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
            aria-label="Reset to Overview [F]"
            className="h-7 px-2 text-xs text-text-muted hover:text-text-primary gap-1 font-mono-tech"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit [F]</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            disabled={!isFullscreenSupported}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={
              !isFullscreenSupported
                ? 'Fullscreen not supported in this browser'
                : isFullscreen
                ? 'Exit Fullscreen (Esc or Shift+F)'
                : 'Fullscreen (Shift+F)'
            }
            className="h-7 px-2 text-xs text-text-muted hover:text-text-primary gap-1 font-mono-tech"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
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
        <div className="max-w-md px-3 py-1.5 rounded-md bg-surface/90 backdrop-blur-md border border-border text-[11px] text-text-secondary pointer-events-none leading-relaxed">
          <div className="hidden md:flex flex-col gap-0.5">
            <span className="font-mono-tech text-text-primary/90">
              {isFullscreen
                ? 'WASD Move · Shift Boost · Esc Exit Fullscreen'
                : 'WASD Move · Shift Boost · Drag Rotate · Right-drag Pan · Scroll Zoom · F Fit · Shift+F Fullscreen'}
            </span>
            <span className="text-[10px] text-text-muted">
              {isFocused || isFullscreen ? '● WASD navigation active' : '○ Click 3D view for keyboard navigation'}
            </span>
          </div>
          <span className="md:hidden">Touch: one finger rotate · Two fingers pan/pinch</span>
        </div>
      </div>
    </div>
  )
}

export default ImmersiveOffice3D
