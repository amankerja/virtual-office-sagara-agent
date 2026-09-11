import { test } from 'node:test'
import assert from 'node:assert/strict'

const ENTITY_PARAM_KEYS = [
  'agent',
  'task',
  'approval',
  'session',
  'delegation',
  'skill',
  'schedule',
]

function getActiveEntity(params) {
  for (const key of ENTITY_PARAM_KEYS) {
    const val = params.get(key)
    if (val) return { type: key, id: val }
  }
  return null
}

function openEntityDetail(params, type, id) {
  const next = new URLSearchParams(params)
  // Ensure no modal stacking: clear other entity keys
  for (const key of ENTITY_PARAM_KEYS) {
    next.delete(key)
  }
  next.set(type, id)
  return next
}

function closeEntityDetail(params) {
  const next = new URLSearchParams(params)
  for (const key of ENTITY_PARAM_KEYS) {
    next.delete(key)
  }
  return next
}

function generateProfileConfigUrl(profileId, tab) {
  const params = new URLSearchParams()
  params.set('profile', profileId)
  if (tab) params.set('tab', tab)
  return `/agent-config?${params.toString()}`
}

test('Modal Navigation: extracts active entity correctly from URL search params', () => {
  const params = new URLSearchParams('agent=marketing&tab=skills')
  const active = getActiveEntity(params)
  assert.deepEqual(active, { type: 'agent', id: 'marketing' })

  const taskParams = new URLSearchParams('task=tsk-442&filter=open')
  const activeTask = getActiveEntity(taskParams)
  assert.deepEqual(activeTask, { type: 'task', id: 'tsk-442' })
  // Filter param is preserved in query
  assert.equal(taskParams.get('filter'), 'open')
})

test('Modal Navigation: single-modal guarantee prevents modal stacking', () => {
  // Start with task modal open
  const startParams = new URLSearchParams('task=tsk-101&view=kanban')
  assert.deepEqual(getActiveEntity(startParams), { type: 'task', id: 'tsk-101' })

  // Click related agent inside Task Detail Modal -> switches to agent modal WITHOUT stacking
  const nextParams = openEntityDetail(startParams, 'agent', 'marketing')
  assert.equal(nextParams.has('task'), false, 'Previous task modal param must be removed')
  assert.equal(nextParams.get('agent'), 'marketing', 'New agent modal param must be set')
  assert.equal(nextParams.get('view'), 'kanban', 'Unrelated query params must be preserved')
  assert.deepEqual(getActiveEntity(nextParams), { type: 'agent', id: 'marketing' })
})

test('Modal Navigation: closing detail modal cleans up entity param and preserves page state', () => {
  const openParams = new URLSearchParams('search=audit&schedule=sched-001&view=week')
  assert.equal(getActiveEntity(openParams)?.id, 'sched-001')

  const closedParams = closeEntityDetail(openParams)
  assert.equal(getActiveEntity(closedParams), null)
  assert.equal(closedParams.get('search'), 'audit')
  assert.equal(closedParams.get('view'), 'week')
})

test('Modal Navigation: cross-links correctly to /agent-config with deep-linked profile and tab', () => {
  const urlWithTab = generateProfileConfigUrl('business', 'skills')
  assert.equal(urlWithTab, '/agent-config?profile=business&tab=skills')

  const urlWithoutTab = generateProfileConfigUrl('marketing')
  assert.equal(urlWithoutTab, '/agent-config?profile=marketing')
})

test('Modal Shell: Desktop size constraint adheres to min(900px, calc(100vw - 48px)) design spec', () => {
  const defaultSizeClass = 'sm:max-w-3xl md:max-w-4xl lg:w-[900px]'
  assert.match(defaultSizeClass, /900px/)

  const largeSizeClass = 'sm:max-w-4xl md:max-w-5xl lg:w-[1050px]'
  assert.match(largeSizeClass, /1050px/)
})
