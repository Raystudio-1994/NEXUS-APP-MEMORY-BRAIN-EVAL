import { getDb, db } from '../db';

export interface EvalRunRecord {
  run_id: string;
  timestamp: string;
  prompt_version: string;
  weights_json: string;
  total_queries: number;
  avg_recall_at_k: number;
  avg_token_density: number;
  avg_mrr: number;
}

export interface EvalResultRecord {
  run_id: string;
  query_id: string;
  recall_at_5: number;
  recall_at_10: number;
  mrr: number;
  token_density: number;
  retrieved_ids: string;
  expected_ids: string;
  latency_ms: number;
}

/**
 * Initializes eval schema tables in SQLite.
 */
export function initEvalTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS eval_runs (
      run_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      prompt_version TEXT,
      weights_json TEXT,
      total_queries INTEGER NOT NULL,
      avg_recall_at_k REAL NOT NULL,
      avg_token_density REAL NOT NULL,
      avg_mrr REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS eval_results (
      run_id TEXT NOT NULL,
      query_id TEXT NOT NULL,
      recall_at_5 REAL NOT NULL,
      recall_at_10 REAL NOT NULL,
      mrr REAL NOT NULL,
      token_density REAL NOT NULL,
      retrieved_ids TEXT NOT NULL,
      expected_ids TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      PRIMARY KEY (run_id, query_id)
    );
  `);
}

/**
 * Saves a completed evaluation run aggregate.
 */
export function saveEvalRun(record: EvalRunRecord): void {
  initEvalTables();
  const stmt = db.prepare(`
    INSERT INTO eval_runs (run_id, timestamp, prompt_version, weights_json, total_queries, avg_recall_at_k, avg_token_density, avg_mrr)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.run_id,
    record.timestamp,
    record.prompt_version,
    record.weights_json,
    record.total_queries,
    record.avg_recall_at_k,
    record.avg_token_density,
    record.avg_mrr
  );
}

/**
 * Saves an individual query evaluation result.
 */
export function saveEvalResult(record: EvalResultRecord): void {
  initEvalTables();
  const stmt = db.prepare(`
    INSERT INTO eval_results (run_id, query_id, recall_at_5, recall_at_10, mrr, token_density, retrieved_ids, expected_ids, latency_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.run_id,
    record.query_id,
    record.recall_at_5,
    record.recall_at_10,
    record.mrr,
    record.token_density,
    record.retrieved_ids,
    record.expected_ids,
    record.latency_ms
  );
}

/**
 * Fetches the most recent eval run.
 */
export function getLatestEvalRun(): EvalRunRecord | null {
  initEvalTables();
  const stmt = db.prepare('SELECT * FROM eval_runs ORDER BY timestamp DESC LIMIT 1');
  const row = stmt.get() as unknown as EvalRunRecord | undefined;
  return row || null;
}

/**
 * Fetches historical eval runs.
 */
export function getEvalHistory(limit: number = 30): EvalRunRecord[] {
  initEvalTables();
  const stmt = db.prepare('SELECT * FROM eval_runs ORDER BY timestamp DESC LIMIT ?');
  return stmt.all(limit) as unknown as EvalRunRecord[];
}

/**
 * Fetches granular query results for a specific run.
 */
export function getEvalRunResults(runId: string): EvalResultRecord[] {
  initEvalTables();
  const stmt = db.prepare('SELECT * FROM eval_results WHERE run_id = ?');
  return stmt.all(runId) as unknown as EvalResultRecord[];
}
