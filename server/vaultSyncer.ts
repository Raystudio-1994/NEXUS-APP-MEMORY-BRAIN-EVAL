import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryItem, ProvenanceAnchor } from '../src/types/memory';

/**
 * Sanitizes a filename to prevent path traversal or invalid characters.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
}

/**
 * Writes the specified memory item and its associated provenance anchors
 * to a local-first, Obsidian-compatible Markdown vault directory structure.
 */
export async function syncMemoryToVault(memory: MemoryItem, anchors: ProvenanceAnchor[]): Promise<string> {
  const vaultPath = process.env.VAULT_PATH || './vault';
  const folderMap: Record<number, string> = {
    1: 'Inbox',
    2: 'Daily',
    3: 'Semantic',
    4: 'Procedures'
  };

  const folderName = folderMap[memory.tier] || 'Inbox';
  const targetDir = path.join(vaultPath, folderName);
  
  // Ensure directory exists
  await fs.mkdir(targetDir, { recursive: true });

  const baseName = sanitizeFilename(memory.subject || memory.title || `memory_${memory.id}`);
  const filePath = path.join(targetDir, `${baseName}.md`);

  const frontmatter = `---
type: ${memory.tier_name}
tier: ${memory.tier}
id: ${memory.id}
subject: "${memory.subject || ''}"
predicate: "${memory.predicate || ''}"
object: "${memory.object || ''}"
confidence: ${memory.confidence}
importance: ${memory.importance}
stability: ${memory.stability}
observed_at: ${memory.observed_at}
valid_from: ${memory.valid_from}
valid_to: ${memory.valid_to || ''}
lifecycle_state: ${memory.lifecycle_state}
tags: [${(memory.tags || []).map(t => `"${t}"`).join(', ')}]
created_at: "${new Date().toISOString()}"
vault_path: "${filePath}"
embedding_dim: 768
ai_first: true
---`;

  const wikilinks = (memory.tags || []).map(t => `[[${t}]]`).join(' ') + 
                    ' ' + 
                    anchors.map(a => `[[${sanitizeFilename(a.source_title)}]]`).join(' ');

  const provenanceFooter = `
## Provenance
${anchors.map(a => `> **Source:** ${a.source_title} | \`${a.source_type}\` | Bytes ${JSON.stringify(a.byte_range)} | SHA256 \`${a.sha256_hash}\`
> Verbatim: "${a.verbatim_extract.replace(/"/g, '\\"')}"
> Verified: ${a.verified ? '✅' : '❌'} | Anchor: ${a.anchor_id} | Event: ${a.source_event_id}`).join('\n\n')}

## Graph Links
${(memory.supporting_memory_ids || []).map(id => `- [[${id}]] EXPANDS_ON`).join('\n')}
${(memory.conflicting_memory_ids || []).map(id => `- [[${id}]] CONTRADICTS`).join('\n')}
`;

  const body = `${frontmatter}

# ${memory.title}

## For future agent
This note is authoritative for "${memory.subject || memory.title}". Use in context compilation when relevant.

${memory.statement}

${wikilinks}

${provenanceFooter}
`;

  await fs.writeFile(filePath, body, 'utf8');
  return filePath;
}
