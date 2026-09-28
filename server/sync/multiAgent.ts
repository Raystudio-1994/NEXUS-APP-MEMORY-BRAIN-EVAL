import { getDb } from '../db';

export function ensureAgentScope(agentId: string): number {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as c FROM memories WHERE agent_id = ?`).get(agentId) as { c: number } | undefined;
    return row ? row.c : 0;
  } catch (err) {
    console.error('[MultiAgent] ensureAgentScope failed:', err);
    return 0;
  }
}

export function listAgents(): string[] {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT DISTINCT agent_id as id FROM memories WHERE agent_id IS NOT NULL`).all() as { id: string }[];
    return rows.map(r => r.id);
  } catch (err) {
    console.error('[MultiAgent] listAgents failed:', err);
    return ['default'];
  }
}
