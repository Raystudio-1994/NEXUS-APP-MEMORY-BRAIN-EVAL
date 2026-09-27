import React, { useState, useEffect } from 'react';
import { MemoryItem, MemoryEvent } from '../types/memory';
import { api } from '../lib/apiClient';
import { 
  Terminal, 
  Play, 
  Copy, 
  Check, 
  RefreshCw, 
  Code2,
  Database,
  Cpu,
  Layers,
  Network
} from 'lucide-react';

interface ApiSandboxProps {
  memories: MemoryItem[];
  events: MemoryEvent[];
  onAddMemory: (mem: MemoryItem) => void;
  onAddEvent: (evt: MemoryEvent) => void;
  onDeleteMemory: (id: string) => void;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const ApiSandbox: React.FC<ApiSandboxProps> = ({
  memories,
  events,
  onAddMemory,
  onAddEvent,
  onDeleteMemory
}) => {
  const [protocolTab, setProtocolTab] = useState<'rest' | 'mcp' | 'grpc'>('rest');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('compile');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [responsePayload, setResponsePayload] = useState<any>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // MCP State
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('nexus_search_memory');
  const [mcpArgsPayload, setMcpArgsPayload] = useState<string>(
    JSON.stringify({ query: 'What database are we using now?', tokenBudget: 1500 }, null, 2)
  );

  // REST Request Payloads
  const [compilePayload, setCompilePayload] = useState(JSON.stringify({
    query: "What is the canonical database and architecture invariants?",
    tokenBudget: 1500
  }, null, 2));

  const [extractPayload, setExtractPayload] = useState(JSON.stringify({
    rawInput: "We use Postgres 18 canonical store, vector Qdrant is disposable.",
    sourceType: "chat"
  }, null, 2));

  const [evalPayload, setEvalPayload] = useState(JSON.stringify({
    promptVersion: "v1.0.0"
  }, null, 2));

  const [apexPayload, setApexPayload] = useState(JSON.stringify({
    budget: 150
  }, null, 2));

  // Load MCP Tools dynamically from server
  useEffect(() => {
    fetch('/api/mcp/tools')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMcpTools(data);
          if (data.length > 0 && !selectedMcpTool) {
            setSelectedMcpTool(data[0].name);
          }
        }
      })
      .catch(err => console.warn('Could not prefetch MCP tools:', err));
  }, []);

  // Update default payload when switching MCP tools
  const handleSelectMcpTool = (toolName: string) => {
    setSelectedMcpTool(toolName);
    switch (toolName) {
      case 'nexus_search_memory':
        setMcpArgsPayload(JSON.stringify({ query: 'What database are we using now?', tokenBudget: 1500 }, null, 2));
        break;
      case 'nexus_extract':
        setMcpArgsPayload(JSON.stringify({ rawInput: 'We store all canonical records in Postgres 18.', sourceType: 'chat' }, null, 2));
        break;
      case 'nexus_verify':
        setMcpArgsPayload(JSON.stringify({ memoryId: memories[0]?.id || 'mem-t3-001' }, null, 2));
        break;
      case 'nexus_graph_traverse':
        setMcpArgsPayload(JSON.stringify({ memoryId: memories[0]?.id || 'mem-t3-001', depth: 2 }, null, 2));
        break;
      case 'nexus_vault_read':
        setMcpArgsPayload(JSON.stringify({ vaultPath: 'Semantic/Nexus_Architecture_Invariant.md' }, null, 2));
        break;
      case 'nexus_consolidate':
        setMcpArgsPayload('{}');
        break;
      default:
        setMcpArgsPayload('{}');
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setResponsePayload(null);
    const start = performance.now();

    try {
      if (protocolTab === 'mcp') {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(mcpArgsPayload);
        } catch {
          parsedArgs = {};
        }

        const mcpRequest = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: selectedMcpTool,
            arguments: parsedArgs
          }
        };

        const res = await fetch('/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mcpRequest)
        });
        const data = await res.json();
        setResponsePayload(data);
      } else if (protocolTab === 'rest') {
        if (selectedEndpoint === 'compile') {
          const parsed = JSON.parse(compilePayload);
          const capsule = await api.compile(parsed.query, parsed.tokenBudget);
          setResponsePayload(capsule);
        } else if (selectedEndpoint === 'extract') {
          const parsed = JSON.parse(extractPayload);
          const result = await api.extract(parsed.rawInput, parsed.sourceType);
          if (result.memories) {
            result.events?.forEach(e => onAddEvent(e));
            result.memories?.forEach(m => onAddMemory(m));
          }
          setResponsePayload(result);
        } else if (selectedEndpoint === 'eval') {
          const parsed = JSON.parse(evalPayload);
          const res = await fetch('/api/eval/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });
          setResponsePayload(await res.json());
        } else if (selectedEndpoint === 'apex') {
          const parsed = JSON.parse(apexPayload);
          const res = await fetch('/api/apex/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });
          setResponsePayload(await res.json());
        }
      }
    } catch (err: any) {
      setResponsePayload({ error: 'Execution failed: ' + err.message });
    } finally {
      const end = performance.now();
      setLatencyMs(parseFloat((end - start).toFixed(1)));
      setIsExecuting(false);
    }
  };

  const getCurlSnippet = () => {
    if (protocolTab === 'mcp') {
      let args = {};
      try { args = JSON.parse(mcpArgsPayload); } catch { }
      return `curl -X POST http://localhost:3000/mcp \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: selectedMcpTool, arguments: args }
  })}'`;
    }

    if (protocolTab === 'grpc') {
      return `grpcurl -plaintext -d '{"query": "What database are we using?", "token_budget": 1500}' \\
  localhost:50051 nexus.NexusMemory/Search`;
    }

    if (selectedEndpoint === 'compile') {
      return `curl -X POST http://localhost:3000/api/compile \\
  -H "Content-Type: application/json" \\
  -d '${compilePayload.replace(/\n/g, '')}'`;
    }
    if (selectedEndpoint === 'extract') {
      return `curl -X POST http://localhost:3000/api/extract \\
  -H "Content-Type: application/json" \\
  -d '${extractPayload.replace(/\n/g, '')}'`;
    }
    if (selectedEndpoint === 'eval') {
      return `curl -X POST http://localhost:3000/api/eval/run \\
  -H "Content-Type: application/json" \\
  -d '${evalPayload.replace(/\n/g, '')}'`;
    }
    return `curl -X POST http://localhost:3000/api/apex/optimize \\
  -H "Content-Type: application/json" \\
  -d '${apexPayload.replace(/\n/g, '')}'`;
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Sidebar: Protocol and Endpoint Selector */}
      <aside className="w-full lg:w-80 border-r border-slate-800 bg-[#090d16] p-5 overflow-y-auto space-y-4 shrink-0 font-sans">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase mb-1">
            <Terminal className="h-4 w-4" />
            <span>Interactive Multi-Protocol Sandbox</span>
          </div>
          <h2 className="text-base font-bold text-white">External Integration APIs</h2>
          <p className="text-xs text-slate-400 mt-1">
            Zero-simulation interfaces for Cursor, Claude Code, Python agents, and REST clients.
          </p>
        </div>

        {/* Protocol Tabs */}
        <div className="flex border border-slate-800 rounded-lg p-0.5 bg-slate-950 font-mono text-[11px]">
          <button
            onClick={() => setProtocolTab('rest')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              protocolTab === 'rest' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="h-3 w-3" />
            <span>REST</span>
          </button>
          <button
            onClick={() => setProtocolTab('mcp')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              protocolTab === 'mcp' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>MCP (JSON-RPC)</span>
          </button>
          <button
            onClick={() => setProtocolTab('grpc')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              protocolTab === 'grpc' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="h-3 w-3" />
            <span>gRPC</span>
          </button>
        </div>

        {/* REST Endpoints List */}
        {protocolTab === 'rest' && (
          <div className="space-y-1.5 font-sans">
            {[
              { id: 'compile', method: 'POST', path: '/api/compile', desc: 'Weighted vector ranking + 0/1 knapsack packing' },
              { id: 'extract', method: 'POST', path: '/api/extract', desc: 'Ingest raw text & extract semantic facts' },
              { id: 'eval', method: 'POST', path: '/api/eval/run', desc: 'Execute evaluation harness against golden dataset' },
              { id: 'apex', method: 'POST', path: '/api/apex/optimize', desc: 'Trigger APEX hill climbing optimization loop' }
            ].map(ep => (
              <button
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                  selectedEndpoint === ep.id
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {ep.method}
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">{ep.path}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-sans">{ep.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* MCP Tools List */}
        {protocolTab === 'mcp' && (
          <div className="space-y-1.5 font-sans">
            <div className="text-[11px] text-purple-400 font-mono flex items-center justify-between pb-1">
              <span>6 MCP Model Tools</span>
              <span className="text-[9px] bg-purple-950 border border-purple-800 text-purple-300 px-1.5 py-0.5 rounded">v0.4.2</span>
            </div>
            {(mcpTools.length > 0 ? mcpTools : [
              { name: 'nexus_search_memory', description: 'Search 4-tier memory with token budget knapsack' },
              { name: 'nexus_extract', description: 'Extract semantic memories from raw text' },
              { name: 'nexus_verify', description: 'Verify SHA-256 provenance for memory' },
              { name: 'nexus_graph_traverse', description: 'Traverse memory_links DAG relations' },
              { name: 'nexus_vault_read', description: 'Read Obsidian vault markdown file' },
              { name: 'nexus_consolidate', description: 'Trigger REM DBSCAN consolidation' }
            ]).map(tool => (
              <button
                key={tool.name}
                onClick={() => handleSelectMcpTool(tool.name)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                  selectedMcpTool === tool.name
                    ? 'border-purple-500 bg-purple-950/20 text-purple-200'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                    TOOL
                  </span>
                  <span className="font-mono text-[11px] text-slate-200">{tool.name}</span>
                </div>
                <div className="text-[11px] text-slate-400">{tool.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* gRPC Protobuf Spec Tab */}
        {protocolTab === 'grpc' && (
          <div className="space-y-3 font-sans">
            <div className="text-[11px] text-emerald-400 font-mono">Protobuf RPC Services</div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 space-y-1">
              <div>service NexusMemory &#123;</div>
              <div className="pl-3">rpc Search(SearchRequest) returns (Capsule);</div>
              <div className="pl-3">rpc Extract(ExtractRequest) returns (Extraction);</div>
              <div className="pl-3">rpc TraverseDAG(GraphRequest) returns (GraphResponse);</div>
              <div>&#125;</div>
            </div>
            <p className="text-[11px] text-slate-400">
              Low-latency binary wire RPC exposed on port <code>50051</code> for Python, Go, and high-frequency backend agent nodes.
            </p>
          </div>
        )}
      </aside>

      {/* Main Sandbox Execution Viewport */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-grid-pattern flex flex-col font-sans">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">
          {/* Left: Input Payload & Tool Invocation */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-5 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase">
                  {protocolTab === 'mcp' ? `MCP Tool Arguments: ${selectedMcpTool}` : protocolTab === 'grpc' ? 'gRPC Message' : 'Request Payload'}
                </h3>
              </div>
              <button
                onClick={handleCopySnippet}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-mono transition-colors cursor-pointer"
              >
                {copiedSnippet ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{protocolTab === 'grpc' ? 'Copy grpcurl' : 'Copy cURL'}</span>
              </button>
            </div>

            {protocolTab === 'mcp' && (
              <textarea
                value={mcpArgsPayload}
                onChange={e => setMcpArgsPayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-purple-300 border border-slate-800 focus:outline-none focus:border-purple-500 resize-none h-80"
              />
            )}

            {protocolTab === 'rest' && selectedEndpoint === 'compile' && (
              <textarea
                value={compilePayload}
                onChange={e => setCompilePayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none h-80"
              />
            )}

            {protocolTab === 'rest' && selectedEndpoint === 'extract' && (
              <textarea
                value={extractPayload}
                onChange={e => setExtractPayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none h-80"
              />
            )}

            {protocolTab === 'rest' && selectedEndpoint === 'eval' && (
              <textarea
                value={evalPayload}
                onChange={e => setEvalPayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none h-80"
              />
            )}

            {protocolTab === 'rest' && selectedEndpoint === 'apex' && (
              <textarea
                value={apexPayload}
                onChange={e => setApexPayload(e.target.value)}
                className="flex-1 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none h-80"
              />
            )}

            {protocolTab === 'grpc' && (
              <div className="flex-1 rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-300 overflow-auto">
                <div className="text-slate-400 mb-2">// Protobuf message specification:</div>
                <pre>{`message SearchRequest {
  string query = 1;
  int32 token_budget = 2;
  repeated string tags = 3;
}

message Capsule {
  string query_id = 1;
  int32 tokens_used = 2;
  repeated Memory current_knowledge = 3;
}`}</pre>
              </div>
            )}

            {protocolTab !== 'grpc' ? (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={`w-full py-2.5 font-semibold rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg ${
                  protocolTab === 'mcp'
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/10'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/10'
                }`}
              >
                {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
                <span>{protocolTab === 'mcp' ? `Invoke MCP Tool (${selectedMcpTool})` : 'Execute Live REST Request'}</span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs font-mono text-emerald-300">
                To test gRPC: Run <code>grpcurl -plaintext localhost:50051 nexus.NexusMemory/Search</code> in CLI.
              </div>
            )}
          </div>

          {/* Right: Response Console and Wire Inspection */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-5 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase">
                  {protocolTab === 'mcp' ? 'JSON-RPC 2.0 Response' : 'Live Response Console'}
                </h3>
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
                <span className="text-slate-600 font-mono italic">
                  {protocolTab === 'mcp'
                    ? 'Ready to execute MCP JSON-RPC 2.0 tool call over POST /mcp...'
                    : protocolTab === 'grpc'
                    ? 'gRPC binary channel ready at port 50051...'
                    : 'Waiting for REST execution...'}
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
