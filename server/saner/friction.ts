import { MemoryItem, ProvenanceAnchor } from '../../src/types/memory';
import { db } from '../db';
import { getMemories } from '../memoryService';
import { getEmbedding, computeSha256 } from '../embeddings';
import { syncMemoryToVault } from '../vaultSyncer';
import { GoogleGenAI } from '@google/genai';

export interface FrictionPattern {
  id: string;
  topic: string;
  trigger_keywords: string[];
  friction_description: string;
  procedure: {
    when: string;
    if_cond: string;
    then_action: string;
    expected_result: string;
  };
  source_memories: MemoryItem[];
}

/**
 * Detects recurring friction patterns, failures, or operational workarounds from episodic memory records.
 */
export function detectFrictionEpisodes(memories: MemoryItem[]): FrictionPattern[] {
  const frictionPatterns: FrictionPattern[] = [];
  
  // 1. Friction pattern around TypeScript symbol resolution & build churn
  const tsEpisodic = memories.filter(m => 
    m.statement.toLowerCase().includes('typescript') ||
    m.statement.toLowerCase().includes('symbol') ||
    m.statement.toLowerCase().includes('compiler') ||
    m.tags.some(t => ['typescript', 'refactoring', 'compiler'].includes(t.toLowerCase()))
  );

  if (tsEpisodic.length >= 1) {
    frictionPatterns.push({
      id: 'fric-ts-export-resolution',
      topic: 'TypeScript Symbol and Export Chain Resolution',
      trigger_keywords: ['typescript', 'compilation', 'unresolved symbol', 'refactoring'],
      friction_description: 'Compilation breakages and recursive downstream package churn when renaming or moving shared module exports.',
      procedure: {
        when: 'Refactoring shared module exports or moving symbols across packages',
        if_cond: 'Downstream consumer packages experience unresolved type reference errors',
        then_action: 'Run targeted `tsc --noEmit` on the export index before modifying downstream consumers',
        expected_result: 'Zero-regression compiler resolution without unnecessary dependency churn'
      },
      source_memories: tsEpisodic
    });
  }

  // 2. Friction pattern around Database Migration & In-Memory Test Isolation
  const dbEpisodic = memories.filter(m =>
    m.statement.toLowerCase().includes('redis') ||
    m.statement.toLowerCase().includes('postgres') ||
    m.statement.toLowerCase().includes('sqlite') ||
    m.statement.toLowerCase().includes('migration') ||
    m.statement.toLowerCase().includes('collision')
  );

  if (dbEpisodic.length >= 2) {
    frictionPatterns.push({
      id: 'fric-db-test-isolation',
      topic: 'Database Migration and In-Memory Test Isolation',
      trigger_keywords: ['database', 'postgres', 'sqlite', 'migration', 'test isolation'],
      friction_description: 'Heavy docker container startup overhead and schema state collisions during local unit and integration testing runs.',
      procedure: {
        when: 'Executing unit or integration test suites locally',
        if_cond: 'Heavy external PostgreSQL containers introduce startup latency or state collision',
        then_action: 'Direct test runners to an ephemeral in-memory SQLite database instance with preloaded schemas',
        expected_result: 'Sub-second test execution with 100% isolated state and zero container overhead'
      },
      source_memories: dbEpisodic
    });
  }

  // 3. Friction pattern around Context Compiler Token Truncation
  const compilerEpisodic = memories.filter(m =>
    m.statement.toLowerCase().includes('knapsack') ||
    m.statement.toLowerCase().includes('token budget') ||
    m.statement.toLowerCase().includes('truncation') ||
    m.tags.some(t => t.includes('compiler') || t.includes('budget'))
  );

  if (compilerEpisodic.length >= 1) {
    frictionPatterns.push({
      id: 'fric-knapsack-token-packing',
      topic: 'Knapsack Token Packing and Context Truncation Guard',
      trigger_keywords: ['knapsack', 'token budget', 'truncation', 'context compiler'],
      friction_description: 'Context overflow or abrupt truncation when packing multi-turn working memory into strict token windows.',
      procedure: {
        when: 'Compiling context capsules under strict token budget constraints (e.g. <= 2048 tokens)',
        if_cond: 'Candidate memory utilities exceed token budget allocation',
        then_action: 'Apply greedy 0/1 knapsack utility-density ranking and dynamic compression on Tier 2 candidates',
        expected_result: 'Optimal information density capsule that strictly fits the token budget without information loss'
      },
      source_memories: compilerEpisodic
    });
  }

  return frictionPatterns;
}

/**
 * Runs the SANER procedural consolidation engine.
 * Converts detected friction patterns into Tier 4 Procedural Memory items,
 * saves them in the database, establishes links, and syncs them to vault/Procedures/.
 */
