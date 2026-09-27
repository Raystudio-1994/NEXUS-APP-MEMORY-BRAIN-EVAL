import { MemoryEvent, MemoryItem, GraphEdge, ProvenanceAnchor, SystemMetrics } from '../types/memory';

export const INITIAL_EVENTS: MemoryEvent[] = [
  {
    event_id: 'evt-git-001',
    source_id: 'commit-9f8a2b',
    source_type: 'git',
    observed_at: '2026-09-24T14:22:00Z',
    ingested_at: '2026-09-24T14:22:05Z',
    payload: {
      author: 'Lead Architect',
      message: 'feat(storage): migrate primary canonical store from Redis to PostgreSQL 18',
      files_changed: ['src/storage/db.ts', 'docker-compose.yml', 'migrations/001_init.sql'],
      diff_snippet: '- REDIS_URL = "redis://localhost:6379"\n+ DATABASE_URL = "postgres://user:pass@localhost:5432/nmf"'
    },
    evidence_class: 'OBSERVED',
    content_hash: '9f8a2b8e4c19d3f7620a8451bc049f7e83125dae2894561023bc4a0e1928374a',
    session_id: 'session-arch-44',
    confidence: 1.0
  },
  {
    event_id: 'evt-cli-002',
    source_id: 'terminal-pid-8192',
    source_type: 'terminal',
    observed_at: '2026-09-25T09:15:30Z',
    ingested_at: '2026-09-25T09:15:31Z',
    payload: {
      command: 'pnpm test:temporal-contradiction',
      exit_code: 0,
      stdout: 'PASS src/tests/temporal_reconciliation.test.ts (14 tests passed, 0 failed, 320ms)'
    },
    evidence_class: 'OBSERVED',
    content_hash: 'e817bc304a91f58209ad18349fa81726049281a9ec041947b192847192847192',
    session_id: 'session-dev-12',
    confidence: 0.98
  },
  {
    event_id: 'evt-chat-003',
    source_id: 'user-prompt-991',
    source_type: 'chat',
    observed_at: '2026-09-26T16:04:12Z',
    ingested_at: '2026-09-26T16:04:13Z',
    payload: {
      user: 'Lead Architect',
      text: 'For local test suites, always prefer in-memory SQLite instead of spinning up heavy PostgreSQL containers.'
    },
    evidence_class: 'USER_CONFIRMED',
    content_hash: '3a8849b10938472910fa91823749102938471920394810293847192039481029',
    session_id: 'session-arch-45',
    confidence: 1.0
  },
  {
    event_id: 'evt-fs-004',
    source_id: 'fs-watcher-package-json',
    source_type: 'filesystem',
    observed_at: '2026-09-26T21:40:00Z',
    ingested_at: '2026-09-26T21:40:01Z',
    payload: {
      file: 'package.json',
      action: 'modify',
      details: 'Added @google/genai ^2.4.0, removed legacy rest wrapper'
    },
    evidence_class: 'OBSERVED',
    content_hash: '8491029384719203948102938471920394810293847192039481029384719203',
    confidence: 0.95
  }
];

