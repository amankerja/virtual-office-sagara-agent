import type { OfficePresentationConfig } from '@/features/office/types/office'

/**
 * Presentation metadata and zone geometry configuration for Virtual Office 2.5D.
 *
 * ARCHITECTURAL RULE:
 * This file contains ONLY presentation layout metadata (coordinates, bounds, labels).
 * It does NOT duplicate or determine any operational truth (states, tasks, approvals, runtime).
 * Operational state comes directly from AgentProjection, DelegationProjection, etc.
 */
export const DEFAULT_OFFICE_CONFIG: OfficePresentationConfig = {
  version: 2,
  zones: [
    {
      id: 'zone-command',
      name: 'COMMAND ROOM',
      subtitle: 'Strategy & Coordination',
      type: 'COMMAND',
      bounds: {
        x: 45,
        y: 40,
        width: 320,
        height: 305,
      },
      description: 'Orchestration & Fleet Coordination Terminal',
    },
    {
      id: 'zone-dev',
      name: 'DEV ZONE',
      subtitle: 'Build & Automate',
      type: 'DEV_ZONE',
      bounds: {
        x: 415,
        y: 40,
        width: 570,
        height: 305,
      },
      description: 'Autonomous Engineering, Codebase Indexing & Dynamic Worker Bays',
    },
    {
      id: 'zone-career',
      name: 'CAREER ZONE',
      subtitle: 'People & Growth',
      type: 'CAREER_ZONE',
      bounds: {
        x: 1035,
        y: 40,
        width: 320,
        height: 305,
      },
      description: 'Talent Development, Skill Gap Assessment & Capability Coaching',
    },
    {
      id: 'zone-marketing',
      name: 'MARKETING ZONE',
      subtitle: 'Brand & Communication',
      type: 'MARKETING_ZONE',
      bounds: {
        x: 45,
        y: 385,
        width: 320,
        height: 255,
      },
      description: 'Growth Telemetry, Content Generation & Campaign Analytics',
    },
    {
      id: 'zone-collaboration',
      name: 'CENTRAL AREA',
      subtitle: 'Mission Control',
      type: 'COLLABORATION',
      bounds: {
        x: 415,
        y: 385,
        width: 570,
        height: 255,
      },
      description: 'Mission Control Center, Cross-Agent Correlation & Operations Plaza',
    },
    {
      id: 'zone-runtime',
      name: 'SERVER ROOM',
      subtitle: 'Infrastructure',
      type: 'RUNTIME',
      bounds: {
        x: 45,
        y: 680,
        width: 320,
        height: 230,
      },
      description: 'Hermes Runtime Cluster & Session Supervisor Racks',
    },
    {
      id: 'zone-approval',
      name: 'APPROVAL POD',
      subtitle: 'Review & Decision',
      type: 'APPROVAL',
      bounds: {
        x: 415,
        y: 680,
        width: 570,
        height: 230,
      },
      description: 'Human-in-the-Loop Security & Authorization Chamber',
    },
    {
      id: 'zone-vault',
      name: 'ARTIFACT VAULT',
      subtitle: 'Knowledge & Assets',
      type: 'VAULT',
      bounds: {
        x: 1035,
        y: 680,
        width: 320,
        height: 230,
      },
      description: 'Verified Deliverables, Schemas & Task Artifact Storage',
    },
  ],
  assignments: [
    // Suggested placement hint (optional presentation preference only)
    { agentId: 'agent-alpha', preferredZone: 'COMMAND' },
    { agentId: 'agent-eta', preferredZone: 'MARKETING_ZONE' },
    { agentId: 'agent-iota', preferredZone: 'CAREER_ZONE' },
  ],
}
