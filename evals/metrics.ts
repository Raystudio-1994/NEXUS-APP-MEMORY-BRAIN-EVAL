/**
 * Pure evaluation metrics for Nexus Memory OS.
 * Zero simulation - every score is computed from real retrieved sets and SQLite states.
 */

/**
 * Recall@K: Proportion of expected target memory IDs present in the top-K retrieved memories.
 * Formula: |retrieved[0..K] ∩ expected| / |expected|
 */
export function recallAtK(retrieved: string[], expected: string[], k: number = 5): number {
  if (!expected || expected.length === 0) return 1.0;
  if (!retrieved || retrieved.length === 0) return 0.0;

  const topK = new Set(retrieved.slice(0, k));
  const hits = expected.filter(id => topK.has(id)).length;
  return hits / expected.length;
}

/**
 * Mean Reciprocal Rank (MRR): 1 / rank of the first relevant document in the retrieved list.
 * 1-indexed. Returns 0 if none of the expected documents appear in the retrieved set.
 */
export function computeMRR(retrieved: string[], expected: string[]): number {
  if (!expected || expected.length === 0) return 1.0;
  if (!retrieved || retrieved.length === 0) return 0.0;

  const expectedSet = new Set(expected);
  for (let i = 0; i < retrieved.length; i++) {
    if (expectedSet.has(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0.0;
}

/**
 * Token Density: Efficiency metric measuring selected memory candidates per unit of token consumption.
 * Formula: (candidates_selected / tokens_used) * 100
 */
export function computeTokenDensity(candidatesSelected: number, tokensUsed: number): number {
  if (tokensUsed <= 0) return 0.0;
  return (candidatesSelected / tokensUsed) * 100;
}

/**
 * Semantic Coverage: Verifies that required domain keywords appear in compiled context content.
 * Formula: found_keywords / must_include.length
 */
export function computeCoverage(content: string, mustInclude?: string[]): number {
  if (!mustInclude || mustInclude.length === 0) return 1.0;
  if (!content) return 0.0;

  const lower = content.toLowerCase();
  let found = 0;
  for (const term of mustInclude) {
    if (lower.includes(term.toLowerCase())) {
      found++;
    }
  }
  return found / mustInclude.length;
}
