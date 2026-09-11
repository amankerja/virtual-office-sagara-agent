import React, { useRef, useState, useEffect, useCallback } from 'react'
import type { OfficeSceneProjection } from '@/features/office/types/office'
import { useTheme } from '@/app/theme-provider'
import { OfficeScene } from './OfficeScene'

interface OfficeViewportProps {
  fitRevision?: number
  scene: OfficeSceneProjection
  focusedAgentId?: string | null
  hoveredAgentId?: string | null
  isDark?: boolean
  zoom: number
  onZoomChange: (zoom: number) => void
  onSelectAgent: (agentId: string) => void
  onHoverAgent?: (agentId: string | null) => void
}

export const OfficeViewport: React.FC<OfficeViewportProps> = ({
  scene,
  focusedAgentId,
  hoveredAgentId,
  isDark: propIsDark,
  zoom,
  onZoomChange,
  onSelectAgent,
  onHoverAgent,
  fitRevision = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = propIsDark ?? (resolvedTheme === 'dark')

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isPinching, setIsPinching] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [size, setSize] = useState({ width: 1400, height: 940 })

  const sceneHeight = Math.max(940, 865 + Math.ceil(scene.workers.length / 10) * 85)
  const fitScale = Math.min((size.width - 24) / 1400, (size.height - 24) / sceneHeight)
  const displayScale = fitScale * zoom

  // Measure container size
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Clamp Pan Helper — prevents user from dragging scene completely out of view
  const clampPan = useCallback(
    (targetPan: { x: number; y: number }, targetZoom: number): { x: number; y: number } => {
      const currentDisplayScale = fitScale * targetZoom
      const scaledW = 1400 * currentDisplayScale
      const scaledH = sceneHeight * currentDisplayScale

      // Keep at least 150px of the canvas inside the viewport
      const maxPanX = Math.max(80, (scaledW + size.width) / 2 - 140)
      const minPanX = -maxPanX
      const maxPanY = Math.max(80, (scaledH + size.height) / 2 - 140)
      const minPanY = -maxPanY

      return {
        x: Math.max(minPanX, Math.min(maxPanX, targetPan.x)),
        y: Math.max(minPanY, Math.min(maxPanY, targetPan.y)),
      }
    },
    [fitScale, sceneHeight, size.width, size.height]
  )

  // Fit revision trigger (e.g. from Controls "Fit" button)
  const [prevFitRevision, setPrevFitRevision] = useState(fitRevision)
  if (fitRevision !== prevFitRevision) {
    setPrevFitRevision(fitRevision)
    setPan({ x: 0, y: 0 })
  }

  // Pointer tracking references for single-finger pan & multi-touch pinch-to-zoom
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map())
  const dragStartRef = useRef<{ startX: number; startY: number; initialPanX: number; initialPanY: number }>({
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  })
  const pinchStartRef = useRef<{
    dist: number
    zoom: number
    center: { x: number; y: number }
    initialPan: { x: number; y: number }
  } | null>(null)

  const prevFocusedRef = useRef<string | null>(null)

  // Center on focused agent desk if requested
  useEffect(() => {
    if (!focusedAgentId || !containerRef.current) return
    if (prevFocusedRef.current === focusedAgentId) return
    prevFocusedRef.current = focusedAgentId

    const targetDesk = scene.desks.find((d) => d.agentId === focusedAgentId)
    if (!targetDesk) return

    const sceneCenterX = 700
    const sceneCenterY = sceneHeight / 2

    const deltaX = (sceneCenterX - targetDesk.position.x) * displayScale
    const deltaY = (sceneCenterY - targetDesk.position.y) * displayScale

    const clamped = clampPan({ x: deltaX, y: deltaY }, zoom)
    const timer = setTimeout(() => {
      setIsAnimating(true)
      setPan(clamped)
      setTimeout(() => setIsAnimating(false), 250)
    }, 10)
    return () => clearTimeout(timer)
  }, [focusedAgentId, scene.desks, displayScale, sceneHeight, clampPan, zoom])

  // Helper for zoom with focal point (zoom-to-cursor / touch center)
  const zoomAtPoint = useCallback(
    (targetZoom: number, focalPoint: { clientX: number; clientY: number }) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const clampedZoom = Math.min(1.75, Math.max(0.6, Math.round(targetZoom * 100) / 100))
      if (clampedZoom === zoom) return

      // Focal point relative to viewport center
      const offsetX = focalPoint.clientX - rect.left - rect.width / 2
      const offsetY = focalPoint.clientY - rect.top - rect.height / 2

      const scaleRatio = clampedZoom / zoom
      const newPanX = offsetX - (offsetX - pan.x) * scaleRatio
      const newPanY = offsetY - (offsetY - pan.y) * scaleRatio

      const clampedPan = clampPan({ x: newPanX, y: newPanY }, clampedZoom)
      onZoomChange(clampedZoom)
      setPan(clampedPan)
    },
    [zoom, pan, clampPan, onZoomChange]
  )

  // Pointer Events (Pan & Pinch-to-Zoom)
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | SVGElement
    // Guard against clicks on interactive elements (buttons, links, drawer triggers)
    if (
      target.closest('button') ||
      target.closest('[role="button"]') ||
      target.closest('[role="link"]') ||
      target.closest('a') ||
      target.closest('input')
    ) {
      return
    }

    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (activePointersRef.current.size === 1) {
      // Single pointer pan drag
      setIsDragging(true)
      setIsPinching(false)
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      }
      if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId)
      }
    } else if (activePointersRef.current.size === 2) {
      // Pinch-to-zoom gesture initialized
      setIsDragging(false)
      setIsPinching(true)
      const pts = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY)
      const center = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      }
      pinchStartRef.current = {
        dist,
        zoom,
        center,
        initialPan: { ...pan },
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (activePointersRef.current.size === 2 && pinchStartRef.current && containerRef.current) {
      // Two-pointer pinch-to-zoom calculation
      const pts = Array.from(activePointersRef.current.values())
      const currentDist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY)
      const pinchRatio = currentDist / pinchStartRef.current.dist
      const targetZoom = Math.min(1.75, Math.max(0.6, pinchStartRef.current.zoom * pinchRatio))

      const rect = containerRef.current.getBoundingClientRect()
      const center = pinchStartRef.current.center
      const offsetX = center.x - rect.left - rect.width / 2
      const offsetY = center.y - rect.top - rect.height / 2

      const scaleRatio = targetZoom / pinchStartRef.current.zoom
      const newPanX = offsetX - (offsetX - pinchStartRef.current.initialPan.x) * scaleRatio
      const newPanY = offsetY - (offsetY - pinchStartRef.current.initialPan.y) * scaleRatio

      const clampedPan = clampPan({ x: newPanX, y: newPanY }, targetZoom)
      onZoomChange(Math.round(targetZoom * 100) / 100)
      setPan(clampedPan)
    } else if (activePointersRef.current.size === 1 && isDragging) {
      // Single pointer drag pan
      const dx = e.clientX - dragStartRef.current.startX
      const dy = e.clientY - dragStartRef.current.startY
      const nextPan = clampPan(
        {
          x: dragStartRef.current.initialPanX + dx,
          y: dragStartRef.current.initialPanY + dy,
        },
        zoom
      )
      setPan(nextPan)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null
      setIsPinching(false)
    }
    if (activePointersRef.current.size === 0) {
      setIsDragging(false)
      if (containerRef.current) {
        try {
          containerRef.current.releasePointerCapture(e.pointerId)
        } catch {
          // ignore
        }
      }
    }
  }

  // Mouse wheel with zoom-to-cursor
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.12 : -0.12
      zoomAtPoint(zoom + delta, { clientX: e.clientX, clientY: e.clientY })
    }
  }

  // Double-click to zoom in / reset with focal point
  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | SVGElement
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('a')) {
      return
    }

    setIsAnimating(true)
    if (zoom < 1.35) {
      zoomAtPoint(Math.min(1.75, zoom + 0.4), { clientX: e.clientX, clientY: e.clientY })
    } else {
      // Reset zoom to 1.0 and center
      onZoomChange(1.0)
      setPan({ x: 0, y: 0 })
    }
    setTimeout(() => setIsAnimating(false), 250)
  }

  // Keyboard navigation shortcuts ([F] Fit, [+/-] Zoom, Arrow keys to pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against typing in input/textarea/contentEditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setIsAnimating(true)
        setPan({ x: 0, y: 0 })
        onZoomChange(1.0)
        setTimeout(() => setIsAnimating(false), 250)
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        const nextZoom = Math.min(1.75, Math.round((zoom + 0.15) * 100) / 100)
        onZoomChange(nextZoom)
        setPan((prev) => clampPan(prev, nextZoom))
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        const nextZoom = Math.max(0.6, Math.round((zoom - 0.15) * 100) / 100)
        onZoomChange(nextZoom)
        setPan((prev) => clampPan(prev, nextZoom))
      } else if (e.key === '0') {
        e.preventDefault()
        setIsAnimating(true)
        setPan({ x: 0, y: 0 })
        onZoomChange(1.0)
        setTimeout(() => setIsAnimating(false), 250)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPan((prev) => clampPan({ x: prev.x + 50, y: prev.y }, zoom))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPan((prev) => clampPan({ x: prev.x - 50, y: prev.y }, zoom))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPan((prev) => clampPan({ x: prev.x, y: prev.y + 50 }, zoom))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPan((prev) => clampPan({ x: prev.x, y: prev.y - 50 }, zoom))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoom, onZoomChange, clampPan])

  const transitionClass = isDragging || isPinching
    ? 'duration-0'
    : isAnimating
    ? 'transition-transform duration-250 ease-out'
    : 'transition-transform duration-100 ease-out'

  return (
    <div
      ref={containerRef}
      data-office-viewport
      className="relative w-full h-[60vh] min-h-90 max-h-200 bg-surface border border-border rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none focus:outline-none"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      aria-label="Interactive 2.5D Virtual Office Canvas. Use mouse drag or touch to pan, wheel or pinch to zoom."
    >
      {/* Pan & Zoom Transform Surface with Zero Latency Drag & Smooth Double-Click */}
      <div
        className={`w-full h-full flex items-center justify-center origin-center will-change-transform ${transitionClass}`}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${displayScale})`,
        }}
      >
        <div className="w-350 shrink-0">
          <OfficeScene
            scene={scene}
            focusedAgentId={focusedAgentId}
            hoveredAgentId={hoveredAgentId}
            isDark={isDark}
            onSelectAgent={onSelectAgent}
            onHoverAgent={onHoverAgent}
          />
        </div>
      </div>

      {/* Floating Canvas Navigation Hint Bar */}
      <div className="absolute bottom-3 right-3 text-[10px] font-mono-tech text-text-muted bg-surface/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-border pointer-events-none hidden sm:flex items-center gap-2">
        <span>DRAG TO PAN</span>
        <span>•</span>
        <span>PINCH / SCROLL TO ZOOM</span>
        <span>•</span>
        <span>DOUBLE-CLICK</span>
        <span>•</span>
        <span className="font-bold text-text-primary">[F] FIT</span>
      </div>
    </div>
  )
}
