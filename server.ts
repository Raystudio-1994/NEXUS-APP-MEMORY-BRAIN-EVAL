import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDb } from './server/db';
import memoryRoutes from './server/routes/memory';
import { extractSemanticMemories, compileContext, verifyProvenance } from './server/memoryService';
import { rem_nightly_consolidation_pipeline } from './server/consolidation';
import { startRemCron } from './server/cron/remCron';

dotenv.config();

async function startServer() {
  // Initialize Database Sync
  const sqliteDb = initDb();
  
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false // Allow development server access and previews
  }));

  app.use(cors({
    origin: '*' // Allow all origins in the preview development sandbox
  }));

  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), node: process.version });
  });

  // Register Core API endpoints
  app.use('/api/memory', memoryRoutes);

  // Extract endpoint
  app.post('/api/extract', async (req, res) => {
    try {
      const { rawInput, sourceType } = req.body;
      if (!rawInput) {
        return res.status(400).json({ error: 'rawInput content is required.' });
      }
      const result = await extractSemanticMemories(rawInput, sourceType || 'chat');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Extraction failed', details: err.message });
    }
  });

  // Compile endpoint
  app.post('/api/compile', async (req, res) => {
    try {
      const { query, tokenBudget } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required for context compilation.' });
      }
      const budget = tokenBudget ? parseInt(tokenBudget, 10) : 1500;
      const capsule = await compileContext(query, budget);
      res.json(capsule);
    } catch (err: any) {
      res.status(500).json({ error: 'Compilation failed', details: err.message });
    }
  });

  // Query version of compile for general GET fetching
  app.get('/api/compile', async (req, res) => {
    try {
      const { query, tokenBudget } = req.query;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required.' });
      }
      const budget = tokenBudget ? parseInt(tokenBudget as string, 10) : 1500;
      const capsule = await compileContext(query as string, budget);
      res.json(capsule);
    } catch (err: any) {
      res.status(500).json({ error: 'Compilation failed', details: err.message });
    }
  });

  // Provenance verify endpoint
  app.get('/api/provenance/verify/:memoryId', async (req, res) => {
    try {
      const { memoryId } = req.params;
      const result = await verifyProvenance(memoryId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Provenance check failed', details: err.message });
    }
  });

  // Consolidation run trigger
  app.post('/api/consolidation/run', async (req, res) => {
    try {
      const result = await rem_nightly_consolidation_pipeline();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Consolidation execution failed', details: err.message });
    }
  });

  // Consolidation status query
  app.get('/api/consolidation/status', (req, res) => {
    try {
      const activeEpisodicStmt = sqliteDb.prepare('SELECT COUNT(*) as count FROM memories WHERE tier = 2 AND lifecycle_state = "active"');
      const result = activeEpisodicStmt.get() as { count: number };
      
      res.json({
        unconsolidated_episodic_memories: result.count,
        interval: process.env.NEXUS_CONSOLIDATION_INTERVAL || '3600',
        service_status: process.env.NEXUS_CONSOLIDATION !== '0' ? 'ACTIVE' : 'DISABLED',
        consolidator: 'DBSCAN + exponential decay model'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Consolidation status query failed', details: err.message });
    }
  });

  // Start background cron synthesis service
  startRemCron();

  // Integrated Vite Middleware for Unified Port 3000 hosting
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Unified development mode: Vite middleware mounted onto Express server.');
  } else {
    const path = await import('path');
    const distPath = path.resolve('./dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Unified production mode: serving prebuilt dist files.');
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Nexus Unified APEX Memory OS listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start unified memory OS server:', err);
});
