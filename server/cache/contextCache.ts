import { CompiledContextCapsule } from '../../src/types/memory';
import { createHash } from 'crypto';

interface CacheEntry {
  capsule: CompiledContextCapsule;
  expiresAt: number;
  hitCount: number;
  createdAt: number;
}

export class ContextCompilerCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number;
  private defaultTtlMs: number;
  private totalHits: number = 0;
  private totalMisses: number = 0;

  constructor(maxEntries: number = 200, defaultTtlMs: number = 5 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  public generateKey(query: string, tokenBudget: number = 1500, weightsOverride?: any): string {
    const raw = `${query.trim().toLowerCase()}|${tokenBudget}|${JSON.stringify(weightsOverride || {})}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  public get(key: string): CompiledContextCapsule | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }

    entry.hitCount++;
    this.totalHits++;

    // Return a clone marked with cache_hit = true and instantaneous latency
    return {
      ...entry.capsule,
      cache_hit: true,
      trace: {
        ...entry.capsule.trace,
        latency_ms: 1,
        retriever_breakdown: {
          ...entry.capsule.trace.retriever_breakdown,
          cache_hit: 1
        }
      }
    };
  }

  public set(key: string, capsule: CompiledContextCapsule, ttlMs: number = this.defaultTtlMs): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      capsule: { ...capsule, cache_hit: false },
      expiresAt: Date.now() + ttlMs,
      hitCount: 0,
      createdAt: Date.now()
    });
  }

  public clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  public getStats(): {
    size: number;
    hits: number;
    misses: number;
    hit_rate: number;
  } {
    const total = this.totalHits + this.totalMisses;
    return {
      size: this.cache.size,
      hits: this.totalHits,
      misses: this.totalMisses,
      hit_rate: total > 0 ? parseFloat((this.totalHits / total).toFixed(4)) : 0
    };
  }
}

export const globalContextCache = new ContextCompilerCache();
