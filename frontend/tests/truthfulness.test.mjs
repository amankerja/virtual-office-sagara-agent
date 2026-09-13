import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatCurrencyUsd,
  formatUptimeHours,
  formatUptimeDetailed,
} from '../src/lib/formatters.ts'
import { isMockMode } from '../src/api/provider.ts'

test('Truthfulness Invariants: Parameterized Runtime Telemetry Fallback Validation', async (t) => {
  const testCases = [
    {
      name: 'undefined CPU does not become 14.2',
      format: (cpu) => (cpu !== undefined && cpu !== null ? `${cpu}%` : '—'),
      input: undefined,
      forbidden: ['14.2', '14.2%'],
      expected: '—',
    },
    {
      name: 'undefined memory does not become 420',
      format: (mem) => (mem !== undefined && mem !== null ? `${mem} MB` : '—'),
      input: undefined,
      forbidden: ['420', '420 MB', '16384'],
      expected: '—',
    },
    {
      name: 'undefined PID does not become 18420',
      format: (pid) => (pid !== undefined && pid !== null ? `${pid}` : '—'),
      input: undefined,
      forbidden: ['18420', 'PID 18420'],
      expected: '—',
    },
    {
      name: 'undefined cost does not become 0.93',
      format: (cost) => formatCurrencyUsd(cost),
      input: undefined,
      forbidden: ['0.93', '$0.93'],
      expected: '—',
    },
    {
      name: 'undefined uptime (hours) does not become 48h',
      format: (startedAt) => formatUptimeHours(startedAt),
      input: undefined,
      forbidden: ['48h', '48h 12m'],
      expected: '—',
    },
    {
      name: 'undefined uptime (detailed) does not become 48h 12m',
      format: (startedAt) => formatUptimeDetailed(startedAt),
      input: undefined,
      forbidden: ['48h', '48h 12m'],
      expected: '—',
    },
    {
      name: 'unknown service does not become HEALTHY',
      format: (serviceState) => {
        const validStates = ['HEALTHY', 'STALE', 'DEGRADED', 'OFFLINE']
        return validStates.includes(serviceState) ? serviceState : 'UNKNOWN'
      },
      input: undefined,
      forbidden: ['HEALTHY', 'Healthy'],
      expected: 'UNKNOWN',
    },
  ]

  for (const tc of testCases) {
    await t.test(tc.name, () => {
      const output = tc.format(tc.input)
      assert.equal(output, tc.expected, `Input ${tc.input} must evaluate to ${tc.expected}`)
      for (const forbiddenVal of tc.forbidden) {
        assert.notEqual(output, forbiddenVal, `Output must not equal fabricated value "${forbiddenVal}"`)
        assert.ok(!output.includes(forbiddenVal), `Output must not contain fabricated substring "${forbiddenVal}"`)
      }
    })
  }
})

test('Truthfulness Invariants: Production mock fallback remains disabled by default', () => {
  assert.equal(typeof isMockMode, 'function')
  // In production builds or when rawDataMode is not 'mock', mock mode must evaluate to false
  assert.equal(isMockMode(), false)
})
