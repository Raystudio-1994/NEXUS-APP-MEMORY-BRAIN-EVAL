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
import { runEvalHarness, getLatestEvalRun, getEvalHistory } from './server/eval/harness';
import { initEvalTables } from './server/eval/store';
import { apexOptimize, getApexWeights, getApexLineage } from './server/apex/optimizer';
import { getPromptRegistry, createVersion, setActive, autoRevert } from './server/prompts/registry';
import { startPromptChasingCron } from './server/cron/promptChasingCron';
import { handleMcpHttpRequest } from './server/mcp/server';
import { nexusTools } from './server/mcp/tools';
import { initKuzu } from './server/graphStore';
import cron from 'node-cron';

dotenv.config();

async function startServer() {
  // Initialize Database Sync
  const sqliteDb = initDb();
  await initKuzu();
  
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
      const { query, tokenBudget, weights } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required for context compilation.' });
      }
      const budget = tokenBudget ? parseInt(tokenBudget, 10) : 1500;
      const capsule = await compileContext(query, budget, weights);
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
      const activeEpisodicStmt = sqliteDb.prepare("SELECT COUNT(*) as count FROM memories WHERE tier = 2 AND lifecycle_state = 'active'");
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

  // Initialize evaluation tables
  initEvalTables();

  // POST /api/eval/run - Execute evaluation harness
  app.post('/api/eval/run', async (req, res) => {
    try {
      const { weights, promptVersion } = req.body || {};
      const result = await runEvalHarness(weights, promptVersion);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Eval harness execution failed', details: err.message });
    }
  });

  // GET /api/eval/latest - Fetch most recent evaluation run
  app.get('/api/eval/latest', (req, res) => {
    try {
      const latest = getLatestEvalRun();
      if (!latest) {
        return res.status(404).json({ error: 'No eval runs recorded yet.' });
      }
      res.json(latest);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch latest eval run', details: err.message });
    }
  });

  // GET /api/eval/history - Fetch evaluation run history
  app.get('/api/eval/history', (req, res) => {
    try {
      const history = getEvalHistory(50);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch eval history', details: err.message });
    }
  });

  // POST /api/apex/optimize - Trigger APEX hill climbing optimization
  app.post('/api/apex/optimize', async (req, res) => {
    try {
      const budget = req.body?.budget || 5000;
      const result = await apexOptimize(budget);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'APEX optimization failed', details: err.message });
    }
  });

  // GET /api/apex/weights - Fetch active weights and lineage history
  app.get('/api/apex/weights', (req, res) => {
    try {
      const weights = getApexWeights();
      const lineage = getApexLineage();
      res.json({ weights, lineage });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch APEX weights', details: err.message });
    }
  });

  // GET /api/prompts/registry - Fetch full prompt registry and active version
  app.get('/api/prompts/registry', (req, res) => {
    try {
      const registry = getPromptRegistry();
      res.json(registry);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch prompt registry', details: err.message });
    }
  });

  // POST /api/prompts/publish - Create and publish a new prompt version
  app.post('/api/prompts/publish', (req, res) => {
    try {
      const { templates, weights, evalScore, author } = req.body || {};
      const newVersion = createVersion(templates || {}, weights, evalScore, author);
      res.json(newVersion);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to publish prompt version', details: err.message });
    }
  });

  // POST /api/prompts/revert - Trigger prompt auto-revert to best prior version
  app.post('/api/prompts/revert', (req, res) => {
    try {
      const result = autoRevert();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to revert prompt version', details: err.message });
    }
  });

  // POST /mcp - Model Context Protocol Streamable HTTP JSON-RPC 2.0 endpoint
  app.post('/mcp', async (req, res) => {
    await handleMcpHttpRequest(req, res);
  });

  // GET /.well-known/mcp - Standard MCP endpoint discovery
  app.get('/.well-known/mcp', (req, res) => {
    res.json({
      mcp_endpoint: '/mcp',
      transport: 'streamable-http-jsonrpc-2.0',
      server: 'nexus-memory-fabric',
      version: '0.4.2',
      tools_count: nexusTools.length
    });
  });

  // GET /api/mcp/tools - Exposes tool schemas for sandbox UI
  app.get('/api/mcp/tools', (req, res) => {
    res.json(nexusTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    })));
  });

  // Start prompt chasing regression background monitoring
  startPromptChasingCron();

  // Schedule nightly eval cron at 0 2 * * * (2:00 AM)
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running nightly evaluation harness at 2:00 AM...');
      await runEvalHarness();
    } catch (err) {
      console.error('Nightly evaluation run error:', err);
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

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = app.listen(PORT, () => {
    console.log(`Nexus Unified APEX Memory OS listening on port ${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} in use, killing...`);
      process.exit(1);
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start unified memory OS server:', err);
});
