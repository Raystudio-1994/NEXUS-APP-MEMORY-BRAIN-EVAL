import { createRequire } from 'module';
import { getDb } from './db';

const require = createRequire(import.meta.url);
let vecInitialized = false;

/**
 * Initializes sqlite-vec virtual table or falls back to JSON cosine store.
 */
export function initVecTable(): void {
  const db = getDb();
  try {
    // Try to load sqlite-vec extension if supported by runtime
    const sqliteVec = require('sqlite-vec');
    if (typeof (db as any).loadExtension === 'function') {
      sqliteVec.load(db);
    }
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(embedding float[768], memory_id TEXT PARTITION KEY)`);
    vecInitialized = true;
    console.log('sqlite-vec vec0 table initialized successfully');
  } catch (e) {
    console.warn('sqlite-vec vec0 not available, using fallback JSON cosine store:', (e as any)?.message || e);
    db.exec(`CREATE TABLE IF NOT EXISTS vec_memories_fallback (memory_id TEXT PRIMARY KEY, embedding TEXT)`);
  }
}

/**
 * Upserts a 768-dimensional float embedding for a memory ID.
 */
export function upsertVector(memoryId: string, embedding: number[]): void {
  const db = getDb();
  if (vecInitialized) {
    try {
      db.prepare(`INSERT OR REPLACE INTO vec_memories(memory_id, embedding) VALUES (?, ?)`).run(memoryId, JSON.stringify(embedding));
    } catch {
      db.prepare(`INSERT OR REPLACE INTO vec_memories_fallback (memory_id, embedding) VALUES (?, ?)`).run(memoryId, JSON.stringify(embedding));
    }
  } else {
    try {
      db.prepare(`INSERT OR REPLACE INTO vec_memories_fallback (memory_id, embedding) VALUES (?, ?)`).run(memoryId, JSON.stringify(embedding));
    } catch (err) {
      console.warn('Failed to upsert fallback vector:', err);
    }
  }
}

/**
 * Executes K-Nearest Neighbor (KNN) vector similarity search.
 */
export function knnSearch(queryEmbedding: number[], k: number = 10): string[] {
  const db = getDb();
  if (vecInitialized) {
    try {
      const rows = db.prepare(`SELECT memory_id, distance FROM vec_memories WHERE embedding MATCH ? AND k = ? ORDER BY distance`).all(JSON.stringify(queryEmbedding), k) as any[];
      if (rows && rows.length > 0) {
        return rows.map(r => r.memory_id);
      }
    } catch {
      // Fall through to fallback
    }
  }
  return fallbackKnn(queryEmbedding, k);
}

function fallbackKnn(q: number[], k: number): string[] {
  try {
    const rows = getDb().prepare(`SELECT id, embedding_vector FROM memories WHERE embedding_vector IS NOT NULL`).all() as any[];
    const { cosineSimilarity } = require('./embeddings');
    return rows
      .map(r => {
        try {
          const vec = JSON.parse(r.embedding_vector);
          return { id: r.id, score: cosineSimilarity(q, vec) };
        } catch {
          return { id: r.id, score: 0 };
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(r => r.id);
  } catch {
    return [];
  }
}
