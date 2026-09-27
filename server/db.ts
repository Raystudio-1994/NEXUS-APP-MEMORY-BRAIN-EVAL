import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import { generateFallbackEmbedding } from './embeddings';

// Ensure data folder exists
const DB_DIR = path.resolve('./data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'nexus.db');
export const db = new DatabaseSync(DB_PATH);

// Turn on foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDb() {
  // Create tables with source_event_ids TEXT column
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_events (
      event_id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      ingested_at TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON string
      evidence_class TEXT NOT NULL,
      content_hash TEXT NOT NULL UNIQUE,
      session_id TEXT,
      actor_id TEXT,
      confidence REAL NOT NULL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tier INTEGER NOT NULL,
      tier_name TEXT NOT NULL,
      statement TEXT NOT NULL,
      subject TEXT,
      predicate TEXT,
      object TEXT,
      confidence REAL NOT NULL,
      importance REAL NOT NULL,
      stability REAL NOT NULL,
      observed_at TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT,
      lifecycle_state TEXT NOT NULL DEFAULT 'active',
      tags TEXT NOT NULL, -- comma-separated tags
      scope TEXT NOT NULL,
      access_count INTEGER NOT NULL DEFAULT 0,
      last_accessed TEXT NOT NULL,
      tokens INTEGER NOT NULL DEFAULT 0,
      embedding_vector TEXT, -- JSON string of number[]
      vault_path TEXT,
      procedure_spec TEXT, -- JSON string
      source_event_ids TEXT -- comma-separated list of event_ids
    );

    CREATE TABLE IF NOT EXISTS memory_links (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      target TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      valid_from TEXT,
      valid_to TEXT,
      UNIQUE (source, target, relation_type)
    );

    CREATE TABLE IF NOT EXISTS provenance_anchors (
      anchor_id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      source_event_id TEXT NOT NULL REFERENCES memory_events(event_id),
      source_title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      byte_range TEXT NOT NULL, -- JSON string [start, end]
      verbatim_extract TEXT NOT NULL,
      sha256_hash TEXT NOT NULL CHECK(length(sha256_hash) = 64),
      verified INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
    CREATE INDEX IF NOT EXISTS idx_memories_lifecycle ON memories(lifecycle_state);
    CREATE INDEX IF NOT EXISTS idx_memories_valid ON memories(valid_from, valid_to);
  `);

  // Seed with initial states if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM memories');
  const result = countStmt.get() as { count: number };
  if (result.count === 0) {
    console.log('Seeding initial memories, events, links, and anchors into SQLite...');
    
    // Seed events
    const insertEvent = db.prepare(`
      INSERT INTO memory_events (event_id, source_id, source_type, observed_at, ingested_at, payload, evidence_class, content_hash, session_id, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const initialEvents = [
      {
        event_id: 'evt-git-001',
        source_id: 'commit-9f8a2b',
        source_type: 'git',
        observed_at: '2026-09-24T14:22:00Z',
        ingested_at: '2026-09-24T14:22:05Z',
        payload: JSON.stringify({
          author: 'Lead Architect',
          message: 'feat(storage): migrate primary canonical store from Redis to PostgreSQL 18',
          files_changed: ['src/storage/db.ts', 'docker-compose.yml', 'migrations/001_init.sql'],
          diff_snippet: '- REDIS_URL = "redis://localhost:6379"\n+ DATABASE_URL = "postgres://user:pass@localhost:5432/nmf"'
        }),
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
        payload: JSON.stringify({
          command: 'pnpm test:temporal-contradiction',
          exit_code: 0,
          stdout: 'PASS src/tests/temporal_reconciliation.test.ts (14 tests passed, 0 failed, 320ms)'
        }),
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
        payload: JSON.stringify({
          user: 'Lead Architect',
          text: 'For local test suites, always prefer in-memory SQLite instead of spinning up heavy PostgreSQL containers.'
        }),
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
        payload: JSON.stringify({
          file: 'package.json',
          action: 'modify',
          details: 'Added @google/genai ^2.4.0, removed legacy rest wrapper'
        }),
        evidence_class: 'OBSERVED',
        content_hash: '8491029384719203948102938471920394810293847192039481029384719203',
        session_id: undefined,
        confidence: 0.95
      }
    ];
    
    for (const ev of initialEvents) {
      insertEvent.run(...[
        ev.event_id,
        ev.source_id,
        ev.source_type,
        ev.observed_at,
        ev.ingested_at,
        ev.payload,
        ev.evidence_class,
        ev.content_hash,
        ev.session_id || null,
        ev.confidence
      ]);
    }

    // Seed memories
    const insertMemory = db.prepare(`
      INSERT INTO memories (id, title, tier, tier_name, statement, subject, predicate, object, confidence, importance, stability, observed_at, valid_from, valid_to, lifecycle_state, tags, scope, access_count, last_accessed, tokens, embedding_vector, vault_path, procedure_spec, source_event_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialMemories = [
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
        tags: 'working-memory,compiler,active-task',
        scope: 'session',
        access_count: 24,
        last_accessed: '2026-09-27T00:08:00Z',
        tokens: 42,
        embedding_vector: JSON.stringify(generateFallbackEmbedding('Current focus is refining the knapsack token budget solver to ensure multi-turn responses stay strictly under 2,048 tokens.')),
        vault_path: null,
        procedure_spec: null,
        source_event_ids: 'evt-cli-002,evt-fs-004'
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
        tags: 'git,working-state',
        scope: 'project',
        access_count: 18,
        last_accessed: '2026-09-27T00:07:30Z',
        tokens: 28,
        embedding_vector: JSON.stringify(generateFallbackEmbedding('Active Git branch is `feature/bitemporal-dag-synthesis` tracking origin main.')),
        vault_path: null,
        procedure_spec: null,
        source_event_ids: 'evt-git-001'
      },
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
        tags: 'database,migration,episodic,postgres,redis',
        scope: 'project',
        access_count: 38,
        last_accessed: '2026-09-26T18:30:00Z',
        tokens: 65,
        embedding_vector: JSON.stringify(generateFallbackEmbedding('On 2026-09-24, production memory state store was successfully transitioned from Redis key-value cache to PostgreSQL 18 with pgvector for strict ACID durability and relational lineage.')),
        vault_path: null,
        procedure_spec: null,
        source_event_ids: 'evt-git-001'
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
        tags: 'historical,redis,superseded',
        scope: 'project',
        access_count: 5,
        last_accessed: '2026-09-24T14:20:00Z',
        tokens: 35,
        embedding_vector: JSON.stringify(generateFallbackEmbedding('System previously utilized standalone Redis for all hot-path memory storage prior to 2026-09-24.')),
        vault_path: null,
        procedure_spec: null,
        source_event_ids: 'evt-git-001'
      },
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
        tags: 'architecture,invariant,canonical-store,semantic',
        scope: 'global',
        access_count: 72,
        last_accessed: '2026-09-27T00:05:00Z',
        tokens: 78,
        embedding_vector: JSON.stringify(generateFallbackEmbedding('PostgreSQL is the single canonical source of truth for all events, memories, and DAG links. Vector search indices (Qdrant/pgvector) and Graph projections (Kùzu) are disposable and deterministically reconstructable.')),
        vault_path: 'vault/Semantic/Nexus_Architecture_Invariant.md',
        procedure_spec: null,
        source_event_ids: 'evt-git-001'
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
        tags: 'testing,sqlite,policy,user-preference',
        scope: 'project',
        access_count: 29,
        last_accessed: '2026-09-26T23:15:00Z',
        tokens: 46,
        embedding_vector: JSON.stringify(generateFallbackEmbedding('Unit and local integration test suites must execute against an in-memory SQLite database instance to avoid external Docker startup overhead.')),
        vault_path: 'vault/Semantic/Test_Suite.md',
        procedure_spec: null,
        source_event_ids: 'evt-chat-003'
      },
      {
        id: 'mem-t4-001',
        title: 'Procedure: TypeScript Import & Symbol Resolution Verification',
        tier: 4,
        tier_name: 'procedural',
        statement: 'When refactoring module exports or moving files, verify the entire export chain with `tsc --noEmit` before modifying downstream consumer packages.',
        subject: 'TypeScript compilation',
        predicate: 'uses_verification',
        object: 'tsc --noEmit',
        confidence: 0.94,
        importance: 0.91,
        stability: 0.92,
        observed_at: '2026-09-25T11:00:00Z',
        valid_from: '2026-09-25T11:00:00Z',
        valid_to: null,
        lifecycle_state: 'active',
        tags: 'procedural,workflow,typescript,refactoring',
        scope: 'global',
        access_count: 45,
        last_accessed: '2026-09-26T22:10:00Z',
        tokens: 58,
        embedding_vector: JSON.stringify(generateFallbackEmbedding('When refactoring module exports or moving files, verify the entire export chain with `tsc --noEmit` before modifying downstream consumer packages.')),
        vault_path: null,
        procedure_spec: JSON.stringify({
          when: 'TypeScript compilation fails on unresolved symbol',
          if_cond: 'Symbol was recently moved or renamed in shared package',
          then_action: 'Run targeted type-check on export index before touching dependencies',
          expected_result: 'Zero-regression compiler resolution without unnecessary dependency churn'
        }),
        source_event_ids: 'evt-cli-002'
      }
    ];

    for (const mem of initialMemories) {
      insertMemory.run(...[
        mem.id,
        mem.title,
        mem.tier,
        mem.tier_name,
        mem.statement,
        mem.subject || null,
        mem.predicate || null,
        mem.object || null,
        mem.confidence,
        mem.importance,
        mem.stability,
        mem.observed_at,
        mem.valid_from,
        mem.valid_to || null,
        mem.lifecycle_state,
        mem.tags,
        mem.scope,
        mem.access_count,
        mem.last_accessed,
        mem.tokens,
        mem.embedding_vector,
        mem.vault_path,
        mem.procedure_spec,
        mem.source_event_ids
      ]);
    }

    // Seed links
    const insertLink = db.prepare(`
      INSERT INTO memory_links (id, source, target, relation_type, weight, valid_from, valid_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const initialLinks = [
      { id: 'edge-001', source: 'mem-t1-001', target: 'mem-t3-001', relation_type: 'DEPENDS_ON', weight: 0.92, valid_from: '2026-09-27T00:01:00Z' },
      { id: 'edge-002', source: 'mem-t2-001', target: 'mem-t2-002', relation_type: 'SUPERSEDES', weight: 0.98, valid_from: '2026-09-24T14:22:00Z' },
      { id: 'edge-003', source: 'mem-t2-001', target: 'mem-t3-001', relation_type: 'DERIVED_FROM', weight: 0.95, valid_from: '2026-09-24T14:30:00Z' },
      { id: 'edge-004', source: 'mem-t3-002', target: 'mem-t4-001', relation_type: 'RELATES_TO', weight: 0.78, valid_from: '2026-09-26T16:04:12Z' },
      { id: 'edge-005', source: 'mem-t1-002', target: 'mem-t2-001', relation_type: 'RELATES_TO', weight: 0.85, valid_from: '2026-09-27T00:02:10Z' }
    ];

    for (const link of initialLinks) {
      insertLink.run(...[
        link.id,
        link.source,
        link.target,
        link.relation_type,
        link.weight,
        link.valid_from,
        null
      ]);
    }

    // Seed anchors
    const insertAnchor = db.prepare(`
      INSERT INTO provenance_anchors (anchor_id, memory_id, source_event_id, source_title, source_type, byte_range, verbatim_extract, sha256_hash, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialAnchors = [
      {
        anchor_id: 'anch-001',
        memory_id: 'mem-t2-001',
        source_event_id: 'evt-git-001',
        source_title: 'Git Commit 9f8a2b: feat(storage): migrate primary canonical store',
        source_type: 'git',
        byte_range: JSON.stringify([14, 185]),
        verbatim_extract: 'feat(storage): migrate primary canonical store from Redis to PostgreSQL 18\n+ DATABASE_URL = "postgres://user:pass@localhost:5432/nmf"',
        sha256_hash: '9f8a2b8e4c19d3f7620a8451bc049f7e83125dae2894561023bc4a0e1928374a',
        verified: 1
      },
      {
        anchor_id: 'anch-002',
        memory_id: 'mem-t3-002',
        source_event_id: 'evt-chat-003',
        source_title: 'User Architecture Directive (Lead Architect)',
        source_type: 'chat',
        byte_range: JSON.stringify([0, 118]),
        verbatim_extract: 'For local test suites, always prefer in-memory SQLite instead of spinning up heavy PostgreSQL containers.',
        sha256_hash: '3a8849b10938472910fa91823749102938471920394810293847192039481029',
        verified: 1
      }
    ];

    for (const anc of initialAnchors) {
      insertAnchor.run(...[
        anc.anchor_id,
        anc.memory_id,
        anc.source_event_id,
        anc.source_title,
        anc.source_type,
        anc.byte_range,
        anc.verbatim_extract,
        anc.sha256_hash,
        anc.verified
      ]);
    }
    
    console.log('Database seeding complete.');
  }

  return db;
}
export default db;
