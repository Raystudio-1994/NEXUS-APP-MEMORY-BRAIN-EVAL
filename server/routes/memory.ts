import { Router, Request, Response } from 'express';
import { db } from '../db';
import { getMemories, deleteMemoryCascade, getGraphCentrality } from '../memoryService';
import { getEmbedding, generateFallbackEmbedding } from '../embeddings';
import { upsertVector } from '../vectorStore';
import { kuzuUpsertMemory, kuzuCreateEdge } from '../graphStore';

const router = Router();

// GET /api/memory - List memories with optional filtering
router.get('/', (req: Request, res: Response) => {
  try {
    const { lifecycle_state, tier } = req.query;
    const tierNum = tier ? parseInt(tier as string, 10) : undefined;
    const results = getMemories(lifecycle_state as string, tierNum);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve memories', details: err.message });
  }
});

// GET /api/memory/events - List raw ingestion events
router.get('/events', (req: Request, res: Response) => {
  try {
    const stmt = db.prepare('SELECT * FROM memory_events ORDER BY observed_at DESC');
    const rows = stmt.all() as any[];
    const parsedRows = rows.map(r => ({
      ...r,
      payload: JSON.parse(r.payload)
    }));
    res.json(parsedRows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve events', details: err.message });
  }
});

// GET /api/memory/edges - List memory graph edges
router.get('/edges', (req: Request, res: Response) => {
  try {
    const stmt = db.prepare('SELECT * FROM memory_links');
    const rows = stmt.all() as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve graph links', details: err.message });
  }
});

// GET /api/memory/anchors - List provenance anchors
router.get('/anchors', (req: Request, res: Response) => {
  try {
    const stmt = db.prepare('SELECT * FROM provenance_anchors');
    const rows = stmt.all() as any[];
    const parsed = rows.map(r => ({
      ...r,
      byte_range: JSON.parse(r.byte_range)
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve anchors', details: err.message });
  }
});

// POST /api/memory - Directly create a memory entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id: reqId, title, tier, statement, subject, predicate, object, confidence, importance, stability, tags, scope, source_event_ids } = req.body;
    
    if (!title || !statement || !tier) {
      return res.status(400).json({ error: 'Title, statement, and tier are required.' });
    }

    const id = reqId || `mem-manual-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    const tierName = { 1: 'working', 2: 'episodic', 3: 'semantic', 4: 'procedural' }[tier as 1|2|3|4] || 'working';
    const sourceEvents = Array.isArray(source_event_ids) ? source_event_ids.join(',') : (source_event_ids || '');
    const embedding = await getEmbedding(statement);

    const insertStmt = db.prepare(`
      INSERT INTO memories (id, title, tier, tier_name, statement, subject, predicate, object, confidence, importance, stability, observed_at, valid_from, valid_to, lifecycle_state, tags, scope, access_count, last_accessed, tokens, embedding_vector, vault_path, procedure_spec, source_event_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(...[
      id,
      title,
      tier,
      tierName,
      statement,
      subject || null,
      predicate || null,
      object || null,
      confidence || 1.0,
      importance || 0.8,
      stability || 0.9,
      now,
      now,
      null,
      'active',
      tagsStr,
      scope || 'project',
      1,
      now,
      Math.ceil(statement.length / 3.8),
      JSON.stringify(embedding),
      null,
      null,
      sourceEvents
    ]);

    upsertVector(id, embedding);
    await kuzuUpsertMemory({
      id,
      statement,
      tier,
      subject: subject || ''
    });

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create memory', details: err.message });
  }
});

// POST /api/memory/links - Connect two memory nodes manually
router.post('/links', async (req: Request, res: Response) => {
  try {
    const { source, target, relation_type, weight } = req.body;
    if (!source || !target || !relation_type) {
      return res.status(400).json({ error: 'source, target, and relation_type are required.' });
    }

    const id = `edge-man-${Date.now().toString(36)}`;
    const insertStmt = db.prepare(`
      INSERT INTO memory_links (id, source, target, relation_type, weight, valid_from)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const edgeWeight = weight || 1.0;
    insertStmt.run(id, source, target, relation_type, edgeWeight, new Date().toISOString());
    await kuzuCreateEdge(source, target, relation_type, edgeWeight);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create graph edge', details: err.message });
  }
});

// DELETE /api/memory/:id - Cascade deletion of memory node
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await deleteMemoryCascade(id);
    if (success) {
      res.json({ success: true, message: `Memory ${id} deleted successfully along with its dependencies.` });
    } else {
      res.status(404).json({ error: `Memory ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete memory', details: err.message });
  }
});

// GET /api/memory/:id/graph - Query relations of a specific node
router.get('/:id/graph', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT ml.*, m1.title as source_title, m2.title as target_title
      FROM memory_links ml
      JOIN memories m1 ON ml.source = m1.id
      JOIN memories m2 ON ml.target = m2.id
      WHERE ml.source = ? OR ml.target = ?
    `;
    const stmt = db.prepare(query);
    const edges = stmt.all(id, id) as any[];
    res.json({ node_id: id, edges });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to query graph neighborhood', details: err.message });
  }
});

export default router;
