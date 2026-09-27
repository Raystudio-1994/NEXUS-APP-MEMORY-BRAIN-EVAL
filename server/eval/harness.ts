import { compileContext } from '../memoryService';
import { loadJsonl, GoldenQuery } from '../../evals/runner';
import { recallAtK, computeMRR } from '../../evals/metrics';
import { db } from '../db';
import { initEvalTables, getLatestEvalRun, getEvalHistory, getEvalRunResults, EvalRunRecord } from './store';
import { Weights } from '../apex/weights';

export interface EvalHarnessSummary {
  runId: string;
  timestamp: string;
  prompt_version: string;
  weights: Partial<Weights>;
  total_queries: number;
  avg_recall_at_5: number;
  avg_recall_at_10: number;
  avg_mrr: number;
  avg_token_density: number;
  queries_evaluated: number;
}

/**
 * Runs the nightly evaluation harness over golden_queries.jsonl against SQLite memories.
 * Zero simulation: Every score is computed directly from compileContext, cosine similarity,
 * knapsack budget selection, and actual expected ID overlaps.
 */
export async function runEvalHarness(
  weightsOverride?: Partial<Weights>,
  promptVersion: string = 'v1.0.0',
  queryFilter?: (q: GoldenQuery) => boolean
): Promise<EvalHarnessSummary> {
  initEvalTables();
  const allQueries = loadJsonl();
  const queries = queryFilter ? allQueries.filter(queryFilter) : allQueries;

  if (queries.length === 0) {
    throw new Error('No golden queries available for evaluation.');
  }

  const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  let sumR5 = 0;
  let sumR10 = 0;
  let sumMRR = 0;
  let sumDensity = 0;

  const insertResultStmt = db.prepare(`
    INSERT INTO eval_results (run_id, query_id, recall_at_5, recall_at_10, mrr, token_density, retrieved_ids, expected_ids, latency_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of queries) {
    const start = Date.now();
    const capsule = await compileContext(q.query, q.token_budget || 1500, weightsOverride);
    const latencyMs = Date.now() - start;

    // Full retrieved memory IDs in order of knapsack selection
    const retrieved: string[] = capsule.selected_ids && capsule.selected_ids.length > 0
      ? capsule.selected_ids
      : [
          ...(capsule.working_context || []).map(w => w.id),
          ...capsule.current_knowledge.map(k => k.id),
          ...capsule.active_decisions.map(d => d.id),
          ...capsule.relevant_procedures.map(p => p.id)
        ];

    const r5 = recallAtK(retrieved, q.expected_ids, 5);
    const r10 = recallAtK(retrieved, q.expected_ids, 10);
    const mrr = computeMRR(retrieved, q.expected_ids);
    const density = capsule.tokens_used > 0
      ? (capsule.trace.candidates_selected / capsule.tokens_used) * 100
      : 0;

    sumR5 += r5;
    sumR10 += r10;
    sumMRR += mrr;
    sumDensity += density;

    insertResultStmt.run(
      runId,
      q.id,
      r5,
      r10,
      mrr,
      density,
      JSON.stringify(retrieved),
      JSON.stringify(q.expected_ids),
      latencyMs
    );
  }

  const avgR5 = parseFloat((sumR5 / queries.length).toFixed(4));
  const avgR10 = parseFloat((sumR10 / queries.length).toFixed(4));
  const avgMRR = parseFloat((sumMRR / queries.length).toFixed(4));
  const avgDensity = parseFloat((sumDensity / queries.length).toFixed(4));

  const insertRunStmt = db.prepare(`
    INSERT INTO eval_runs (run_id, timestamp, prompt_version, weights_json, total_queries, avg_recall_at_k, avg_token_density, avg_mrr)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRunStmt.run(
    runId,
    now,
    promptVersion,
    JSON.stringify(weightsOverride || {}),
    queries.length,
    avgR5,
    avgDensity,
    avgMRR
  );

  return {
    runId,
    timestamp: now,
    prompt_version: promptVersion,
    weights: weightsOverride || {},
    total_queries: queries.length,
    avg_recall_at_5: avgR5,
    avg_recall_at_10: avgR10,
    avg_mrr: avgMRR,
    avg_token_density: avgDensity,
    queries_evaluated: queries.length
  };
}

export { getLatestEvalRun, getEvalHistory, getEvalRunResults };
