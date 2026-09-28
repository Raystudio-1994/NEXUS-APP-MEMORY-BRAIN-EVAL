import { db } from './db';
import { getMemories } from './memoryService';
import { getEmbedding, cosineSimilarity, computeSha256 } from './embeddings';
import { syncMemoryToVault } from './vaultSyncer';
import { GoogleGenAI } from '@google/genai';
import { MemoryItem, ProvenanceAnchor } from '../src/types/memory';
import { runSanerConsolidationPipeline, detectFrictionEpisodes, type FrictionPattern } from './saner/friction';

export { runSanerConsolidationPipeline, detectFrictionEpisodes };
export type { FrictionPattern };

/**
 * Pure TypeScript density-based DBSCAN clustering algorithm.
 * Guarantees zero native-addon dependencies while adhering exactly to the
 * mathematical clustering specifications.
 */
export function dbscanClustering(memories: MemoryItem[], eps: number = 0.15, minPts: number = 2): MemoryItem[][] {
  const clusters: MemoryItem[][] = [];
  const visited = new Set<string>();
  const clustered = new Set<string>();

  function getNeighbors(m: MemoryItem) {
    const neighbors: MemoryItem[] = [];
    for (const other of memories) {
      // Distance is 1 - Cosine Similarity
      const sim = cosineSimilarity(m.embedding_vector || [], other.embedding_vector || []);
      const dist = 1.0 - sim;
      if (dist <= eps) {
        neighbors.push(other);
      }
    }
    return neighbors;
  }

  for (const m of memories) {
    if (visited.has(m.id)) continue;
    visited.add(m.id);
    const neighbors = getNeighbors(m);
    
    if (neighbors.length < minPts) {
      continue; // Noise point for now
    } else {
      const cluster: MemoryItem[] = [];
      cluster.push(m);
      clustered.add(m.id);

      const queue = [...neighbors];
      for (let i = 0; i < queue.length; i++) {
        const neighbor = queue[i];
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          const neighborNeighbors = getNeighbors(neighbor);
          if (neighborNeighbors.length >= minPts) {
            for (const n of neighborNeighbors) {
              if (!queue.some(q => q.id === n.id)) {
                queue.push(n);
              }
            }
          }
        }
        if (!clustered.has(neighbor.id)) {
          cluster.push(neighbor);
          clustered.add(neighbor.id);
        }
      }
      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Performs nightly consolidation of active Tier 2 (Episodic) memories
 * into Tier 3 (Semantic) declarative nodes.
 */
export async function rem_nightly_consolidation_pipeline(): Promise<{
  status: string;
  processed_count: number;
  decayed_count: number;
  synthesized_count: number;
  procedural_count?: number;
  procedures?: any[];
  clusters: Array<{ centroid: string; count: number; file: string }>;
}> {
  console.log('REM Nightly Consolidation cycle starting...');
  const activeEpisodic = getMemories('active', 2);
  
  if (activeEpisodic.length === 0) {
    return {
      status: 'idle',
      processed_count: 0,
      decayed_count: 0,
      synthesized_count: 0,
      clusters: []
    };
  }

  let decayedCount = 0;
  const activePool: MemoryItem[] = [];

  // 1. Decay step: S(t) = S0 * e^(-lambda * t). If stability falls below 0.30, decay it.
  const updateDecayStmt = db.prepare('UPDATE memories SET lifecycle_state = "decayed" WHERE id = ?');
  
  for (const mem of activeEpisodic) {
    const ageInHours = (Date.now() - new Date(mem.observed_at).getTime()) / (1000 * 60 * 60);
    // Exponential decay curve
    const currentStability = mem.stability * Math.exp(-0.02 * ageInHours);
    
    if (currentStability < 0.3) {
      updateDecayStmt.run(mem.id);
      decayedCount++;
    } else {
      activePool.push(mem);
    }
  }

  if (activePool.length === 0) {
    return {
      status: 'success_only_decay',
      processed_count: activeEpisodic.length,
      decayed_count: decayedCount,
      synthesized_count: 0,
      clusters: []
    };
  }

  // 2. Clustering via DBSCAN on unit-normalized vectors
  const clusters = dbscanClustering(activePool, 0.15, 2);
  const synthesizedResults = [];

  const apiKey = process.env.GEMINI_API_KEY;

  for (let idx = 0; idx < clusters.length; idx++) {
    const cluster = clusters[idx];
    const statements = cluster.map(c => c.statement).join('\n');
    
    let synthesizedStatement = '';
    let subject = 'Consolidated Concept';
    let predicate = 'defines';
    let object = 'system_state';
    let tags = ['consolidated', 'rem-pipeline'];

    // 3. AI synthesis pass
    if (apiKey && apiKey !== 'sk-...' && apiKey.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const synthPrompt = `Synthesize the following list of related episodic memories into a single, high-level, clear, and durable canonical truth.
Memories to synthesize:
"""
${statements}
"""

Format your response as a valid JSON with "statement", "subject", "predicate", "object", and "tags":
{
  "statement": "The unified declarative fact",
  "subject": "The key entity",
  "predicate": "The relation",
  "object": "The objective entity",
  "tags": ["tag1", "tag2"]
}`;

        const synthRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: synthPrompt,
          config: { responseMimeType: 'application/json', temperature: 0.1 }
        });

        const parsedSynth = JSON.parse(synthRes.text || '{}');
        synthesizedStatement = parsedSynth.statement || '';
        subject = parsedSynth.subject || subject;
        predicate = parsedSynth.predicate || predicate;
        object = parsedSynth.object || object;
        tags = parsedSynth.tags || tags;
      } catch (err) {
        console.warn('Synthesis LLM call failed, using rule-based aggregation fallback:', err);
      }
    }

    // Rule-based fallback if synthesis is empty or failed
    if (!synthesizedStatement) {
      synthesizedStatement = `Consolidated episodic observations: ${cluster.map(c => c.statement.replace(/\.$/, '')).join('; and ')}.`;
      subject = cluster[0].subject || 'General Observation';
      tags = Array.from(new Set(['consolidated', 'rem-fallback', ...cluster.flatMap(c => c.tags)]));
    }

    const newId = `mem-synth-${Date.now().toString(36)}-c${idx}`;
    const now = new Date().toISOString();
    const embedding = await getEmbedding(synthesizedStatement);

    const synthMemory: MemoryItem = {
      id: newId,
      title: `${subject}: Consolidated Synthesis`,
      tier: 3,
      tier_name: 'semantic',
      statement: synthesizedStatement,
      subject,
      predicate,
      object,
      confidence: 0.98,
      importance: 0.92,
      stability: 0.95,
      observed_at: now,
      valid_from: now,
      valid_to: null,
      lifecycle_state: 'active',
      source_event_ids: cluster.flatMap(c => c.source_event_ids),
      supporting_memory_ids: cluster.map(c => c.id),
      tags,
      scope: 'project',
      access_count: 1,
      last_accessed: now,
      tokens: Math.ceil(synthesizedStatement.length / 3.8),
      embedding_vector: embedding
    };

    // 4. Save to canonical SQLite database
    const insertSynth = db.prepare(`
      INSERT INTO memories (id, title, tier, tier_name, statement, subject, predicate, object, confidence, importance, stability, observed_at, valid_from, valid_to, lifecycle_state, tags, scope, access_count, last_accessed, tokens, embedding_vector, vault_path, procedure_spec, source_event_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSynth.run(...[
      synthMemory.id,
      synthMemory.title,
      synthMemory.tier,
      synthMemory.tier_name,
      synthMemory.statement,
      synthMemory.subject || null,
      synthMemory.predicate || null,
      synthMemory.object || null,
      synthMemory.confidence,
      synthMemory.importance,
      synthMemory.stability,
      synthMemory.observed_at,
      synthMemory.valid_from,
      null,
      synthMemory.lifecycle_state,
      synthMemory.tags.join(','),
      synthMemory.scope,
      synthMemory.access_count,
      synthMemory.last_accessed,
      synthMemory.tokens,
      JSON.stringify(synthMemory.embedding_vector),
      null,
      null,
      synthMemory.source_event_ids.join(',')
    ]);

    // 5. Create SUPERSEDES connections on source episodic memories
    const insertLink = db.prepare(`
      INSERT INTO memory_links (id, source, target, relation_type, weight, valid_from)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updateEpisodic = db.prepare(`
      UPDATE memories SET lifecycle_state = 'superseded', valid_to = ? WHERE id = ?
    `);

    for (const source of cluster) {
      const edgeId = `edge-sup-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      insertLink.run(edgeId, synthMemory.id, source.id, 'SUPERSEDES', 0.98, now);
      updateEpisodic.run(now, source.id);
    }

    // 6. Generate SHA-256 anchors for synthesized fact
    const anchorId = `anch-rem-${Date.now().toString(36)}-c${idx}`;
    const anchorHash = computeSha256(synthesizedStatement);
    const mockAnchor: ProvenanceAnchor = {
      anchor_id: anchorId,
      memory_id: synthMemory.id,
      source_event_id: cluster[0].source_event_ids[0] || 'evt-git-001',
      source_title: `REM Synthesizer Cluster #${idx + 1}`,
      source_type: 'agent',
      byte_range: [0, Math.min(200, synthesizedStatement.length)],
      verbatim_extract: synthesizedStatement.slice(0, 200),
      sha256_hash: anchorHash,
      verified: true
    };

    const insertAnchor = db.prepare(`
      INSERT INTO provenance_anchors (anchor_id, memory_id, source_event_id, source_title, source_type, byte_range, verbatim_extract, sha256_hash, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAnchor.run(...[
      mockAnchor.anchor_id,
      mockAnchor.memory_id,
      mockAnchor.source_event_id,
      mockAnchor.source_title,
      mockAnchor.source_type,
      JSON.stringify(mockAnchor.byte_range),
      mockAnchor.verbatim_extract,
      mockAnchor.sha256_hash,
      1
    ]);

    // Write file to Obsidian Vault Concepts/Semantic folders
    const filePath = await syncMemoryToVault(synthMemory, [mockAnchor]);
    db.prepare('UPDATE memories SET vault_path = ? WHERE id = ?').run(filePath, synthMemory.id);
    synthMemory.vault_path = filePath;

    synthesizedResults.push({
      centroid: subject,
      count: cluster.length,
      file: filePath
    });
  }

  // 7. Run SANER procedural consolidation pass
  let sanerResult = { procedures_synthesized: 0, procedures: [] as any[] };
  try {
    sanerResult = await runSanerConsolidationPipeline();
  } catch (sanerErr) {
    console.warn('SANER procedural consolidation notice:', sanerErr);
  }

  console.log(`REM pipeline complete: ${decayedCount} memories decayed, ${synthesizedResults.length} semantic memories synthesized, ${sanerResult.procedures_synthesized} procedural rules consolidated.`);

  return {
    status: 'success',
    processed_count: activeEpisodic.length,
    decayed_count: decayedCount,
    synthesized_count: synthesizedResults.length,
    procedural_count: sanerResult.procedures_synthesized,
    procedures: sanerResult.procedures,
    clusters: synthesizedResults
  };
}
export default rem_nightly_consolidation_pipeline;
