import chokidar from 'chokidar';
import path from 'path';
import { extractSemanticMemories } from '../memoryService';

const WATCH_GLOBS = ['src/**/*.{ts,tsx,md}', 'server/**/*.{ts,md}', 'vault/**/*.md'];
const IGNORE = ['**/node_modules/**', '**/data/**', '**/dist/**', '**/.git/**'];
let watcher: any = null;

export function startFileWatcher() {
  if (watcher) return watcher;
  watcher = chokidar.watch(WATCH_GLOBS, {
    ignored: IGNORE,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on('change', async (filePath: string) => {
    const rel = path.relative(process.cwd(), filePath);
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf8');
      const snippet = content.slice(0, 1200);
      await extractSemanticMemories(`FileWatcher: modified ${rel}\nDiff snippet:\n${snippet}`, 'filesystem');
      console.log(`[FileWatcher] captured ${rel}`);
    } catch (e) {
      console.warn('[FileWatcher]', e);
    }
  });

  watcher.on('add', async (filePath: string) => {
    const rel = path.relative(process.cwd(), filePath);
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf8');
      const snippet = content.slice(0, 1200);
      await extractSemanticMemories(`FileWatcher: added ${rel}\nSnippet:\n${snippet}`, 'filesystem');
      console.log(`[FileWatcher] captured add ${rel}`);
    } catch (e) {
      console.warn('[FileWatcher] add error', e);
    }
  });

  console.log('[Sensors] FileWatcher watching', WATCH_GLOBS);
  return watcher;
}

export function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

export function isWatcherActive() {
  return watcher !== null;
}
