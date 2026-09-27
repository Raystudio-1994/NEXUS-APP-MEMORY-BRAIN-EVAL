import fs from 'fs';
import path from 'path';

let kuzuDb: any = null;
let kuzuConn: any = null;

/**
 * Initializes Kùzu embedded property graph database at data/graph.
 */
export async function initKuzu(): Promise<void> {
  const dir = path.resolve(process.env.KUZU_DB_PATH || './data/graph');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    // @ts-ignore
    const { Database, Connection } = await import('kuzu');
    kuzuDb = new Database(dir);
    kuzuConn = new Connection(kuzuDb);

    try {
      await kuzuConn.query(`CREATE NODE TABLE IF NOT EXISTS Memory(id STRING, statement STRING, tier INT64, subject STRING, predicate STRING, confidence DOUBLE, importance DOUBLE, lifecycle STRING, PRIMARY KEY(id))`);
    } catch {}

    try {
      await kuzuConn.query(`CREATE REL TABLE IF NOT EXISTS RELATES_TO(FROM Memory TO Memory, weight DOUBLE, relation STRING)`);
    } catch {}

    try {
      await kuzuConn.query(`CREATE REL TABLE IF NOT EXISTS SUPERSEDES(FROM Memory TO Memory, weight DOUBLE)`);
    } catch {}

    try {
      await kuzuConn.query(`CREATE REL TABLE IF NOT EXISTS CONTRADICTS(FROM Memory TO Memory, weight DOUBLE)`);
    } catch {}

    console.log('Kuzu embedded property graph initialized at', dir);
  } catch (e: any) {
    console.warn('Kuzu not available, using SQLite memory_links fallback:', e?.message || e);
  }
}

/**
 * Upserts a memory node into the Kùzu graph.
 */
export async function kuzuUpsertMemory(m: any): Promise<void> {
  if (!kuzuConn) return;
  try {
    await kuzuConn.query(
      `MERGE (n:Memory {id: $id}) SET n.statement=$st, n.tier=$tier, n.subject=$sub`,
      { id: m.id, st: m.statement || '', tier: m.tier || 2, sub: m.subject || '' }
    );
  } catch (err) {
    console.warn('kuzuUpsertMemory notice:', err);
  }
}

/**
 * Creates a directed weighted relationship edge in the Kùzu graph.
 */
export async function kuzuCreateEdge(source: string, target: string, rel: string, weight: number): Promise<void> {
  if (!kuzuConn) return;
  try {
    const validRel = ['RELATES_TO', 'SUPERSEDES', 'CONTRADICTS'].includes(rel) ? rel : 'RELATES_TO';
    await kuzuConn.query(
      `MATCH (a:Memory {id:$src}), (b:Memory {id:$tgt}) CREATE (a)-[:${validRel} {weight:$w}]->(b)`,
      { src: source, tgt: target, w: weight }
    );
  } catch (err) {
    console.warn('kuzuCreateEdge notice:', err);
  }
}

/**
 * Returns active Kùzu Connection instance.
 */
export function getKuzuConnection() {
  return kuzuConn;
}
