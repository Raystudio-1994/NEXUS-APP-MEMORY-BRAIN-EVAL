/**
 * Nexus-Memory-Fabric Core Type Definitions
 * Complete canonical data models for 4-tier persistence, temporal truth, and provenance.
 */

export type MemoryTier = 1 | 2 | 3 | 4;

export type MemoryTierName = 'working' | 'episodic' | 'semantic' | 'procedural';

export type EvidenceClass = 
  | 'OBSERVED'        // Direct sensor observation (e.g., git diff, terminal stdout)
  | 'DERIVED'         // Deterministic AST/rule derivation
  | 'INFERRED'        // Probabilistic LLM extraction
  | 'USER_CONFIRMED'  // Explicit human confirmation
  | 'EXTERNAL';       // Signed third-party API / webhook

export type RelationType = 
  | 'RELATES_TO'
  | 'CONTRADICTS'
  | 'EXPANDS_ON'
  | 'DERIVED_FROM'
  | 'SUPERSEDES'
  | 'DEPENDS_ON'
  | 'OBSERVED_AS'
  | 'RETRACTED_BY';

export type LifecycleState = 
  | 'active'
  | 'stale'
  | 'superseded'
  | 'decayed'
  | 'tombstoned';

export interface MemoryEvent {
  event_id: string;
  source_id: string;
  source_type: 'git' | 'filesystem' | 'terminal' | 'ui' | 'browser' | 'chat' | 'agent' | 'api';
  observed_at: string;
  ingested_at: string;
  payload: Record<string, any>;
  evidence_class: EvidenceClass;
  content_hash: string;
  session_id?: string;
  actor_id?: string;
  confidence: number;
}

export interface MemoryItem {
  id: string;
  title: string;
  tier: MemoryTier;
  tier_name: MemoryTierName;
  statement: string;
  subject?: string;
  predicate?: string;
  object?: string;
  confidence: number;       // 0.0 - 1.0
  importance: number;       // 0.0 - 1.0
  stability: number;        // Resistance to decay
  observed_at: string;
  valid_from: string;
  valid_to?: string | null; // null means indefinitely valid
  lifecycle_state: LifecycleState;
  source_event_ids: string[];
  supporting_memory_ids?: string[];
  conflicting_memory_ids?: string[];
  superseded_by?: string | null;
  supersedes?: string | null;
  tags: string[];
  scope: 'global' | 'project' | 'session' | 'agent';
  entropy_score?: number;
  access_count: number;
  last_accessed: string;
  tokens: number;
  embedding_vector?: number[]; // simulated 8D for visualization
  vault_path?: string;         // Obsidian markdown path
  procedure_spec?: {
    when: string;
    if_cond: string;
    then_action: string;
    expected_result: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: RelationType;
  weight: number;
  temporal_validity?: {
    valid_from: string;
    valid_to?: string | null;
  };
}

export interface ProvenanceAnchor {
  anchor_id: string;
  memory_id: string;
  source_event_id: string;
  source_title: string;
  source_type: string;
  byte_range: [number, number];
  verbatim_extract: string;
  sha256_hash: string;
  verified: boolean;
}

export interface ContextScoringWeights {
  semantic: number;    // w_s
  lexical: number;     // w_l
  entity: number;      // w_e
  graph: number;       // w_g
  temporal: number;    // w_t
  recency: number;     // w_r
  confidence: number;  // w_c
  authority: number;   // w_a
  decay_lambda: number;// Ebbinghaus decay rate
}

export interface CompiledContextCapsule {
  query_id: string;
  query: string;
  timestamp: string;
  token_budget: number;
  tokens_used: number;
  cache_hit?: boolean;
  entropy?: {
    shannon_entropy: number;
    normalized_entropy: number;
    perplexity: number;
  };
  state_summary: {
    current_project: string;
    active_branch: string;
    current_task: string;
    active_blocker?: string;
  };
  active_decisions: Array<{ id: string; decision: string; confidence: number }>;
  current_knowledge: Array<{ id: string; statement: string; tier: MemoryTier; score: number }>;
  relevant_procedures: Array<{ id: string; instruction: string }>;
  working_context?: Array<{ id: string; statement: string }>;
  selected_ids?: string[];
  evidence_citations: ProvenanceAnchor[];
  conflicts_detected: Array<{ claim_a: string; claim_b: string; resolution: string }>;
  trace: {
    candidates_retrieved: number;
    candidates_selected: number;
    latency_ms: number;
    retriever_breakdown: Record<string, number>;
  };
}

export interface ConsolidationCluster {
  cluster_id: string;
  centroid_topic: string;
  episodic_memory_ids: string[];
  synthesized_fact: string;
  extracted_tags: string[];
  extracted_action_items: string[];
  resolved_contradictions: string[];
  obsidian_vault_file: string;
  generated_edges: Array<{ target_id: string; relation: RelationType }>;
}

export interface SystemMetrics {
  total_events: number;
  active_memories: number;
  decayed_memories: number;
  graph_nodes: number;
  graph_edges: number;
  avg_retrieval_ms: number;
  token_density: number; // useful info / tokens
  provenance_verification_rate: number; // 100%
  cache_hit_rate: number;
}

/**
 * Robust MemoryEntry interface requested by user spec
 */
export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: string;
  weight: number; // stability / importance weight 0.0 - 1.0
  tags: string[];
  tier: MemoryTier;
  lifecycle_state: LifecycleState;
}

