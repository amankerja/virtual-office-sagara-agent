import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export type EntityDetailType =
  | 'agent'
  | 'task'
  | 'approval'
  | 'session'
  | 'delegation'
  | 'skill'
  | 'schedule'

const ENTITY_PARAM_KEYS: EntityDetailType[] = [
  'agent',
  'task',
  'approval',
  'session',
  'delegation',
  'skill',
  'schedule',
]

export function useEntityDetailNavigation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const activeEntity = useMemo<{ type: EntityDetailType; id: string } | null>(() => {
    for (const key of ENTITY_PARAM_KEYS) {
      const val = searchParams.get(key)
      if (val) {
        return { type: key, id: val }
      }
    }
    return null
  }, [searchParams])

  const openDetail = useCallback(
    (type: EntityDetailType, id: string) => {
      const next = new URLSearchParams(searchParams)
      // Remove any currently open entity params to prevent stacking
      for (const key of ENTITY_PARAM_KEYS) {
        next.delete(key)
      }
      next.set(type, id)
      setSearchParams(next)
    },
    [searchParams, setSearchParams]
  )

  const closeDetail = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    let changed = false
    for (const key of ENTITY_PARAM_KEYS) {
      if (next.has(key)) {
        next.delete(key)
        changed = true
      }
    }
    if (changed) {
      setSearchParams(next)
    }
  }, [searchParams, setSearchParams])

  const openAgentDetail = useCallback(
    (id: string) => openDetail('agent', id),
    [openDetail]
  )

  const openTaskDetail = useCallback(
    (id: string) => openDetail('task', id),
    [openDetail]
  )

  const openApprovalDetail = useCallback(
    (id: string) => openDetail('approval', id),
    [openDetail]
  )

  const openSessionDetail = useCallback(
    (id: string) => openDetail('session', id),
    [openDetail]
  )

  const openDelegationDetail = useCallback(
    (id: string) => openDetail('delegation', id),
    [openDetail]
  )

  const openSkillDetail = useCallback(
    (id: string) => openDetail('skill', id),
    [openDetail]
  )

  const openScheduleDetail = useCallback(
    (id: string) => openDetail('schedule', id),
    [openDetail]
  )

  const navigateToProfileConfig = useCallback(
    (profileId: string, tab?: string) => {
      const params = new URLSearchParams()
      params.set('profile', profileId)
      if (tab) params.set('tab', tab)
      navigate(`/agent-config?${params.toString()}`)
    },
    [navigate]
  )

  return {
    activeEntity,
    openDetail,
    closeDetail,
    openAgentDetail,
    openTaskDetail,
    openApprovalDetail,
    openSessionDetail,
    openDelegationDetail,
    openSkillDetail,
    openScheduleDetail,
    navigateToProfileConfig,
  }
}
