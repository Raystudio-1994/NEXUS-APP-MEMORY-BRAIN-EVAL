import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { compileContext, extractSemanticMemories, verifyProvenance } from '../memoryService';
import { rem_nightly_consolidation_pipeline } from '../consolidation';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<any> | any;
}

/**
 * Traverses memory_links DAG from a root node up to a specified depth.
 */
export function graphTraverse(memoryId: string, relation?: string, depth: number = 2) {
  const visitedNodes = new Set<string>([memoryId]);
  const collectedEdges: Array<{ source: string; target: string; relation: string; weight: number }> = [];
  let currentLevel = [memoryId];

  for (let d = 0; d < Math.min(depth, 5); d++) {
    if (currentLevel.length === 0) break;
    const nextLevel: string[] = [];

    const placeholders = currentLevel.map(() => '?').join(',');
    let sql = `SELECT source_id, target_id, relation_type, weight FROM memory_links WHERE (source_id IN (${placeholders}) OR target_id IN (${placeholders}))`;
    const params = [...currentLevel, ...currentLevel];

    if (relation) {
      sql += ' AND relation_type = ?';
      params.push(relation);
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as unknown as Array<{ source_id: string; target_id: string; relation_type: string; weight: number }>;

    for (const edge of rows) {
      collectedEdges.push({
        source: edge.source_id,
        target: edge.target_id,
        relation: edge.relation_type,
        weight: edge.weight
      });

      if (!visitedNodes.has(edge.source_id)) {
        visitedNodes.add(edge.source_id);
        nextLevel.push(edge.source_id);
      }
      if (!visitedNodes.has(edge.target_id)) {
        visitedNodes.add(edge.target_id);
        nextLevel.push(edge.target_id);
      }
    }

    currentLevel = nextLevel;
  }

  // Fetch node metadata for visited nodes
  const nodePlaceholders = Array.from(visitedNodes).map(() => '?').join(',');
  const nodeStmt = db.prepare(`SELECT id, title, tier, tier_name, statement, lifecycle_state FROM memories WHERE id IN (${nodePlaceholders})`);
  const nodes = nodeStmt.all(...Array.from(visitedNodes));

  return {
    root_id: memoryId,
    traversal_depth: depth,
    total_nodes: nodes.length,
    total_edges: collectedEdges.length,
    nodes,
    edges: collectedEdges
  };
}

/**
 * Safely reads an Obsidian vault file.
 */
export function vaultRead(vaultPathInput: string): { path: string; content: string } {
  // Normalize and prevent directory traversal
  const cleanPath = vaultPathInput.replace(/^vault\/?/, '').replace(/\.\./g, '');
  const resolved = path.resolve(process.cwd(), 'vault', cleanPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Vault file not found at ${vaultPathInput}`);
  }

  const content = fs.readFileSync(resolved, 'utf8');
  return {
    path: vaultPathInput,
    content
  };
}

/**
 * The 6 canonical MCP tools for Nexus Memory Fabric.
 */
export const nexusTools: McpToolDefinition[] = [
  {
    name: 'nexus_search_memory',
    description: 'Search 4-tier memory with token budget knapsack packing and multi-signal scoring',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query or instruction' },
        tokenBudget: { type: 'number', description: 'Maximum tokens to pack into context capsule (default: 1500)' },
        tier: { type: 'number', description: 'Optional target memory tier (1: working, 2: episodic, 3: semantic, 4: procedural)' },
        lifecycle: { type: 'string', description: 'Filter by lifecycle state (active, superseded)' }
      },
      required: ['query']
    },
    handler: async ({ query, tokenBudget }) => {
      return compileContext(query, tokenBudget || 1500);
    }
  },
  {
    name: 'nexus_extract',
    description: 'Extract semantic memories from raw text via server-side pipeline',
    inputSchema: {
      type: 'object',
      properties: {
        rawInput: { type: 'string', description: 'Raw chat turn, logs, or documentation to extract from' },
        sourceType: { type: 'string', description: 'Source channel (chat, cli, fs, test)' }
      },
      required: ['rawInput']
    },
    handler: async ({ rawInput, sourceType }) => {
      return extractSemanticMemories(rawInput, sourceType || 'chat');
    }
  },
  {
    name: 'nexus_verify',
    description: 'Verify SHA-256 provenance byte anchors for a specific memory node',
    inputSchema: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'Unique identifier of the memory (e.g. mem-t3-001)' }
      },
      required: ['memoryId']
    },
    handler: async ({ memoryId }) => {
      return verifyProvenance(memoryId);
    }
  },
  {
    name: 'nexus_graph_traverse',
    description: 'Traverse memory_links DAG relations from a starting memory node',
    inputSchema: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'Root memory identifier to start traversal from' },
        relation: { type: 'string', description: 'Optional edge relation type filter (DEPENDS_ON, SUPERSEDES, etc.)' },
        depth: { type: 'number', description: 'Traversal depth hops (default: 2, max: 5)' }
      },
      required: ['memoryId']
    },
    handler: async ({ memoryId, relation, depth }) => {
      return graphTraverse(memoryId, relation, depth || 2);
    }
  },
  {
    name: 'nexus_vault_read',
    description: 'Read an Obsidian vault markdown note with frontmatter and wiki-links',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Relative path in vault (e.g. Semantic/Nexus_Architecture_Invariant.md)' }
      },
      required: ['vaultPath']
    },
    handler: async ({ vaultPath }) => {
      return vaultRead(vaultPath);
    }
  },
  {
    name: 'nexus_consolidate',
    description: 'Trigger REM DBSCAN clustering and memory consolidation pipeline',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      return rem_nightly_consolidation_pipeline();
    }
  }
];
