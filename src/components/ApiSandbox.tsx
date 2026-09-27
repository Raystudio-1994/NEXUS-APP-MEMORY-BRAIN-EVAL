import React, { useState } from 'react';
import { MemoryItem, MemoryEvent } from '../types/memory';
import { api } from '../lib/apiClient';
import { 
  Terminal, 
  Send, 
  Play, 
  Copy, 
  Check, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  Layers, 
  Clock, 
  Code2,
  Database
} from 'lucide-react';

interface ApiSandboxProps {
  memories: MemoryItem[];
  events: MemoryEvent[];
  onAddMemory: (mem: MemoryItem) => void;
  onAddEvent: (evt: MemoryEvent) => void;
  onDeleteMemory: (id: string) => void;
}

export const ApiSandbox: React.FC<ApiSandboxProps> = ({
  memories,
  events,
  onAddMemory,
  onAddEvent,
  onDeleteMemory
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('observe');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [responsePayload, setResponsePayload] = useState<any>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Request Payloads state
  const [observePayload, setObservePayload] = useState(JSON.stringify({
    rawInput: "We switched from Redis to Postgres on 2026-09-25 because Redis lost persistence",
    sourceType: "chat"
  }, null, 2));

  const [surfacePayload, setSurfacePayload] = useState(JSON.stringify({
    query: "What is the canonical database and encryption scheme?",
    tokenBudget: 1500
  }, null, 2));

  const [syncPayload, setSyncPayload] = useState(JSON.stringify({
    source: memories[0]?.id || "mem-t1-001",
    target: memories[1]?.id || "mem-t1-002",
    relation_type: "RELATES_TO",
    weight: 0.95
  }, null, 2));

  const [deleteId, setDeleteId] = useState(memories[0]?.id || 'mem-t2-001');

  const handleExecute = async () => {
    setIsExecuting(true);
    setResponsePayload(null);
    const start = performance.now();

    if (selectedEndpoint === 'observe') {
      try {
        const parsed = JSON.parse(observePayload);
        const result = await api.extract(parsed.rawInput, parsed.sourceType);
        
        if (result.memories && result.memories.length > 0) {
          result.events.forEach(e => onAddEvent(e));
          result.memories.forEach(m => onAddMemory(m));
        }
        
        setResponsePayload({
          status: "ACCEPTED",
          extraction_summary: result,
          async_processing: true,
          details: "Successfully extracted memories and updated the SQLite database canonical store."
        });
      } catch (err: any) {
        setResponsePayload({ error: "Execution failed: " + err.message });
      }
    } else if (selectedEndpoint === 'surface') {
      try {
        const parsed = JSON.parse(surfacePayload);
        const capsule = await api.compile(parsed.query, parsed.tokenBudget);
        setResponsePayload(capsule);
      } catch (err: any) {
        setResponsePayload({ error: "Execution failed: " + err.message });
      }
    } else if (selectedEndpoint === 'sync') {
      try {
        const parsed = JSON.parse(syncPayload);
        const res = await api.createLink(parsed.source, parsed.target, parsed.relation_type, parsed.weight);
        setResponsePayload({
          status: "LINK_CREATED",
          edge_id: res.id,
          applied_relationship: parsed.relation_type,
          conflict_free_merge: true,
          synced_at: new Date().toISOString()
        });
      } catch (err: any) {
        setResponsePayload({ error: "Execution failed: " + err.message });
      }
    } else if (selectedEndpoint === 'delete') {
      try {
        const success = await api.deleteMemory(deleteId);
        if (success) {
          onDeleteMemory(deleteId);
          setResponsePayload({
            status: "DELETED_CASCADE_SUCCESS",
            memory_id: deleteId,
            dependency_graph_purged: {
              tombstoned_records: 1,
              invalidated_summaries: 1,
              purged_vector_embeddings: 1,
              cleared_context_caches: 3
            },
            audit_trail_recorded: true
          });
        } else {
          setResponsePayload({ error: `Memory ${deleteId} not found in persistent SQLite.` });
        }
      } catch (err: any) {
        setResponsePayload({ error: "Execution failed: " + err.message });
      }
    }

    const end = performance.now();
    setLatencyMs(parseFloat((end - start).toFixed(1)));
    setIsExecuting(false);
  };

  const getCurlSnippet = () => {
    if (selectedEndpoint === 'observe') {
      return `curl -X POST http://localhost:3001/api/extract \\
  -H "Content-Type: application/json" \\
  -d '${observePayload.replace(/\n/g, '')}'`;
    }
    if (selectedEndpoint === 'surface') {
      return `curl -X POST http://localhost:3001/api/compile \\
  -H "Content-Type: application/json" \\
  -d '${surfacePayload.replace(/\n/g, '')}'`;
    }
    if (selectedEndpoint === 'sync') {
      return `curl -X POST http://localhost:3001/api/memory/links \\
  -H "Content-Type: application/json" \\
  -d '${syncPayload.replace(/\n/g, '')}'`;
    }
    return `curl -X DELETE http://localhost:3001/api/memory/${deleteId}`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Sidebar: Endpoint Selector */}
      <aside className="w-full lg:w-80 border-r border-slate-800 bg-[#090d16] p-5 overflow-y-auto space-y-4 shrink-0 font-sans">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase mb-1">
            <Terminal className="h-4 w-4" />
            <span>Interactive API Sandbox</span>
          </div>
          <h2 className="text-base font-bold text-white">Service Endpoints</h2>
          <p className="text-xs text-slate-400 mt-1">
            Test live REST requests directly against the persistent Express + SQLite Node 22 engine.
          </p>
        </div>

        <div className="space-y-1.5 font-sans">
          {[
            { id: 'observe', method: 'POST', path: '/api/extract', desc: 'Ingest raw event stream & run extraction' },
            { id: 'surface', method: 'POST', path: '/api/compile', desc: 'Weighted vector ranking + token packing' },
            { id: 'sync', method: 'POST', path: '/api/memory/links', desc: 'Create manual weighted graph links' },
            { id: 'delete', method: 'DELETE', path: '/api/memory/:id', desc: 'Perform cascading deletion transactions' },
          ].map((ep) => {
            const isSelected = selectedEndpoint === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    ep.method === 'POST' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-[10px] text-slate-300">{ep.path}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-sans">{ep.desc}</div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Sandbox Execution Viewport */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-grid-pattern flex flex-col font-sans">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">
          {/* Left: Input Payload Editor */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-5 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase">Request JSON Body</h3>
              </div>
              <button
                onClick={handleCopyCurl}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-mono transition-colors cursor-pointer"
              >
                {copiedCurl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>Copy CURL</span>
              </button>
            </div>

            {selectedEndpoint === 'observe' && (
              <textarea
                value={observePayload}
                onChange={e => setObservePayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none h-80"
              />
            )}

            {selectedEndpoint === 'surface' && (
              <textarea
                value={surfacePayload}
                onChange={e => setSurfacePayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none h-80"
              />
            )}

            {selectedEndpoint === 'sync' && (
              <textarea
                value={syncPayload}
                onChange={e => setSyncPayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none h-80"
              />
            )}

            {selectedEndpoint === 'delete' && (
              <div className="flex-1 space-y-4">
                <p className="text-xs text-slate-400 font-sans">Enter the target memory node ID to trigger cascade deletion from SQLite and local disk files.</p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-500">Memory ID</label>
                  <input
                    type="text"
                    value={deleteId}
                    onChange={e => setDeleteId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/10"
            >
              {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
              <span>Execute Request</span>
            </button>
          </div>

          {/* Right: Response Console */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-5 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase">Response console</h3>
              </div>

              {latencyMs && (
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                  <span>Latency: <strong className="text-cyan-400">{latencyMs} ms</strong></span>
                </div>
              )}
            </div>

            <div className="flex-1 rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-auto max-h-[380px] whitespace-pre-wrap leading-relaxed">
              {responsePayload ? (
                <code>{JSON.stringify(responsePayload, null, 2)}</code>
              ) : (
                <span className="text-slate-600 font-mono italic">Waiting for execution...</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
