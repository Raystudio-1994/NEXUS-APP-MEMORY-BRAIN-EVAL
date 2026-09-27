import React, { useState, useMemo } from 'react';
import { MemoryItem, GraphEdge, MemoryTier } from '../types/memory';
import { 
  Layers, 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Share2, 
  Trash2,
  FileCode,
  ArrowRight,
  ExternalLink,
  GitBranch,
  X
} from 'lucide-react';

interface TopologyCanvasProps {
  memories: MemoryItem[];
  edges: GraphEdge[];
  onSelectNode: (node: MemoryItem | null) => void;
  selectedNode: MemoryItem | null;
  onDeleteNode?: (id: string) => void;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  memories,
  edges,
  onSelectNode,
  selectedNode,
  onDeleteNode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<number | 'all'>('all');
  const [showBlastRadius, setShowBlastRadius] = useState(false);
  const [showSuperseded, setShowSuperseded] = useState(true);

  const handleExportObsidianVault = () => {
    const vaultBundle = {
      vault_name: "Nexus-Memory-Fabric-Obsidian-Vault",
      exported_at: new Date().toISOString(),
      nodes: memories.map(m => ({
        id: m.id,
        title: m.title,
        tier: m.tier,
        tier_name: m.tier_name,
        statement: m.statement,
        tags: m.tags,
        stability: m.stability,
        confidence: m.confidence,
        vault_path: m.vault_path || `vault/${m.tier_name}/${m.id}.md`,
        observed_at: m.observed_at
      })),
      edges: edges.map(e => ({
        source: e.source,
        target: e.target,
        relation: e.relation_type,
        weight: e.weight
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vaultBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `obsidian_vault_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };


  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return memories.filter(m => {
      if (!showSuperseded && m.lifecycle_state === 'superseded') return false;
      if (selectedTierFilter !== 'all' && m.tier !== selectedTierFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchStatement = m.statement.toLowerCase().includes(q);
        const matchTags = (m.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchStatement && !matchTags) return false;
      }
      return true;
    });
  }, [memories, selectedTierFilter, showSuperseded, searchQuery]);

  // Compute blast radius: transitive dependencies from edges
  const blastRadiusIds = useMemo(() => {
    if (!selectedNode || !showBlastRadius) return new Set<string>();
    const visited = new Set<string>([selectedNode.id]);
    const queue = [selectedNode.id];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      edges.forEach(edge => {
        if (edge.source === curr && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
        if (edge.target === curr && !visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push(edge.source);
        }
      });
    }
    return visited;
  }, [selectedNode, showBlastRadius, edges]);

  // Assign tier layout coordinate zones
  const tierYPositions: Record<MemoryTier, number> = {
    1: 80,   // Working
    2: 240,  // Episodic
    3: 420,  // Semantic
    4: 600   // Procedural
  };

  // Tier color accents
  const tierColors: Record<MemoryTier, { border: string; bg: string; text: string; glow: string }> = {
    1: { border: 'border-cyan-500/60', bg: 'bg-cyan-950/40', text: 'text-cyan-300', glow: 'glow-cyan' },
    2: { border: 'border-purple-500/60', bg: 'bg-purple-950/40', text: 'text-purple-300', glow: 'glow-purple' },
    3: { border: 'border-emerald-500/60', bg: 'bg-emerald-950/40', text: 'text-emerald-300', glow: 'glow-emerald' },
    4: { border: 'border-amber-500/60', bg: 'bg-amber-950/40', text: 'text-amber-300', glow: 'glow-amber' }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#090d16]/90 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search memory graph..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-64 rounded-md border border-slate-700 bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Tier Filter Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedTierFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedTierFilter === 'all' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Tiers
            </button>
            <button
              onClick={() => setSelectedTierFilter(1)}
              className={`px-2 py-1 rounded-md transition-colors ${
                selectedTierFilter === 1 ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              T1: Working
            </button>
            <button
              onClick={() => setSelectedTierFilter(2)}
              className={`px-2 py-1 rounded-md transition-colors ${
                selectedTierFilter === 2 ? 'bg-purple-950 text-purple-300 font-semibold border border-purple-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              T2: Episodic
            </button>
            <button
              onClick={() => setSelectedTierFilter(3)}
              className={`px-2 py-1 rounded-md transition-colors ${
                selectedTierFilter === 3 ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              T3: Semantic
            </button>
            <button
              onClick={() => setSelectedTierFilter(4)}
              className={`px-2 py-1 rounded-md transition-colors ${
                selectedTierFilter === 4 ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              T4: Procedural
            </button>
          </div>
        </div>

        {/* Feature Toggles & Export */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={handleExportObsidianVault}
            className="px-3 py-1.5 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-mono transition-colors flex items-center gap-1.5"
            title="Download Obsidian Vault Compatible JSON"
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Export Obsidian Vault</span>
          </button>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showBlastRadius}
              onChange={(e) => setShowBlastRadius(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500"
            />
            <span>Blast Radius Ray</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showSuperseded}
              onChange={(e) => setShowSuperseded(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500"
            />
            <span>Show Superseded</span>
          </label>
        </div>
      </div>

      {/* Main Canvas & Inspector Viewport */}
      <div className="relative flex-1 overflow-auto bg-grid-pattern p-6">
        {/* Tier Grouping Visual Zones */}
        <div className="absolute inset-x-6 top-6 bottom-6 pointer-events-none space-y-6">
          <div className="h-32 rounded-xl border border-dashed border-cyan-900/30 bg-cyan-950/5 flex items-start p-3">
            <span className="font-mono text-[11px] font-bold text-cyan-500 uppercase tracking-wider">
              Tier 1: Working Memory & Active Session Buffers (RAM/Redis)
            </span>
          </div>
          <div className="h-36 rounded-xl border border-dashed border-purple-900/30 bg-purple-950/5 flex items-start p-3">
            <span className="font-mono text-[11px] font-bold text-purple-500 uppercase tracking-wider">
              Tier 2: Episodic Memory & Conversational Vectors (pgvector / Qdrant)
            </span>
          </div>
          <div className="h-44 rounded-xl border border-dashed border-emerald-900/30 bg-emerald-950/5 flex items-start p-3">
            <span className="font-mono text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
              Tier 3: Semantic & Declarative Knowledge Graph (Obsidian Vault + Kùzu Graph)
            </span>
          </div>
          <div className="h-36 rounded-xl border border-dashed border-amber-900/30 bg-amber-950/5 flex items-start p-3">
            <span className="font-mono text-[11px] font-bold text-amber-500 uppercase tracking-wider">
              Tier 4: Procedural Rules & Execution Invariants (SQLite / Postgres)
            </span>
          </div>
        </div>

        {/* Nodes Grid Canvas */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
          {filteredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const inBlastRadius = blastRadiusIds.has(node.id);
            const style = tierColors[node.tier];
            const isSuperseded = node.lifecycle_state === 'superseded';

            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(isSelected ? null : node)}
                className={`relative rounded-xl border p-4 transition-all cursor-pointer backdrop-blur-md ${
                  isSelected
                    ? `${style.border} ${style.bg} ring-2 ring-cyan-400 shadow-xl ${style.glow}`
                    : inBlastRadius
                    ? 'border-yellow-500/80 bg-yellow-950/30 shadow-lg'
                    : isSuperseded
                    ? 'border-slate-800/60 bg-slate-950/40 opacity-60'
                    : 'border-slate-800 bg-[#090d16]/90 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                {/* Header Tag and Confidence Gauge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      node.tier === 1 ? 'border-cyan-500/30 bg-cyan-950 text-cyan-300' :
                      node.tier === 2 ? 'border-purple-500/30 bg-purple-950 text-purple-300' :
                      node.tier === 3 ? 'border-emerald-500/30 bg-emerald-950 text-emerald-300' :
                      'border-amber-500/30 bg-amber-950 text-amber-300'
                    }`}>
                      T{node.tier} {node.tier_name.toUpperCase()}
                    </span>
                    {isSuperseded && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/40">
                        SUPERSEDED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[11px] text-slate-400">
                      Conf: <strong className="text-cyan-300">{(node.confidence * 100).toFixed(0)}%</strong>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Tokens: <strong className="text-slate-200">{node.tokens}</strong>
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xs font-semibold text-slate-100 mb-1.5 line-clamp-1">
                  {node.title}
                </h3>

                {/* Statement preview */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 font-sans">
                  {node.statement}
                </p>

                {/* Metadata badges footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{new Date(node.observed_at).toLocaleDateString()}</span>
                    </span>
                    {node.vault_path && (
                      <span className="flex items-center gap-1 text-emerald-400" title="Obsidian Vault File">
                        <FileCode className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{node.vault_path.split('/').pop()}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {node.tags.slice(0, 2).map((t) => (
                      <span key={t} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-in Node Inspector Panel */}
      {selectedNode && (
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#090d16] p-5 overflow-y-auto space-y-5 fixed lg:relative right-0 bottom-0 max-h-[70vh] lg:max-h-full shadow-2xl z-30">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  tierColors[selectedNode.tier].bg
                } ${tierColors[selectedNode.tier].text} border ${tierColors[selectedNode.tier].border}`}>
                  TIER {selectedNode.tier}: {selectedNode.tier_name.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-slate-400">ID: {selectedNode.id}</span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1">{selectedNode.title}</h2>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Statement */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Declarative Fact</span>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
              {selectedNode.statement}
            </div>
          </div>

          {/* Bitemporal Validity */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Valid From (World Truth):</span>
              <span className="text-cyan-300">{new Date(selectedNode.valid_from).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Valid To:</span>
              <span className={selectedNode.valid_to ? 'text-red-400' : 'text-emerald-400'}>
                {selectedNode.valid_to ? new Date(selectedNode.valid_to).toLocaleString() : 'Indefinite (NOW)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Observed At (Ingest Time):</span>
              <span>{new Date(selectedNode.observed_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Procedural Spec if Tier 4 */}
          {selectedNode.procedure_spec && (
            <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40 space-y-2 text-xs">
              <div className="font-semibold text-amber-400 font-mono text-[11px]">Procedural Trajectory Specification</div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <p><strong className="text-amber-300 font-mono">WHEN:</strong> {selectedNode.procedure_spec.when}</p>
                <p><strong className="text-amber-300 font-mono">IF:</strong> {selectedNode.procedure_spec.if_cond}</p>
                <p><strong className="text-amber-300 font-mono">THEN:</strong> {selectedNode.procedure_spec.then_action}</p>
                <p><strong className="text-emerald-400 font-mono">EXPECT:</strong> {selectedNode.procedure_spec.expected_result}</p>
              </div>
            </div>
          )}

          {/* Provenance and Sources */}
          <div className="space-y-2 text-xs">
            <span className="text-[11px] font-mono uppercase text-slate-400">Evidence Lineage</span>
            <div className="space-y-1.5">
              {selectedNode.source_event_ids.map(evtId => (
                <div key={evtId} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="font-mono text-cyan-400 text-[11px]">{evtId}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">SHA-256 Anchored</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setShowBlastRadius(!showBlastRadius)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                showBlastRadius ? 'bg-yellow-950 border-yellow-700 text-yellow-200' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{showBlastRadius ? 'Hide Blast Radius' : 'Show Blast Radius'}</span>
            </button>

            {onDeleteNode && (
              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors p-1.5"
                title="Delete with Dependency Cascade"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