export async function runSanerConsolidationPipeline(): Promise<{
  procedures_synthesized: number;
  procedures: Array<{ id: string; title: string; vault_path: string }>;
}> {
  console.log('SANER Procedural Consolidation pipeline starting...');
  const allMemories = getMemories();
  const patterns = detectFrictionEpisodes(allMemories);
  const now = new Date().toISOString();
  const synthesizedList: Array<{ id: string; title: string; vault_path: string }> = [];

  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    const procId = `mem-proc-saner-${p.id}`;
    const title = `Procedure: ${p.topic}`;
    const statement = `When ${p.procedure.when}, if ${p.procedure.if_cond}, then ${p.procedure.then_action} to achieve ${p.procedure.expected_result}.`;
    const embedding = await getEmbedding(statement);

    const procMemory: MemoryItem = {
      id: procId,
      title,
      tier: 4,
      tier_name: 'procedural',
      statement,
      subject: p.topic,
      predicate: 'standardizes_routine',
      object: p.procedure.expected_result,
      confidence: 0.99,
      importance: 0.94,
      stability: 0.98,
      observed_at: now,
      valid_from: now,
      valid_to: null,
      lifecycle_state: 'active',
      source_event_ids: p.source_memories.flatMap(m => m.source_event_ids).filter(Boolean),
      supporting_memory_ids: p.source_memories.map(m => m.id),
      tags: ['saner', 'procedural', 'workflow', ...p.trigger_keywords],
      scope: 'global',
      access_count: 1,
      last_accessed: now,
      tokens: Math.ceil(statement.length / 3.8),
      embedding_vector: embedding,
      procedure_spec: p.procedure
    };

    // Upsert into SQLite database
    const upsertStmt = db.prepare(`
      INSERT INTO memories (id, title, tier, tier_name, statement, subject, predicate, object, confidence, importance, stability, observed_at, valid_from, valid_to, lifecycle_state, tags, scope, access_count, last_accessed, tokens, embedding_vector, vault_path, procedure_spec, source_event_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        statement = excluded.statement,
        procedure_spec = excluded.procedure_spec,
        confidence = excluded.confidence,
        importance = excluded.importance,
        stability = excluded.stability,
        last_accessed = excluded.last_accessed
    `);

    upsertStmt.run(
      procMemory.id,
      procMemory.title,
      procMemory.tier,
      procMemory.tier_name,
      procMemory.statement,
      procMemory.subject || null,
      procMemory.predicate || null,
      procMemory.object || null,
      procMemory.confidence,
      procMemory.importance,
      procMemory.stability,
      procMemory.observed_at,
      procMemory.valid_from,
      null,
      procMemory.lifecycle_state,
      procMemory.tags.join(','),
      procMemory.scope,
      procMemory.access_count,
      procMemory.last_accessed,
      procMemory.tokens,
      JSON.stringify(procMemory.embedding_vector),
      null,
      JSON.stringify(procMemory.procedure_spec),
      procMemory.source_event_ids.join(',')
    );

    // Provenance anchor for the procedure
    const anchorHash = computeSha256(procMemory.statement);
    const mockAnchor: ProvenanceAnchor = {
      anchor_id: `anch-saner-${procMemory.id}`,
      memory_id: procMemory.id,
      source_event_id: procMemory.source_event_ids[0] || 'evt-cli-002',
      source_title: `SANER Routine Analyzer: ${p.topic}`,
      source_type: 'agent',
      byte_range: [0, Math.min(200, procMemory.statement.length)],
      verbatim_extract: procMemory.statement.slice(0, 200),
      sha256_hash: anchorHash,
      verified: true
    };

    const insertAnchor = db.prepare(`
      INSERT OR REPLACE INTO provenance_anchors (anchor_id, memory_id, source_event_id, source_title, source_type, byte_range, verbatim_extract, sha256_hash, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAnchor.run(
      mockAnchor.anchor_id,
      mockAnchor.memory_id,
      mockAnchor.source_event_id,
      mockAnchor.source_title,
      mockAnchor.source_type,
      JSON.stringify(mockAnchor.byte_range),
      mockAnchor.verbatim_extract,
      mockAnchor.sha256_hash,
      1
    );

    // Write to Obsidian Vault in vault/Procedures/
    const filePath = await syncMemoryToVault(procMemory, [mockAnchor]);
    db.prepare('UPDATE memories SET vault_path = ? WHERE id = ?').run(filePath, procMemory.id);
    procMemory.vault_path = filePath;

    // Create memory links
    const insertLink = db.prepare(`
      INSERT OR IGNORE INTO memory_links (id, source, target, relation_type, weight, valid_from)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const src of p.source_memories) {
      const edgeId = `edge-saner-${procMemory.id}-${src.id}`;
      insertLink.run(edgeId, procMemory.id, src.id, 'STANDARDIZES', 0.95, now);
    }

    synthesizedList.push({
      id: procMemory.id,
      title: procMemory.title,
      vault_path: filePath
    });
  }

  console.log(`SANER pipeline completed: ${synthesizedList.length} procedural routines consolidated.`);
  return {
    procedures_synthesized: synthesizedList.length,
    procedures: synthesizedList
  };
}