export const INITIAL_MEMORIES: MemoryItem[] = [
  // Tier 1: Working Memory
  {
    id: 'mem-t1-001',
    title: 'Active Dev Context: Context Compiler Optimization',
    tier: 1,
    tier_name: 'working',
    statement: 'Current focus is refining the knapsack token budget solver to ensure multi-turn responses stay strictly under 2,048 tokens.',
    subject: 'Context Compiler',
    predicate: 'is_optimizing',
    object: 'Knapsack Token Budget',
    confidence: 0.98,
    importance: 0.95,
    stability: 0.90,
    observed_at: '2026-09-27T00:01:00Z',
    valid_from: '2026-09-27T00:00:00Z',
    valid_to: null,
    lifecycle_state: 'active',
    source_event_ids: ['evt-cli-002', 'evt-fs-004'],
    tags: ['working-memory', 'compiler', 'active-task'],
    scope: 'session',
    access_count: 24,
    last_accessed: '2026-09-27T00:08:00Z',
    tokens: 42,
    embedding_vector: [0.82, 0.12, 0.44, 0.91, 0.05, 0.63, 0.77, 0.31]
  },
  {
    id: 'mem-t1-002',
    title: 'Active Session Branch',
    tier: 1,
    tier_name: 'working',
    statement: 'Active Git branch is `feature/bitemporal-dag-synthesis` tracking origin main.',
    subject: 'Git Repository',
    predicate: 'has_active_branch',
    object: 'feature/bitemporal-dag-synthesis',
    confidence: 1.0,
    importance: 0.85,
    stability: 0.70,
    observed_at: '2026-09-27T00:02:10Z',
    valid_from: '2026-09-26T22:00:00Z',
    valid_to: null,
    lifecycle_state: 'active',
    source_event_ids: ['evt-git-001'],
    tags: ['git', 'working-state'],
    scope: 'project',
    access_count: 18,
    last_accessed: '2026-09-27T00:07:30Z',
    tokens: 28,
    embedding_vector: [0.15, 0.78, 0.22, 0.34, 0.89, 0.41, 0.12, 0.65]
  },

  // Tier 2: Episodic Memory
  {
    id: 'mem-t2-001',
    title: 'Episode: Database Migration from Redis to PostgreSQL',
    tier: 2,
    tier_name: 'episodic',
    statement: 'On 2026-09-24, production memory state store was successfully transitioned from Redis key-value cache to PostgreSQL 18 with pgvector for strict ACID durability and relational lineage.',
    subject: 'Persistence Layer',
    predicate: 'migrated_to',
    object: 'PostgreSQL 18 + pgvector',
    confidence: 0.96,
    importance: 0.92,
    stability: 0.88,
    observed_at: '2026-09-24T14:22:00Z',
    valid_from: '2026-09-24T14:22:00Z',
    valid_to: null,
    lifecycle_state: 'active',
    source_event_ids: ['evt-git-001'],
    tags: ['database', 'migration', 'episodic', 'postgres', 'redis'],
    scope: 'project',
    access_count: 38,
    last_accessed: '2026-09-26T18:30:00Z',
    tokens: 65,
    embedding_vector: [0.91, 0.45, 0.12, 0.76, 0.33, 0.82, 0.61, 0.19]
  },
  {
    id: 'mem-t2-002',
    title: 'Episode: Historical Redis In-Memory State (Superseded)',
    tier: 2,
    tier_name: 'episodic',
    statement: 'System previously utilized standalone Redis for all hot-path memory storage prior to 2026-09-24.',
    subject: 'Persistence Layer',
    predicate: 'used_previously',
    object: 'Redis',
    confidence: 0.99,
    importance: 0.50,
    stability: 0.40,
    observed_at: '2026-09-01T10:00:00Z',
    valid_from: '2026-09-01T00:00:00Z',
    valid_to: '2026-09-24T14:22:00Z',
    lifecycle_state: 'superseded',
    superseded_by: 'mem-t2-001',
    source_event_ids: ['evt-git-001'],
    tags: ['historical', 'redis', 'superseded'],
    scope: 'project',
    access_count: 5,
    last_accessed: '2026-09-24T14:20:00Z',
    tokens: 35,
    embedding_vector: [0.89, 0.41, 0.10, 0.70, 0.31, 0.80, 0.58, 0.15]
  },

  // Tier 3: Semantic & Declarative (Knowledge Graph + Obsidian Vault)
  {
    id: 'mem-t3-001',
    title: 'Architecture Decision: Postgres Canonical Store & Disposable Qdrant',
    tier: 3,
    tier_name: 'semantic',
    statement: 'PostgreSQL is the single canonical source of truth for all events, memories, and DAG links. Vector search indices (Qdrant/pgvector) and Graph projections (Kùzu) are disposable and deterministically reconstructable.',
    subject: 'Nexus Architecture Invariant',
    predicate: 'mandates',
    object: 'Postgres Canonical Store',
    confidence: 0.99,
    importance: 0.98,
    stability: 0.99,
    observed_at: '2026-09-24T14:30:00Z',
    valid_from: '2026-09-24T14:30:00Z',
    valid_to: null,
    lifecycle_state: 'active',
    source_event_ids: ['evt-git-001'],
    tags: ['architecture', 'invariant', 'canonical-store', 'semantic'],
    scope: 'global',
    access_count: 72,
    last_accessed: '2026-09-27T00:05:00Z',
    tokens: 78,
    vault_path: 'vault/architecture/001-canonical-truth.md',
    embedding_vector: [0.73, 0.65, 0.88, 0.42, 0.19, 0.95, 0.33, 0.81]
  },
  {
    id: 'mem-t3-002',
    title: 'Testing Environment Constraint: SQLite In-Memory for Unit Tests',
    tier: 3,
    tier_name: 'semantic',
    statement: 'Unit and local integration test suites must execute against an in-memory SQLite database instance to avoid external Docker startup overhead.',
    subject: 'Test Suite',
    predicate: 'uses_engine',
    object: 'SQLite In-Memory',
    confidence: 1.0,
    importance: 0.88,
    stability: 0.95,
    observed_at: '2026-09-26T16:04:12Z',
    valid_from: '2026-09-26T16:04:12Z',
    valid_to: null,
    lifecycle_state: 'active',
    source_event_ids: ['evt-chat-003'],
    tags: ['testing', 'sqlite', 'policy', 'user-preference'],
    scope: 'project',
    access_count: 29,
    last_accessed: '2026-09-26T23:15:00Z',
    tokens: 46,
    vault_path: 'vault/guidelines/test-environments.md',
    embedding_vector: [0.41, 0.82, 0.33, 0.25, 0.77, 0.51, 0.90, 0.14]
  },

  // Tier 4: Procedural Memory (Agent Trajectories & Instructions)
  {
    id: 'mem-t4-001',
    title: 'Procedure: TypeScript Import & Symbol Resolution Verification',
    tier: 4,
    tier_name: 'procedural',
    statement: 'When refactoring module exports or moving files, verify the entire export chain with `tsc --noEmit` before modifying downstream consumer packages.',
    confidence: 0.94,
    importance: 0.91,
    stability: 0.92,
    observed_at: '2026-09-25T11:00:00Z',
    valid_from: '2026-09-25T11:00:00Z',
    valid_to: null,
    lifecycle_state: 'active',
    source_event_ids: ['evt-cli-002'],
    tags: ['procedural', 'workflow', 'typescript', 'refactoring'],
    scope: 'global',
    access_count: 45,
    last_accessed: '2026-09-26T22:10:00Z',
    tokens: 58,
    procedure_spec: {
      when: 'TypeScript compilation fails on unresolved symbol',
      if_cond: 'Symbol was recently moved or renamed in shared package',
      then_action: 'Run targeted type-check on export index before touching dependencies',
      expected_result: 'Zero-regression compiler resolution without unnecessary dependency churn'
    },
    embedding_vector: [0.35, 0.28, 0.92, 0.81, 0.64, 0.17, 0.45, 0.73]
  }
];

