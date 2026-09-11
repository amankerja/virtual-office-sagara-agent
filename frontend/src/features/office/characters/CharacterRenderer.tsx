import { memo } from 'react'
import type { CSSProperties } from 'react'
import { presentationSeed } from '../animation/behavior'
import type { AnimationQuality, CharacterOrientation, CharacterPosture, OfficeBehaviorState } from '../animation/behavior'
import type { OfficeZoneType } from '../types/office'
import { getProfileJacketColor } from '../systems/OfficeStatusColors'
import './characters.css'

export interface CharacterRendererProps {
  agentId: string
  zone?: OfficeZoneType
  isDark?: boolean
  behavior: OfficeBehaviorState
  orientation: CharacterOrientation
  reducedMotion: boolean
  quality: AnimationQuality
  posture?: CharacterPosture
  paused?: boolean
}

/** Asset boundary: replace this implementation with a project-owned Rive adapter
 * when an AgentBehavior state-machine asset exists. No unused runtime is shipped. */
export const CharacterRenderer = memo(function CharacterRenderer(props: CharacterRendererProps) {
  return <SvgRigCharacterRenderer {...props} />
})

export const SvgRigCharacterRenderer = memo(function SvgRigCharacterRenderer({
  agentId,
  zone = 'SPECIALIST',
  isDark = true,
  behavior,
  orientation,
  reducedMotion,
  quality,
  posture = 'SEATED',
  paused = false,
}: CharacterRendererProps) {
  const seed = presentationSeed(agentId)
  const skin = ['#d5a37c', '#a46e4e', '#edc4a4', '#784c37', '#bc8661'][seed % 5]
  const jacket = getProfileJacketColor(zone, isDark, (seed >>> 4) % 3)
  const hair = ['#322b28', '#554238', '#292c32', '#7b6250'][(seed >>> 8) % 4]
  const isNorth = orientation.startsWith('NORTH')
  const mirror = orientation.endsWith('WEST') ? -1 : 1
  const standing = posture === 'STANDING' || posture === 'WALKING' || posture === 'STAND_UP'
  const seated = !standing
  const thinking = behavior === 'THINKING' || behavior === 'WAITING_APPROVAL'
  const coffee = behavior === 'BREAK_COFFEE' && posture === 'STANDING'
  const stretch = behavior === 'BREAK_STRETCH' && posture === 'STANDING'
  const reviewing = behavior === 'WORK_READING' || behavior === 'ERROR_REVIEW'
  const armLeft = stretch ? 'M -9 -31 Q -22 -52 -14 -64' : thinking ? 'M -9 -31 Q -22 -26 -1 -44' : 'M -9 -31 Q -19 -20 -10 -17'
  const armRight = stretch ? 'M 9 -31 Q 22 -52 15 -64' : coffee ? 'M 9 -31 Q 24 -26 10 -42' : behavior === 'WORK_MOUSE' ? 'M 9 -31 Q 24 -29 29 -24' : 'M 9 -31 Q 19 -20 12 -18'
  const style = { '--phase': `${-(seed % 11000) / 1000}s`, '--hand-phase': `${-(seed % 1800) / 1000}s`, '--jacket': jacket } as CSSProperties
  if (behavior === 'OFFLINE_AWAY') return null
  return (
    <g className="office-character" data-behavior={behavior} data-posture={posture} data-quality={quality}
      data-paused={paused || reducedMotion ? 'true' : 'false'} data-orientation={orientation} style={style} aria-hidden="true">
      {/* Contact Shadow on Floor */}
      <ellipse cx="0" cy="3" rx={standing ? 18 : 22} ry={standing ? 6 : 7.5} fill="#0f172a" opacity="0.18" />
      <g transform={`scale(${mirror * 1.35}, 1.35)`}>
        <g className="rig-body">
          <g className="rig-leg rig-leg-left">
            <path d={seated ? 'M -6 -17 L -15 -10 L -12 0' : 'M -6 -20 L -6 -10 L -7 0'} fill="none" stroke="#334155" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d={seated ? 'M -14 0 L -5 1' : 'M -9 0 L -2 1'} stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
          </g>
          <g className="rig-leg rig-leg-right">
            <path d={seated ? 'M 6 -17 L 15 -10 L 14 0' : 'M 6 -20 L 6 -10 L 7 0'} fill="none" stroke="#475569" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 7 0 L 16 1" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
          </g>
          <g className="rig-torso">
            <path d="M -10 -36 Q 0 -40 10 -36 L 13 -18 Q 0 -11 -13 -18 Z" fill={jacket} stroke="#1e293b" strokeWidth="0.8" />
            {/* Shirt Collar & Tie */}
            <path d="M -4 -36 L 0 -23 L 4 -36" fill="#f8fafc" />
            <path d="M -1.2 -32 L 0 -18 L 1.2 -32 Z" fill="#2563eb" opacity="0.85" />
            {seed % 3 === 0 && <path d="M 5 -30 L 10 -30" stroke="#94a3b8" strokeWidth="1.5" />}
            <rect x="-3.5" y="-44" width="7" height="9" rx="2" fill={skin} />
            <g className="rig-arm rig-arm-left">
              <path d={armLeft} fill="none" stroke={jacket} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
              <ellipse cx={stretch ? -14 : thinking ? -1 : -10} cy={stretch ? -64 : thinking ? -44 : -17} rx="3.2" ry="2.6" fill={skin} />
            </g>
            <g className="rig-arm rig-arm-right">
              <path d={armRight} fill="none" stroke={jacket} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
              <ellipse cx={stretch ? 15 : coffee ? 10 : behavior === 'WORK_MOUSE' ? 29 : 12} cy={stretch ? -64 : coffee ? -42 : behavior === 'WORK_MOUSE' ? -24 : -18} rx="3.2" ry="2.6" fill={skin} />
              {coffee && <g transform="translate(9,-46)"><path d="M 0 0 H 8 V 8 Q 4 11 0 8 Z" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" /><path d="M 8 2 Q 13 2 8 7" fill="none" stroke="#94a3b8" strokeWidth="1.4" /><path className="office-ambient" d="M 4 -2 Q 2 -7 5 -11" stroke="#cbd5e1" strokeWidth="1.2" fill="none" /></g>}
            </g>
            {reviewing && <g transform="translate(0,-21) rotate(-12)"><rect x="-10" y="-7" width="20" height="14" rx="2" fill="#f1f5f9" stroke="#64748b" /><path d="M -6 -3 H 6 M -6 1 H 4 M -6 4 H 2" stroke="#94a3b8" strokeWidth="0.9" /></g>}
            <g className="rig-head">
              <ellipse cx="0" cy="-48" rx="8.5" ry="10.5" fill={skin} stroke="#473227" strokeWidth="0.5" />
              <ellipse cx="-8" cy="-47" rx="2" ry="2.8" fill={skin} />
              <path d={seed % 2 ? 'M -9 -46 Q -12 -63 2 -60 Q 12 -59 9 -46 L 6 -52 Q 0 -54 -6 -51 Z' : 'M -9 -48 Q -11 -61 0 -61 Q 12 -60 9 -48 L 6 -56 Q -2 -53 -9 -54 Z'} fill={hair} />
              {isNorth ? <path d="M -7 -52 Q 0 -58 7 -52 L 6 -44 Q 0 -40 -6 -44 Z" fill={hair} opacity="0.7" /> : <>
                <g className="rig-eyes" fill="#1e293b"><ellipse cx="-2.5" cy="-47" rx="0.8" ry="1.1" /><ellipse cx="4.5" cy="-47" rx="0.8" ry="1.1" /></g>
                <path d="M 1 -47 L 2 -44 L 0 -44 M -1.5 -41 Q 1 -40 3.5 -41" fill="none" stroke="#784c37" strokeWidth="0.7" />
                {seed % 3 === 1 && <path d="M -6 -49 H 0 V -45 H -6 Z M 2 -49 H 8 V -45 H 2 Z M 0 -48 H 2" fill="none" stroke="#1e293b" strokeWidth="0.8" />}
              </>}
            </g>
          </g>
        </g>
      </g>
      {['WAITING_APPROVAL', 'ERROR_REVIEW', 'TROUBLESHOOTING', 'CONFIGURING', 'UNKNOWN_NEUTRAL'].includes(behavior) && <g transform="translate(24,-62)">
        <rect x="-7" y="-9" width="14" height="16" rx="4" className="fill-surface stroke-border shadow-xs" strokeWidth="1.2" />
        <text textAnchor="middle" y="3" className="fill-text-primary font-mono-tech" fontSize="11" fontWeight="800">{behavior === 'UNKNOWN_NEUTRAL' ? '?' : behavior === 'CONFIGURING' ? '⚙' : behavior === 'WAITING_APPROVAL' ? 'Ⅱ' : '!'}</text>
      </g>}
    </g>
  )
})
