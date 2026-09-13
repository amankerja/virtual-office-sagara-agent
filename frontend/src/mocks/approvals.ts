import type { ApprovalProjection } from '@/types/approval'

export const MOCK_APPROVALS: ApprovalProjection[] = [
  {
    id: 'appr-01',
    state: 'PENDING',
    risk: 'CRITICAL',
    actionType: 'INFRASTRUCTURE_CHANGE',
    title: 'Outbound Port 8080 Authorization (TCP Ingress/Egress)',
    description: 'Security Gatekeeper staged firewall rule modification to enable outbound telemetry sync to external service bridge.',
    reasonRequired: 'Modifying production ingress/egress firewall rules bypasses baseline network sandbox constraints.',
    taskId: 'tsk-03',
    agentId: 'agent-gamma',
    sessionId: 'sess-02',
    requestedAt: '2026-09-09T04:47:00Z',
    expiresAt: '2026-09-09T05:47:00Z', // expires in ~30-60 mins
    target: {
      type: 'Firewall Rule',
      label: 'TCP 8080 (bridge-egress.corp.internal)',
    },
    preview: {
      summary: 'Staged iptables / nftables network interface binding rule update.',
      fields: {
        Environment: 'Production Gateway Mesh',
        Protocol: 'TCP',
        'Port Range': '8080-8084',
        Destination: 'bridge-egress.corp.internal',
        'TTL Expiration': '3600 seconds',
        'Authorization Hash': '••••••••', // sensitive redacted
        'Gateway Key Signature': '••••••••', // sensitive redacted
      },
      sensitiveFields: ['Authorization Hash', 'Gateway Key Signature'],
    },
    audit: [
      {
        stage: 'Triggered',
        timestamp: '2026-09-09T04:47:00Z',
        actor: 'Gamma — Gatekeeper',
        note: 'Capability invocation boundary triggered for firewall-audit',
      },
      {
        stage: 'Policy Evaluated',
        timestamp: '2026-09-09T04:47:05Z',
        actor: 'Policy Engine v2.1',
        note: 'Evaluated rule set: CRITICAL risk assigned due to external socket access',
      },
      {
        stage: 'Pending Human Operator',
        timestamp: '2026-09-09T04:47:10Z',
        actor: 'Approval Dispatcher',
        note: 'Escalated to human operator approval queue',
      },
    ],
  },
  {
    id: 'appr-02',
    state: 'PENDING',
    risk: 'HIGH',
    actionType: 'SEND_EMAIL',
    title: 'Recruiter Candidate Outreach Email Dispatch',
    description: 'Autonomous dispatch of screened candidate invitation emails to interview pipeline.',
    reasonRequired: 'External outbound communication with external individual recipient requires confirmation of message content and email headers.',
    taskId: 'tsk-02',
    agentId: 'agent-beta',
    sessionId: 'sess-02',
    requestedAt: '2026-09-09T04:55:00Z',
    expiresAt: '2026-09-09T07:55:00Z',
    target: {
      type: 'Email Recipient',
      label: 'recruitment@example.invalid',
    },
    preview: {
      summary: 'Single outreach email with attached company profile document.',
      fields: {
        To: 'recruitment@example.invalid',
        From: 'sagara-scout@example.invalid',
        Subject: 'Sagara Autonomous Engineering — Technical Portfolio Discussion',
        'Attachment Summary': '1 attachment (Company_Overview_2026.pdf, 1.4 MB)',
        'Body Preview': 'Hello Candidate,\n\nOur automated technical assessment reviewed your open-source contributions in distributed consensus algorithms. We would like to invite you for a conversation regarding our architectural roadmap...',
        'API Token Bearer': '••••••••', // sensitive redacted
      },
      sensitiveFields: ['API Token Bearer'],
    },
    audit: [
      {
        stage: 'Draft Staged',
        timestamp: '2026-09-09T04:54:30Z',
        actor: 'Beta — System Architect',
        note: 'Email content compiled from screening template',
      },
      {
        stage: 'Gate Evaluated',
        timestamp: '2026-09-09T04:55:00Z',
        actor: 'Policy Engine v2.1',
        note: 'Outbound communication rule requires human review',
      },
    ],
  },
  {
    id: 'appr-03',
    state: 'PENDING',
    risk: 'MEDIUM',
    actionType: 'POST_CONTENT',
    title: 'Publish Technical Highlights to Internal Developer Portal',
    description: 'Post release summary notes and changelog markdown to internal engineering portal repository.',
    reasonRequired: 'Content publication to broad internal developer distribution channel.',
    taskId: 'tsk-06',
    agentId: 'agent-delta',
    requestedAt: '2026-09-09T04:30:00Z',
    expiresAt: '2026-09-09T16:30:00Z',
    target: {
      type: 'Portal Repository',
      label: 'devportal.internal.corp/releases/v1.4.0',
    },
    preview: {
      summary: 'Markdown article publication comprising 1,200 words and 4 code snippets.',
      fields: {
        Platform: 'Internal Engineering Wiki',
        Channel: '#releases-announcements',
        'Content Preview': '## Mission Control v1.4.0 Highlights\n- Integrated Task Kanban with dual-mode projection\n- Pessimistic Human Approval workflows\n- Runtime Gateway telemetry streaming',
        'Media Count': '0 attachments',
      },
    },
    audit: [
      {
        stage: 'Content Generated',
        timestamp: '2026-09-09T04:29:45Z',
        actor: 'Delta — Knowledge Archivist',
        note: 'Generated release overview from Git commit log',
      },
    ],
  },
  {
    id: 'appr-04',
    state: 'PENDING',
    risk: 'LOW',
    actionType: 'WRITE_EXTERNAL',
    title: 'Export Anonymized Diagnostic Benchmark Logs',
    description: 'Export aggregate runtime execution metrics to isolated cold storage audit bucket.',
    reasonRequired: 'External object storage write operation.',
    taskId: 'tsk-04',
    agentId: 'agent-alpha',
    requestedAt: '2026-09-09T04:15:00Z',
    expiresAt: '2026-09-10T04:15:00Z',
    target: {
      type: 'Object Storage Bucket',
      label: 's3://diagnostics-bucket/daily-telemetry-2026-09-09.json.gz',
    },
    preview: {
      summary: 'Gzip compressed archive containing sanitized JSON telemetry events.',
      fields: {
        Bucket: 's3://diagnostics-bucket',
        'File Name': 'daily-telemetry-2026-09-09.json.gz',
        'Estimated Size': '4.2 MB',
        Compression: 'gzip (level 9)',
        'Storage Class': 'STANDARD_IA',
      },
    },
    audit: [
      {
        stage: 'Aggregation Complete',
        timestamp: '2026-09-09T04:15:00Z',
        actor: 'Alpha — Core Engineer',
        note: 'Diagnostic logs extracted and checksum verified',
      },
    ],
  },
  {
    id: 'appr-05',
    state: 'APPROVED',
    risk: 'HIGH',
    actionType: 'EXECUTE_CODE',
    title: 'Execute Database B-Tree Index Migration on Read Replica',
    description: 'Run concurrent index creation query `CREATE INDEX CONCURRENTLY idx_sessions_timestamp` on analytics postgres replica.',
    taskId: 'tsk-05',
    agentId: 'agent-alpha',
    requestedAt: '2026-09-09T02:00:00Z',
    expiresAt: '2026-09-09T04:00:00Z',
    target: {
      type: 'Database Server',
      label: 'postgres-replica-01.internal:5432 / db_telemetry',
    },
    preview: {
      summary: 'DDL index statement on read-only analytics replica.',
      fields: {
        Host: 'postgres-replica-01.internal:5432',
        Database: 'db_telemetry',
        Command: 'CREATE INDEX CONCURRENTLY idx_sessions_created_at ON sessions (created_at DESC);',
        'Max Lock Duration': '50ms',
      },
    },
    decision: {
      decidedAt: '2026-09-09T02:15:00Z',
      decisionMaker: 'Lead Database Administrator',
      reason: 'Verified execution plan and replica replication lag is within safe threshold (< 10ms).',
    },
    audit: [
      {
        stage: 'Requested',
        timestamp: '2026-09-09T02:00:00Z',
        actor: 'Alpha — Core Engineer',
        note: 'Migration query submitted for operator authorization',
      },
      {
        stage: 'Approved',
        timestamp: '2026-09-09T02:15:00Z',
        actor: 'Lead Database Administrator',
        note: 'Action authorized and executed in sub-process',
      },
    ],
  },
  {
    id: 'appr-06',
    state: 'REJECTED',
    risk: 'HIGH',
    actionType: 'DELETE_EXTERNAL',
    title: 'Purge Stale Artifacts in Long-Term Cold Archive',
    description: 'Bulk deletion of intermediate build artifacts older than 30 days from secondary bucket.',
    taskId: 'tsk-01',
    agentId: 'agent-beta',
    requestedAt: '2026-09-09T01:10:00Z',
    expiresAt: '2026-09-09T03:10:00Z',
    target: {
      type: 'Storage Bucket',
      label: 's3://archive-cold-storage/builds/2026-08/*',
    },
    preview: {
      summary: 'Deletion of 142 objects totaling 18.5 GB.',
      fields: {
        'Object Count': '142 files',
        'Total Size': '18.5 GB',
        Scope: 'builds/2026-08/*',
        'Dry Run Status': 'Passed',
      },
    },
    decision: {
      decidedAt: '2026-09-09T01:30:00Z',
      decisionMaker: 'Security Officer',
      reason: 'Retention compliance policy specifies 90 days retention for audit trails before permanent purging.',
    },
    audit: [
      {
        stage: 'Requested',
        timestamp: '2026-09-09T01:10:00Z',
        actor: 'Beta — System Architect',
        note: 'Purge script initiated for cold archive cleanup',
      },
      {
        stage: 'Rejected',
        timestamp: '2026-09-09T01:30:00Z',
        actor: 'Security Officer',
        note: 'Rejected due to regulatory compliance retention policy',
      },
    ],
  },
  {
    id: 'appr-07',
    state: 'EXPIRED',
    risk: 'CRITICAL',
    actionType: 'FINANCIAL_ACTION',
    title: 'Cloud Compute Reserve Capacity 1-Year Commitment',
    description: 'Authorization for purchasing 3 reserved GPU instances on cloud provider.',
    agentId: 'agent-gamma',
    requestedAt: '2026-09-07T10:00:00Z',
    expiresAt: '2026-09-08T10:00:00Z',
    target: {
      type: 'Billing Account',
      label: 'Corporate Cloud Billing / Reserved Fleet',
    },
    preview: {
      summary: '1-Year reservation commitment for GPU compute nodes.',
      fields: {
        'Instance Type': 'gpu.p4d.24xlarge x 3',
        Term: '12 Months All-Upfront',
        'Total Commitment': '$14,200.00 USD',
        'Billing ID Hash': '••••••••', // sensitive redacted
      },
      sensitiveFields: ['Billing ID Hash'],
    },
    decision: {
      decidedAt: '2026-09-08T10:00:01Z',
      decisionMaker: 'System Timeout Engine',
      reason: 'Approval expired without human decision within 24-hour validity window.',
    },
    audit: [
      {
        stage: 'Requested',
        timestamp: '2026-09-07T10:00:00Z',
        actor: 'Gamma — Gatekeeper',
        note: 'Staged reservation procurement request',
      },
      {
        stage: 'Expired',
        timestamp: '2026-09-08T10:00:01Z',
        actor: 'System Timeout Engine',
        note: 'Action invalidated automatically after deadline elapsed',
      },
    ],
  },
  {
    id: 'appr-08',
    state: 'PENDING',
    risk: 'CRITICAL',
    actionType: 'INFRASTRUCTURE_CHANGE',
    title: 'Simulated Gateway Fault Injection (Failure Test Gate)',
    description: 'Diagnostic test approval configured to simulate unexpected backend authorization rejection for error handling validation.',
    reasonRequired: 'Testing failure behavior and error recovery in Mission Control operations console.',
    agentId: 'agent-zeta',
    requestedAt: '2026-09-09T05:00:00Z',
    expiresAt: '2026-09-09T18:00:00Z',
    target: {
      type: 'Test Endpoint',
      label: 'mock-failure-simulator.sagara.local',
    },
    preview: {
      summary: 'Used exclusively to verify simulated failure and error notification flow.',
      fields: {
        'Failure Mode': 'SIMULATED_HTTP_500',
        'Expected Result': 'Decision was not confirmed. No approval state was changed.',
        'Target Node': 'zeta-worker-sandbox',
      },
    },
    audit: [
      {
        stage: 'Test Gate Created',
        timestamp: '2026-09-09T05:00:00Z',
        actor: 'Automated Test Framework',
        note: 'Configured for deterministic failure validation',
      },
    ],
  },
]