export const INITIAL_EDGES: GraphEdge[] = [
  {
    id: 'edge-001',
    source: 'mem-t1-001',
    target: 'mem-t3-001',
    relation_type: 'DEPENDS_ON',
    weight: 0.92
  },
  {
    id: 'edge-002',
    source: 'mem-t2-001',
    target: 'mem-t2-002',
    relation_type: 'SUPERSEDES',
    weight: 0.98
  },
  {
    id: 'edge-003',
    source: 'mem-t2-001',
    target: 'mem-t3-001',
    relation_type: 'DERIVED_FROM',
    weight: 0.95
  },
  {
    id: 'edge-004',
    source: 'mem-t3-002',
    target: 'mem-t4-001',
    relation_type: 'RELATES_TO',
    weight: 0.78
  },
  {
    id: 'edge-005',
    source: 'mem-t1-002',
    target: 'mem-t2-001',
    relation_type: 'RELATES_TO',
    weight: 0.85
  }
];

export const INITIAL_PROVENANCE_ANCHORS: ProvenanceAnchor[] = [
  {
    anchor_id: 'anch-001',
    memory_id: 'mem-t2-001',
    source_event_id: 'evt-git-001',
    source_title: 'Git Commit 9f8a2b: feat(storage): migrate primary canonical store',
    source_type: 'git',
    byte_range: [14, 185],
    verbatim_extract: 'feat(storage): migrate primary canonical store from Redis to PostgreSQL 18\n+ DATABASE_URL = "postgres://user:pass@localhost:5432/nmf"',
    sha256_hash: '9f8a2b8e4c19d3f7620a8451bc049f7e83125dae2894561023bc4a0e1928374a',
    verified: true
  },
  {
    anchor_id: 'anch-002',
    memory_id: 'mem-t3-002',
    source_event_id: 'evt-chat-003',
    source_title: 'User Architecture Directive (Lead Architect)',
    source_type: 'chat',
    byte_range: [0, 118],
    verbatim_extract: 'For local test suites, always prefer in-memory SQLite instead of spinning up heavy PostgreSQL containers.',
    sha256_hash: '3a8849b10938472910fa91823749102938471920394810293847192039481029',
    verified: true
  }
];

export const INITIAL_SYSTEM_METRICS: SystemMetrics = {
  total_events: 1842,
  active_memories: 148,
  decayed_memories: 24,
  graph_nodes: 148,
  graph_edges: 312,
  avg_retrieval_ms: 18.4,
  token_density: 0.84,
  provenance_verification_rate: 100.0,
  cache_hit_rate: 94.2
};
