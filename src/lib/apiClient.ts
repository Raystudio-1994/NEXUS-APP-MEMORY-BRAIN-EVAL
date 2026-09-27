import { MemoryItem, MemoryEvent, GraphEdge, ProvenanceAnchor, CompiledContextCapsule, ContextScoringWeights } from '../types/memory';

/**
 * Production-grade API Client interfacing the React frontend with the
 * Express-backed persistent memory OS backend securely.
 */
export const api = {
  /**
   * Retrieves active/filtered memories from SQLite canonical store.
   */
  async listMemories(lifecycle?: string, tier?: number): Promise<MemoryItem[]> {
    const params = new URLSearchParams();
    if (lifecycle) params.append('lifecycle_state', lifecycle);
    if (tier) params.append('tier', String(tier));
    
    const response = await fetch(`/api/memory?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to retrieve memories.');
    return response.json();
  },

  /**
   * Retrieves raw ingestion events from backend event log.
   */
  async listEvents(): Promise<MemoryEvent[]> {
    const response = await fetch('/api/memory/events');
    if (!response.ok) throw new Error('Failed to retrieve events.');
    return response.json();
  },

  /**
   * Retrieves bi-directional relationships from backend edge DAG.
   */
  async listEdges(): Promise<GraphEdge[]> {
    const response = await fetch('/api/memory/edges');
    if (!response.ok) throw new Error('Failed to retrieve graph edges.');
    return response.json();
  },

  /**
   * Retrieves verifiable citation anchors.
   */
  async listAnchors(): Promise<ProvenanceAnchor[]> {
    const response = await fetch('/api/memory/anchors');
    if (!response.ok) throw new Error('Failed to retrieve anchors.');
    return response.json();
  },

  /**
   * Creates a manual memory node directly in SQLite.
   */
  async createMemory(memory: Partial<MemoryItem>): Promise<{ success: boolean; id: string }> {
    const response = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory)
    });
    if (!response.ok) throw new Error('Failed to create memory.');
    return response.json();
  },

  /**
   * Creates a manual link edge between memories in SQLite.
   */
  async createLink(source: string, target: string, relationType: string, weight?: number): Promise<{ success: boolean; id: string }> {
    const response = await fetch('/api/memory/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target, relation_type: relationType, weight })
    });
    if (!response.ok) throw new Error('Failed to create relationship link.');
    return response.json();
  },

  /**
   * Performs cascade deletion of a memory and its links, anchors, and vault files.
   */
  async deleteMemory(id: string): Promise<boolean> {
    const response = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete memory.');
    const data = await response.json();
    return data.success;
  },

  /**
   * Initiates secure server-side semantic LLM extraction.
   */
  async extract(rawInput: string, sourceType: string = 'chat'): Promise<{
    events: MemoryEvent[];
    memories: MemoryItem[];
    citations: ProvenanceAnchor[];
  }> {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawInput, sourceType })
    });
    if (!response.ok) throw new Error('Extraction failed on server.');
    return response.json();
  },

  /**
   * Submits prompt budget and calculates true cosine similarity scores + knapsack context packing.
   */
  async compile(query: string, tokenBudget: number = 1500, weights?: Partial<ContextScoringWeights>): Promise<CompiledContextCapsule> {
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, tokenBudget, weights })
    });
    if (!response.ok) throw new Error('Context compilation failed on server.');
    return response.json();
  },

  /**
   * Triggers the REM Sleep density clustering and Ebbinghaus decay process on demand.
   */
  async triggerConsolidation(): Promise<{
    status: string;
    processed_count: number;
    decayed_count: number;
    synthesized_count: number;
    clusters: Array<{ centroid: string; count: number; file: string }>;
  }> {
    const response = await fetch('/api/consolidation/run', { method: 'POST' });
    if (!response.ok) throw new Error('Consolidation run trigger failed.');
    return response.json();
  },

  /**
   * Queries status on remaining unconsolidated active episodic logs.
   */
  async getConsolidationStatus(): Promise<{
    unconsolidated_episodic_memories: number;
    interval: string;
    service_status: string;
    consolidator: string;
  }> {
    const response = await fetch('/api/consolidation/status');
    if (!response.ok) throw new Error('Failed to fetch consolidation status.');
    return response.json();
  },

  /**
   * Verifies hashes and byte range indices for a specific memory node.
   */
  async verifyProvenance(memoryId: string): Promise<{
    verified: boolean;
    checks: Array<{
      anchor_id: string;
      hash_match: boolean;
      byte_range_match: boolean;
      event_exists: boolean;
    }>;
  }> {
    const response = await fetch(`/api/provenance/verify/${memoryId}`);
    if (!response.ok) throw new Error('Provenance verification failed.');
    return response.json();
  }
};
export default api;
