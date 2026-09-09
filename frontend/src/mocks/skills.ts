import type { SkillDefinition } from '@/types/skill'

export const MOCK_SKILLS: SkillDefinition[] = [
  { id: 'sk-git', name: 'git_operations', version: '1.2.0', description: 'Git repository management, branch automation, and atomic commit dispatching', status: 'HEALTHY', category: 'Version Control', provider: 'builtin', invocationsCount: 1420 },
  { id: 'sk-code', name: 'ast_analyzer', version: '2.0.1', description: 'TypeScript and Python AST tree parser and semantic code indexing', status: 'HEALTHY', category: 'Code Intelligence', provider: 'builtin', invocationsCount: 980 },
  { id: 'sk-lint', name: 'oxlint_runner', version: '1.0.0', description: 'High-speed Rust-based JavaScript and TypeScript code linter', status: 'HEALTHY', category: 'Quality Assurance', provider: 'cli', invocationsCount: 650 },
  { id: 'sk-test', name: 'vitest_runner', version: '0.9.4', description: 'Automated test suite execution and coverage reporter', status: 'DEGRADED', category: 'Testing', provider: 'cli', invocationsCount: 110 },
  { id: 'sk-pipe', name: 'stream_compressor', version: '1.1.0', description: 'Real-time telemetry event stream batching and compression engine', status: 'HEALTHY', category: 'Data Pipeline', provider: 'native', invocationsCount: 4320 },
  { id: 'sk-sec', name: 'policy_checker', version: '1.4.0', description: 'Security boundary validation and human authorization checkpoints', status: 'HEALTHY', category: 'Security', provider: 'builtin', invocationsCount: 340 },
  { id: 'sk-webhook', name: 'webhook_listener', version: '0.8.0', description: 'Incoming webhook router and HMAC signature validator', status: 'UNAVAILABLE', category: 'Network', provider: 'external', invocationsCount: 0 },
]
