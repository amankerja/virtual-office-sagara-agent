import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OfficeSceneProjection } from '../types/office'
import { behaviorLabel, resolveOfficeBehavior, resolveWorkerBehavior, type OfficeBehaviorState } from '../animation/behavior'
import { meetingParticipants, stepOfficeCharacters, type AnimationSettings, type OfficeCharacterProjection } from '../animation/controller'
import { visibleBehavior } from '../animation/navigation'
import { CharacterRenderer } from '../characters/CharacterRenderer'

interface Props {
  scene: OfficeSceneProjection
  settings: AnimationSettings
  hoveredAgentId?: string | null
  onSelectAgent: (id: string) => void
  onHoverAgent?: (id: string | null) => void
  onBehaviorsChange: (behaviors: Record<string, OfficeBehaviorState>) => void
}

export function OfficeCharacterLayer({ scene, settings, hoveredAgentId, onSelectAgent, onHoverAgent, onBehaviorsChange }: Props) {
  const navigate = useNavigate()
  const layerRef = useRef<SVGGElement>(null)
  const [{ actors, elapsed }, setFrame] = useState<{ actors: OfficeCharacterProjection[]; elapsed: number }>({ actors: [], elapsed: 0 })
  const actorsRef = useRef<OfficeCharacterProjection[]>([])
  const elapsedRef = useRef(0)
  const pausedRef = useRef(new Set<string>())
  const [pausedIds, setPausedIds] = useState<Set<string>>(() => new Set())
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const inputRef = useRef({ scene, settings, hoveredAgentId, hoveredId, onBehaviorsChange })
  useEffect(() => { inputRef.current = { scene, settings, hoveredAgentId, hoveredId, onBehaviorsChange } }, [scene, settings, hoveredAgentId, hoveredId, onBehaviorsChange])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let lastSignature = ''
    const tick = (now: number) => {
      const input = inputRef.current
      const interval = input.settings.reducedMotion || input.settings.quality === 'LITE' ? 200 : input.settings.quality === 'BALANCED' ? 50 : 1000 / 30
      if (now - last >= interval) {
        const dt = Math.min((now - last) / 1000, 0.1)
        last = now
        if (!document.hidden) {
          elapsedRef.current += interval / 1000
          const paused = new Set(pausedRef.current)
          if (input.hoveredId) paused.add(input.hoveredId)
          if (input.hoveredAgentId) paused.add(`agent:${input.hoveredAgentId}`)
          const next = stepOfficeCharacters(actorsRef.current, input.scene, elapsedRef.current, dt, input.settings, paused)
          actorsRef.current = next
          setFrame({ actors: next, elapsed: elapsedRef.current })
          const behaviors = Object.fromEntries(next.filter(a => a.desk).map(a => [a.agentId, visibleBehavior(a.behavior, a.motion)]))
          const signature = JSON.stringify(behaviors)
          if (signature !== lastSignature) { lastSignature = signature; input.onBehaviorsChange(behaviors) }
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const actorIds = actors.map(a => a.id).join('|')
  useEffect(() => {
    const root = layerRef.current?.closest('[data-office-viewport]')
    if (!layerRef.current || !root || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      let changed = false
      for (const entry of entries) {
        const id = entry.target.getAttribute('data-character-id')!
        if (entry.isIntersecting) {
          if (pausedRef.current.delete(id)) changed = true
        } else {
          if (!pausedRef.current.has(id)) { pausedRef.current.add(id); changed = true }
        }
        entry.target.setAttribute('data-offscreen', String(!entry.isIntersecting))
      }
      if (changed) {
        setPausedIds(new Set(pausedRef.current))
      }
    }, { root, threshold: 0 })
    layerRef.current.querySelectorAll('[data-character-id]').forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [actorIds])

  const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).get('officeDebug') === '1'
  const meeting = meetingParticipants(scene, elapsed)
  const selectedActor = actors.find(a => a.id === hoveredId || a.agentId === hoveredAgentId && a.desk)
  const effectiveBehavior = (actor: OfficeCharacterProjection): OfficeBehaviorState => {
    // Render-time guard prevents even one stale working frame after provider changes.
    if (actor.desk) {
      const current = scene.desks.find(d => d.agentId === actor.agentId)
      if (!current) return 'OFFLINE_AWAY'
      const resolved = resolveOfficeBehavior({ agent: current.agent, task: current.currentTask, delegations: current.activeDelegations, approvals: scene.approvalSummary.items, collaborating: meeting.agents.includes(actor.agentId), elapsedSeconds: elapsed })
      return visibleBehavior(resolved === 'BREAK_COFFEE' && actor.journey !== 'VISITING' ? 'IDLE_SEATED' : resolved, actor.motion)
    }
    const record = scene.delegationRecords.find(d => d.id === actor.worker?.delegationId)
    const resolved = record && record.state !== actor.worker?.state ? resolveWorkerBehavior(record.state, record.id) : actor.behavior
    return visibleBehavior(resolved, actor.motion)
  }
  return <g ref={layerRef} id="office-character-layer" data-office-quality={settings.quality}>
    {[...actors].sort((a, b) => a.motion.position.y - b.motion.position.y).map(actor => {
      const behavior = effectiveBehavior(actor)
      const isWorker = Boolean(actor.worker)
      const name = actor.desk?.agent.definition.name ?? `Temporary worker: ${actor.worker?.taskTitle}`
      const state = actor.desk ? scene.desks.find(d => d.agentId === actor.agentId)?.agent.runtime.state : scene.delegationRecords.find(d => d.id === actor.worker?.delegationId)?.state
      if (behavior === 'OFFLINE_AWAY' || !scene.desks.some(d => d.agentId === actor.agentId)) return null
      const select = () => actor.worker ? navigate(`/runtime?tab=delegations&delegation=${encodeURIComponent(actor.worker.delegationId)}`) : onSelectAgent(actor.agentId)
      const isPaused = pausedIds.has(actor.id) || hoveredId === actor.id || hoveredAgentId === actor.agentId
      return <g key={actor.id} className="office-actor cursor-pointer" data-character-id={actor.id} data-state={state}
        data-visual-behavior={behavior} data-journey={actor.journey} data-posture={actor.motion.posture}
        data-desk-x={actor.deskPosition.x} data-desk-y={actor.deskPosition.y}
        transform={`translate(${actor.motion.position.x},${actor.motion.position.y})`}
        role="button" tabIndex={0} aria-label={`${name}. Operational state: ${state}. Visual behavior: ${behaviorLabel(behavior)} (presentation only).`}
        onClick={select} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select() } }}
        onMouseEnter={() => { setHoveredId(actor.id); if (!isWorker) onHoverAgent?.(actor.agentId) }}
        onMouseLeave={() => { setHoveredId(null); onHoverAgent?.(null) }}
        onFocus={() => { setHoveredId(actor.id); if (!isWorker) onHoverAgent?.(actor.agentId) }}
        onBlur={() => { setHoveredId(null); onHoverAgent?.(null) }}>
        <title>{name} — {state} — Visual behavior: {behaviorLabel(behavior)}</title>
        <ellipse className="office-focus-ring" cx="0" cy="1" rx="23" ry="10" stroke="#527aa5" strokeWidth="2" fill="none" />
        <rect x="-22" y="-61" width="44" height="68" fill="transparent" />
        <g transform={isWorker ? 'scale(.7)' : undefined}>
          <CharacterRenderer
            agentId={actor.worker?.delegationId ?? actor.agentId}
            zone={actor.desk?.zone ?? scene.desks.find(d => d.agentId === actor.agentId)?.zone ?? (isWorker ? 'SPECIALIST' : 'DEV_ZONE')}
            behavior={behavior}
            orientation={actor.motion.posture === 'SEATED' ? 'NORTH_EAST' : actor.motion.orientation}
            quality={settings.quality}
            reducedMotion={settings.reducedMotion}
            posture={actor.motion.posture}
            paused={isPaused}
          />
        </g>
      </g>
    })}
    {/* Tooltips and diagnostic labels are painted last, above all character rigs. */}
    {selectedActor && <foreignObject x={Math.min(1120, Math.max(20, selectedActor.motion.position.x - 125))} y={Math.max(20, selectedActor.motion.position.y - 245)} width="255" height="195" className="pointer-events-none overflow-visible">
      <div className="rounded-xl border border-border bg-surface p-3 text-xs text-text-primary shadow-md">
        <strong>{selectedActor.desk?.agent.definition.name ?? 'Temporary worker'}</strong>
        <p className="text-text-muted">{selectedActor.desk?.agent.definition.role ?? `Parent: ${selectedActor.agentId}`}</p>
        <p>Operational state: {selectedActor.desk?.agent.runtime.state ?? selectedActor.worker?.state}</p>
        <p>Current work: {selectedActor.desk?.currentTask?.title ?? selectedActor.worker?.taskTitle ?? 'No current task reported'}</p>
        <p className="mt-1 border-t border-border pt-1">Visual behavior: {behaviorLabel(effectiveBehavior(selectedActor))}</p>
        <p className="text-text-muted">Presentation only</p>
        <p>Workers: {selectedActor.desk?.activeDelegations.length ?? 'Temporary'}</p>
        <p className="text-[10px]">Last activity: {selectedActor.desk?.agent.runtime.lastActivityAt ?? selectedActor.worker?.startedAt ?? 'Unknown'}</p>
      </div>
    </foreignObject>}
    {debug && <foreignObject x="420" y="35" width="920" height="165" className="pointer-events-none">
      <div className="max-h-40 overflow-auto rounded border border-border bg-surface/95 p-2 text-[10px] font-mono text-text-primary" data-office-debug>
        <p>DEV animation inspector · {settings.quality} · Reduced motion: {String(settings.reducedMotion)} · presentation only</p>
        {actors.map(actor => <p key={actor.id}>{actor.id} | {actor.desk?.agent.runtime.state ?? actor.worker?.state} | {effectiveBehavior(actor)} | desk {actor.deskPosition.x},{actor.deskPosition.y} | character {actor.motion.position.x.toFixed(1)},{actor.motion.position.y.toFixed(1)} | {actor.motion.posture} / {actor.journey} | {pausedIds.has(actor.id) ? 'OFFSCREEN PAUSED' : 'VISIBLE'}</p>)}
      </div>
    </foreignObject>}
  </g>
}
