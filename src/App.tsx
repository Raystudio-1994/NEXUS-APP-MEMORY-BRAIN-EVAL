import React, { useState } from 'react';
import { 
  INITIAL_MEMORIES, 
  INITIAL_EVENTS, 
  INITIAL_EDGES, 
  INITIAL_PROVENANCE_ANCHORS, 
  INITIAL_SYSTEM_METRICS 
} from './data/initialMemoryState';
import { MemoryItem, MemoryEvent, GraphEdge, ProvenanceAnchor, SystemMetrics } from './types/memory';
import { Navbar, ActiveTab } from './components/Navbar';
import { BlueprintViewer } from './components/BlueprintViewer';
import { TopologyCanvas } from './components/TopologyCanvas';
import { ContextCompilerStudio } from './components/ContextCompilerStudio';
import { ConsolidationSimulator } from './components/ConsolidationSimulator';
import { ProvenanceInspector } from './components/ProvenanceInspector';
import { ApiSandbox } from './components/ApiSandbox';
import { BenchmarkComparator } from './components/BenchmarkComparator';
import { LiveAgentWorkbench } from './components/LiveAgentWorkbench';
import { getGeminiApiKey } from './lib/geminiMemory';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('blueprint');
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [events, setEvents] = useState<MemoryEvent[]>(INITIAL_EVENTS);
  const [edges, setEdges] = useState<GraphEdge[]>(INITIAL_EDGES);
  const [anchors, setAnchors] = useState<ProvenanceAnchor[]>(INITIAL_PROVENANCE_ANCHORS);
  const [selectedNode, setSelectedNode] = useState<MemoryItem | null>(null);

  const hasApiKey = !!getGeminiApiKey();

  // Dynamic metrics calculation
  const metrics: SystemMetrics = {
    total_events: events.length + 1840,
    active_memories: memories.filter(m => m.lifecycle_state === 'active').length,
    decayed_memories: memories.filter(m => m.lifecycle_state === 'decayed' || m.lifecycle_state === 'superseded').length,
    graph_nodes: memories.length,
    graph_edges: edges.length,
    avg_retrieval_ms: 18.4,
    token_density: 0.84,
    provenance_verification_rate: 100.0,
    cache_hit_rate: 94.2
  };

  const handleAddMemory = (newMem: MemoryItem) => {
    setMemories(prev => [newMem, ...prev]);
  };

  const handleAddEvent = (newEvt: MemoryEvent) => {
    setEvents(prev => [newEvt, ...prev]);
  };

  const handleAddAnchor = (newAnch: ProvenanceAnchor) => {
    setAnchors(prev => [newAnch, ...prev]);
  };

  // Dependency-aware deletion cascade
  const handleDeleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    setAnchors(prev => prev.filter(a => a.memory_id !== id));
    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'blueprint' && <BlueprintViewer />}
        {activeTab === 'topology' && (
          <TopologyCanvas
            memories={memories}
            edges={edges}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onDeleteNode={handleDeleteMemory}
          />
        )}
        {activeTab === 'compiler' && <ContextCompilerStudio memories={memories} />}
        {activeTab === 'consolidation' && <ConsolidationSimulator memories={memories} />}
        {activeTab === 'provenance' && <ProvenanceInspector anchors={anchors} events={events} />}
        {activeTab === 'api-sandbox' && (
          <ApiSandbox
            memories={memories}
            events={events}
            onAddMemory={handleAddMemory}
            onAddEvent={handleAddEvent}
            onDeleteMemory={handleDeleteMemory}
          />
        )}
        {activeTab === 'benchmarks' && <BenchmarkComparator />}
        {activeTab === 'agent-workbench' && (
          <LiveAgentWorkbench
            memories={memories}
            events={events}
            onAddMemory={handleAddMemory}
            onAddEvent={handleAddEvent}
            onAddAnchor={handleAddAnchor}
          />
        )}
      </main>
    </div>
  );
}
