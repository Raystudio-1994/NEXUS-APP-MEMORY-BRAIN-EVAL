import * as Y from 'yjs';
import { getDb } from '../db';
import * as fs from 'fs';
import * as path from 'path';

const ydoc = new Y.Doc();
const yMemories = ydoc.getMap('memories');

export function getYDoc() {
  return ydoc;
}

export function applyMemoryUpdate(memoryId: string, agentId: string, payload: any) {
  yMemories.set(memoryId, { agentId, payload, ts: Date.now() });
  const db = getDb();
  try {
    const tagsStr = Array.isArray(payload.tags) ? payload.tags.join(',') : (payload.tags || '');
    db.prepare(`UPDATE memories SET statement = ?, tags = ?, agent_id = ?, last_accessed = ? WHERE id = ?`)
      .run(payload.statement, tagsStr, agentId, new Date().toISOString(), memoryId);
  } catch (err) {
    console.error('[CRDT] db update failed:', err);
  }
}

export function getSyncState(): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}

export function applySyncUpdate(update: Uint8Array) {
  Y.applyUpdate(ydoc, update);
}

export function persistYDoc() {
  try {
    const dir = path.resolve('./data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'crdt.bin'), Buffer.from(getSyncState()));
  } catch (err) {
    console.error('[CRDT] persistYDoc failed:', err);
  }
}

export function loadYDoc() {
  try {
    const p = path.resolve('./data/crdt.bin');
    if (fs.existsSync(p)) {
      applySyncUpdate(new Uint8Array(fs.readFileSync(p)));
    }
  } catch (err) {
    console.error('[CRDT] loadYDoc failed:', err);
  }
}
