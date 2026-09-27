import fs from 'fs';
import path from 'path';
import { recallAtK, computeMRR, computeTokenDensity, computeCoverage } from './metrics';

export interface GoldenQuery {
  id: string;
  query: string;
  expected_ids: string[];
  must_include?: string[];
  temporal_filter?: string;
  tier_target?: number;
  token_budget?: number;
  tags?: string[];
}

export interface QueryEvalResult {
  query_id: string;
  query: string;
  recall_at_5: number;
  recall_at_10: number;
  mrr: number;
  token_density: number;
  coverage: number;
  retrieved_ids: string[];
  expected_ids: string[];
  tokens_used: number;
  latency_ms: number;
}

/**
 * Loads golden queries from the JSONL dataset file.
 */
export function loadJsonl(datasetPath?: string): GoldenQuery[] {
  const resolvedPath = datasetPath || path.resolve(process.cwd(), 'evals/datasets/golden_queries.jsonl');
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Golden queries dataset not found at ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  return lines.map((line, idx) => {
    try {
      return JSON.parse(line) as GoldenQuery;
    } catch (e: any) {
      throw new Error(`Failed parsing JSONL line ${idx + 1}: ${e.message}`);
    }
  });
}

/**
 * Evaluates a single retrieved result against a golden query specification.
 */
export function evaluateQueryResult(
  query: GoldenQuery,
  retrievedIds: string[],
  tokensUsed: number,
  selectedCount: number,
  compiledText: string,
  latencyMs: number
): QueryEvalResult {
  const r5 = recallAtK(retrievedIds, query.expected_ids, 5);
  const r10 = recallAtK(retrievedIds, query.expected_ids, 10);
  const mrr = computeMRR(retrievedIds, query.expected_ids);
  const tokenDensity = computeTokenDensity(selectedCount, tokensUsed);
  const coverage = computeCoverage(compiledText, query.must_include);

  return {
    query_id: query.id,
    query: query.query,
    recall_at_5: r5,
    recall_at_10: r10,
    mrr,
    token_density: tokenDensity,
    coverage,
    retrieved_ids: retrievedIds,
    expected_ids: query.expected_ids,
    tokens_used: tokensUsed,
    latency_ms: latencyMs
  };
}
