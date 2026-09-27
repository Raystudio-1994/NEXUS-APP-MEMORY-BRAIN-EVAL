import { getEmbedding, cosineSimilarity } from '../embeddings';

/**
 * Computes semantic transition entropy delta across sentence embeddings:
 * ΔH = 1 - cos(E(s_i), E(s_{i+1}))
 * Splits chunks when semantic information shift exceeds the threshold.
 */
export async function entropyChunk(text: string, threshold = 0.75): Promise<string[]> {
  if (!text || text.trim().length === 0) return [];
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
  if (sentences.length <= 1) return [text];

  const embs: number[][] = [];
  for (const s of sentences) {
    embs.push(await getEmbedding(s));
  }

  const chunks: string[] = [];
  let cur = sentences[0];

  for (let i = 0; i < sentences.length - 1; i++) {
    const cos = cosineSimilarity(embs[i], embs[i + 1]);
    const deltaH = 1 - cos;
    if (deltaH > (1 - threshold)) {
      chunks.push(cur);
      cur = sentences[i + 1];
    } else {
      cur += ' ' + sentences[i + 1];
    }
  }
  chunks.push(cur);
  return chunks;
}

/**
 * Dynamic Knapsack compression & pruning when candidates exceed token budget:
 * Prioritizes high-utility items and prunes lower-relevance candidates to fit 85% of budget.
 */
export async function pruneOrSummarize(selected: any[], tokenBudget: number, query: string): Promise<any[]> {
  const getItemTokens = (m: any) => m.tokens ?? m.memory?.tokens ?? Math.ceil(((m.statement || m.memory?.statement || '').length) / 3.8);

  const totalTokens = selected.reduce((sum, m) => sum + getItemTokens(m), 0);
  if (totalTokens <= tokenBudget) {
    return selected;
  }

  // Selected is already sorted by knapsack priority; preserve that order and prune to fit budget cap
  const kept: any[] = [];
  let cur = 0;
  const budgetCap = tokenBudget * 0.85;

  for (const m of selected) {
    const t = getItemTokens(m);
    if (cur + t <= budgetCap) {
      kept.push(m);
      cur += t;
    }
  }

  return kept.length > 0 ? kept : selected.slice(0, 1);
}
