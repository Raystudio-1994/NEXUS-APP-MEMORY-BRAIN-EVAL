import React, { useState } from 'react';
import { MemoryItem, MemoryEvent } from '../types/memory';
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
    source_type: "git",
    source_id: "commit-e491fa",
    payload: {
      author: "Senior Architect",
      message: "feat(auth): enforce hardware-enclave AES-256 vault encryption",
      files_changed: ["src/security/crypto.ts", "vault/keys.bin"]
    },
    evidence_class: "OBSERVED",
    session_id: "session-agent-99"
  }, null, 2));

  const [surfacePayload, setSurfacePayload] = useState(JSON.stringify({
    query: "What is the canonical database and encryption scheme?",
    max_token_budget: 1800,
    scope: "project",
    active_task: "Security Audit"
  }, null, 2));

  const [syncPayload, setSyncPayload] = useState(JSON.stringify({
    client_id: "agent_claude_desktop_worker_01",
    target_workspace: "nexus_core",
    yjs_state_vector: "AQEAAAAAAAAAAQAAAAAAAAA=",
    pending_updates_count: 4
  }, null, 2));

  const [deleteId, setDeleteId] = useState(memories[0]?.id || 'mem-t2-001');

  const handleExecute = async () => {
    setIsExecuting(true);
    setResponsePayload(null);
    const start = performance.now();

    await new Promise(r => setTimeout(r, 120 + Math.random() * 80));

    if (selectedEndpoint === 'observe') {
      try {
        const parsed = JSON.parse(observePayload);
        const newEvtId = `evt-${Date.now().toString(36)}`;
        const newEvent: MemoryEvent = {
          event_id: newEvtId,
          source_id: parsed.source_id || 'api-client',
          source_type: parsed.source_type || 'api',
          observed_at: new Date().toISOString(),
          ingested_at: new Date().toISOString(),
          payload: parsed.payload || {},
          evidence_class: parsed.evidence_class || 'OBSERVED',
          content_hash: '3f789a12c45e67890123456789abcdef0123456789abcdef0123456789abcdef',
          session_id: parsed.session_id,
          confidence: 0.98
        };
        onAddEvent(newEvent);

        setResponsePayload({
          status: "ACCEPTED",
          event_id: newEvtId,
          ingested_at: newEvent.ingested_at,
          evidence_hash: newEvent.content_hash,
          salience_score: 0.92,
          routed_to_queue: "memory.events.v1",
          async_processing: true
        });
      } catch (err: any) {
        setResponsePayload({ error: "Invalid JSON payload: " + err.message });
      }
    } else if (selectedEndpoint === 'surface') {
      try {
        const parsed = JSON.parse(surfacePayload);
        const matched = memories.slice(0, 3);
        setResponsePayload({
          query_id: `q-${Date.now().toString(36)}`,
          query: parsed.query,
          tokens_used: 480,
          token_budget: parsed.max_token_budget,
          memories: matched.map(m => ({
            id: m.id,
            statement: m.statement,
            confidence: m.confidence,
            tier: m.tier,
            provenance_anchors: m.source_event_ids
          })),
          trace: {
            latency_ms: 18.4,
            semantic_candidates: 12,
            lexical_candidates: 4,
            graph_expansions: 2
          }
        });
      } catch (err: any) {
        setResponsePayload({ error: "Invalid JSON: " + err.message });
      }
    } else if (selectedEndpoint === 'sync') {
      setResponsePayload({
        status: "SYNC_OK",
        workspace: "nexus_core",
        applied_crdt_updates: 4,
        conflict_free_merge: true,
        current_memory_version: 1984,
        synced_at: new Date().toISOString()
      });
    } else if (selectedEndpoint === 'delete') {
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
    }

    const end = performance.now();
    setLatencyMs(parseFloat((end - start).toFixed(1)));
    setIsExecuting(false);
  };

  const getCurlSnippet = () => {
    if (selectedEndpoint === 'observe') {
      return `curl -X POST https://api.nexus-memory.local/v1/events/observe \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer nmf_sec_token_991" \\
  -d '${observePayload.replace(/\n/g, '')}'`;
    }
    if (selectedEndpoint === 'surface') {
      return `curl -X POST https://api.nexus-memory.local/v1/memory/surface \\
  -H "Content-Type: application/json" \\
  -d '${surfacePayload.replace(/\n/g, '')}'`;
    }
    if (selectedEndpoint === 'sync') {
      return `curl -X POST https://api.nexus-memory.local/v1/memory/sync \\
  -H "Content-Type: application/json" \\
  -d '${syncPayload.replace(/\n/g, '')}'`;
    }
    return `curl -X DELETE https://api.nexus-memory.local/v1/memory/${deleteId} \\
  -H "Authorization: Bearer nmf_sec_token_991"`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Sidebar: Endpoint Selector */}
      <aside className="w-full lg:w-80 border-r border-slate-800 bg-[#090d16] p-5 overflow-y-auto space-y-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase mb-1">
            <Terminal className="h-4 w-4" />
            <span>Interactive API Sandbox</span>
          </div>
          <h2 className="text-base font-bold text-white">Service Endpoints</h2>
          <p className="text-xs text-slate-400 mt-1">
            Test live REST, gRPC and MCP tool requests directly against the in-memory engine.
          </p>
        </div>

        <nav className="space-y-1.5 pt-2">
          {[
            { id: 'observe', method: 'POST', path: '/v1/events/observe', desc: 'Ingest raw ambient sensor event' },
            { id: 'surface', method: 'POST', path: '/v1/memory/surface', desc: 'Retrieve scored & compiled context' },
            { id: 'sync', method: 'POST', path: '/v1/memory/sync', desc: 'Execute CRDT multi-agent state merge' },
            { id: 'delete', method: 'DELETE', path: '/v1/memory/{id}', desc: 'Dependency-aware deletion cascade' },
          ].map((ep) => {
            const isSelected = selectedEndpoint === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => {
                  setSelectedEndpoint(ep.id);
                  setResponsePayload(null);
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-[11px] mb-1">
                  <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                    ep.method === 'POST' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {ep.method}
                  </span>
                  <span className="text-slate-200 font-semibold">{ep.path}</span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{ep.desc}</div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Request & Response Workbench */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-grid-pattern">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {selectedEndpoint === 'delete' ? 'DELETE' : 'POST'}
            </span>
            <span className="text-slate-200 font-semibold">
              /v1/{selectedEndpoint === 'observe' ? 'events/observe' : selectedEndpoint === 'delete' ? `memory/${deleteId}` : `memory/${selectedEndpoint}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCurl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
            >
              {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="font-mono text-[11px]">Copy cURL</span>
            </button>

            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-600/20 transition-all"
            >
              {isExecuting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Execute Request</span>
            </button>
          </div>
        </div>

        {/* Request Payload Editor */}
        <div className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-slate-300">REQUEST BODY (JSON)</span>
            <span className="text-[10px] font-mono text-slate-500">application/json</span>
          </div>

          {selectedEndpoint === 'observe' && (
            <textarea
              value={observePayload}
              onChange={(e) => setObservePayload(e.target.value)}
              rows={8}
              className="w-full p-4 font-mono text-xs text-slate-200 bg-slate-950/80 focus:outline-none"
            />
          )}

          {selectedEndpoint === 'surface' && (
            <textarea
              value={surfacePayload}
              onChange={(e) => setSurfacePayload(e.target.value)}
              rows={6}
              className="w-full p-4 font-mono text-xs text-slate-200 bg-slate-950/80 focus:outline-none"
            />
          )}

          {selectedEndpoint === 'sync' && (
            <textarea
              value={syncPayload}
              onChange={(e) => setSyncPayload(e.target.value)}
              rows={6}
              className="w-full p-4 font-mono text-xs text-slate-200 bg-slate-950/80 focus:outline-none"
            />
          )}

          {selectedEndpoint === 'delete' && (
            <div className="p-4 space-y-3 bg-slate-950/80 text-xs">
              <label className="text-slate-400 font-mono">Select Target Memory ID to Delete:</label>
              <select
                value={deleteId}
                onChange={(e) => setDeleteId(e.target.value)}
                className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
              >
                {memories.map(m => (
                  <option key={m.id} value={m.id}>{m.id} - {m.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Response Window */}
        <div className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-xl space-y-0">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
              <span className="font-semibold text-slate-200">RESPONSE VIEWER</span>
              {latencyMs !== null && (
                <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800">
                  {latencyMs} ms
                </span>
              )}
            </div>

            <span className="text-[10px] font-mono text-slate-400">HTTP 200 OK</span>
          </div>

          <pre className="p-5 font-mono text-xs text-cyan-200 overflow-x-auto bg-slate-950/90 min-h-[160px] leading-relaxed">
            <code>
              {responsePayload ? JSON.stringify(responsePayload, null, 2) : '// Click "Execute Request" above to trigger endpoint'}
            </code>
          </pre>
        </div>
      </main>
    </div>
  );
};
