import fs from 'fs';
import path from 'path';

export interface ScoringWeights {
  semantic: number;
  lexical: number;
  entity: number;
  graph: number;
  temporal: number;
  recency: number;
  confidence?: number;
  authority?: number;
  decay_lambda?: number;
}

export const defaultWeights: ScoringWeights = {
  semantic: 0.35,
  lexical: 0.15,
  entity: 0.15,
  graph: 0.15,
  temporal: 0.10,
  recency: 0.10,
  confidence: 0.80,
  authority: 0.90,
  decay_lambda: 0.05
};

export type Weights = ScoringWeights;

const WEIGHTS_FILE_PATH = path.resolve(process.cwd(), 'server/apex/weights.json');

/**
 * Normalizes retrieval signal weights so their sum equals exactly 1.0.
 */
export function normalizeWeights(weights: ScoringWeights): ScoringWeights {
  const sum =
    weights.semantic +
    weights.lexical +
    weights.entity +
    weights.graph +
    weights.temporal +
    weights.recency;

  if (sum <= 0) {
    return { ...defaultWeights };
  }

  return {
    semantic: parseFloat((weights.semantic / sum).toFixed(4)),
    lexical: parseFloat((weights.lexical / sum).toFixed(4)),
    entity: parseFloat((weights.entity / sum).toFixed(4)),
    graph: parseFloat((weights.graph / sum).toFixed(4)),
    temporal: parseFloat((weights.temporal / sum).toFixed(4)),
    recency: parseFloat((weights.recency / sum).toFixed(4)),
    confidence: weights.confidence ?? defaultWeights.confidence,
    authority: weights.authority ?? defaultWeights.authority,
    decay_lambda: weights.decay_lambda ?? defaultWeights.decay_lambda
  };
}

/**
 * Loads active weights from disk or defaults.
 */
export function loadCurrentWeights(): ScoringWeights {
  try {
    if (fs.existsSync(WEIGHTS_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(WEIGHTS_FILE_PATH, 'utf8'));
      return normalizeWeights({ ...defaultWeights, ...data });
    }
  } catch (err) {
    console.warn('Failed reading server/apex/weights.json, falling back to default weights:', err);
  }
  return { ...defaultWeights };
}

/**
 * Persists current weights to disk.
 */
export function saveCurrentWeights(weights: ScoringWeights): void {
  const dir = path.dirname(WEIGHTS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(WEIGHTS_FILE_PATH, JSON.stringify(weights, null, 2), 'utf8');
}
