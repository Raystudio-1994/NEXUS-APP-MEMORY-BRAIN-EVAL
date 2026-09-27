import React, { useState } from 'react';
import { MemoryItem, ConsolidationCluster } from '../types/memory';
import { 
  Moon, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  FileCode, 
  GitBranch, 
  Sparkles, 
  Zap, 
  Layers, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ConsolidationSimulatorProps {
  memories: MemoryItem[];
  onConsolidationComplete?: (newMemories: MemoryItem[]) => void;
}

export const ConsolidationSimulator: React.FC<ConsolidationSimulatorProps> = ({
  memories,
  onConsolidationComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'vault-preview' | 'decay-analysis'>('pipeline');

  // Simulated output clusters from the REM run
  const [synthesizedClusters, setSynthesizedClusters] = useState<ConsolidationCluster[]>([
    {
      cluster_id: 'rem-cluster-01',
      centroid_topic: 'Persistence Architecture Migration',
      episodic_memory_ids: ['mem-t2-001', 'mem-t2-002'],
      synthesized_fact: 'PostgreSQL 18 is permanently established as the canonical transactional store with pgvector for vector search, completely replacing the historical Redis-only architecture.',
      extracted_tags: ['architecture', 'postgres', 'pgvector', 'durability'],
      extracted_action_items: [
        'Deprecate unused Redis connection pools in background workers',
        'Verify pgvector IVFFlat index parameters for 1024d vectors'
      ],
      resolved_contradictions: [
        'PostgreSQL supersedes Redis as authoritative state store (Resolved via git commit timestamp 2026-09-24)'
      ],
      obsidian_vault_file: 'vault/architecture/canonical-persistence-layer.md',
      generated_edges: [
        { target_id: 'mem-t3-001', relation: 'RELATES_TO' },
        { target_id: 'mem-t2-002', relation: 'SUPERSEDES' }
      ]
    },
    {
      cluster_id: 'rem-cluster-02',
      centroid_topic: 'Fast Developer Feedback & Test Isolation',
      episodic_memory_ids: ['mem-t3-002', 'mem-t4-001'],
      synthesized_fact: 'Developer workflows enforce SQLite in-memory databases for local test runs combined with targeted symbol export checks to minimize CI turnaround time.',
      extracted_tags: ['testing', 'sqlite', 'developer-experience', 'best-practice'],
      extracted_action_items: [
        'Add pre-commit hook to trigger tsc --noEmit on staged files'
      ],
      resolved_contradictions: [],
      obsidian_vault_file: 'vault/workflows/developer-loop-guidelines.md',
      generated_edges: [
        { target_id: 'mem-t4-001', relation: 'EXPANDS_ON' }
      ]
    }
  ]);

  const [selectedCluster, setSelectedCluster] = useState<ConsolidationCluster>(synthesizedClusters[0]);

  const runConsolidation = async () => {
    setIsRunning(true);
    setCurrentStep(1); // Phase 1: Episodic Extraction & Decay
    await new Promise(r => setTimeout(r, 800));

    setCurrentStep(2); // Phase 2: DBSCAN Vector Clustering
    await new Promise(r => setTimeout(r, 900));

    setCurrentStep(3); // Phase 3: Auto-Synthesis & Contradiction Resolution
    await new Promise(r => setTimeout(r, 1000));

    setCurrentStep(4); // Phase 4: Obsidian Vault Sync & DAG Linking
    await new Promise(r => setTimeout(r, 700));

    setCurrentStep(5); // Completed
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Left Control Panel */}
      <aside className="w-full lg:w-96 border-r border-slate-800 bg-[#090d16] p-5 overflow-y-auto space-y-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-semibold uppercase mb-1">
            <Moon className="h-4 w-4" />
            <span>Autonomous REM Engine</span>
          </div>
          <h2 className="text-base font-bold text-white">Nightly Consolidation Simulator</h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulates off-peak batch memory synthesis, Ebbinghaus decay, and Obsidian markdown vault synchronization.
          </p>
        </div>

        {/* Action Trigger */}
        <button
          onClick={runConsolidation}
          disabled={isRunning}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
            isRunning
              ? 'bg-purple-950/60 border border-purple-800 text-purple-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/20'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-purple-300" />
              <span>Running REM Consolidation Cycle...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              <span>Trigger Nightly REM Sleep Cycle</span>
            </>
          )}
        </button>

        {/* 4-Phase Progress Timeline */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Pipeline Execution Phases
          </h3>

          <div className="space-y-2">
            {[
              { num: 1, name: 'Episodic Extraction & Ebbinghaus Decay', desc: 'Scan Tier 2 events, prune stale memories below threshold' },
              { num: 2, name: 'DBSCAN Vector Clustering (eps=0.15)', desc: 'Group semantic vectors by cosine neighborhood distance' },
              { num: 3, name: 'Saner.AI Synthesis & Contradiction DAG', desc: 'Extract decisions, auto-tag friction, resolve supersessions' },
              { num: 4, name: 'Obsidian Markdown Vault Sync', desc: 'Write bi-directional [[wikilinks]] to local filesystem' },
            ].map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <div
                  key={step.num}
                  className={`p-3 rounded-lg border transition-all text-xs ${
                    isCurrent
                      ? 'border-purple-500 bg-purple-950/40 text-purple-200'
                      : isDone
                      ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-950/40 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="font-mono">0{step.num}.</span>
                      <span>{step.name}</span>
                    </span>
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    {isCurrent && <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-6">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ebbinghaus Decay Metric Card */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              <span>Retention Formula</span>
            </span>
            <span className="font-mono text-[11px] text-purple-300">S(t) = S0 * e^(-lambda * t)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Episodic memories not reinforced by subsequent tasks decay within 7-30 days; verified semantic facts remain durable indefinitely.
          </p>
        </div>
      </aside>

      {/* Main Simulation Viewport */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-grid-pattern">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'pipeline' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Synthesized Clusters ({synthesizedClusters.length})
            </button>
            <button
              onClick={() => setActiveTab('vault-preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'vault-preview' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Obsidian Markdown File
            </button>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Status: <span className="text-emerald-400 font-semibold">{currentStep === 5 ? 'Consolidated & Synced' : isRunning ? 'Synthesizing...' : 'Idle'}</span>
          </div>
        </div>

        {/* Tab 1: Synthesized Clusters View */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {synthesizedClusters.map((cluster) => {
                const isSelected = selectedCluster.cluster_id === cluster.cluster_id;
                return (
                  <div
                    key={cluster.cluster_id}
                    onClick={() => setSelectedCluster(cluster)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer backdrop-blur-md space-y-3 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-400/50 shadow-xl'
                        : 'border-slate-800 bg-[#090d16] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white">{cluster.centroid_topic}</h3>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        {cluster.episodic_memory_ids.length} Events Clustered
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {cluster.synthesized_fact}
                    </p>

                    {/* Contradictions resolved */}
                    {cluster.resolved_contradictions.length > 0 && (
                      <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Contradiction Resolved: </strong>{cluster.resolved_contradictions[0]}</span>
                      </div>
                    )}

                    {/* Action items extracted */}
                    <div className="space-y-1 text-xs">
                      <span className="text-[11px] font-mono uppercase text-slate-400">Saner.AI Proactive Actions</span>
                      {cluster.extracted_action_items.map((ai, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-300 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                          <span>{ai}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tags and vault location */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <FileCode className="h-3 w-3" />
                        <span>{cluster.obsidian_vault_file.split('/').pop()}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        {cluster.extracted_tags.map(t => (
                          <span key={t} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
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
        )}

        {/* Tab 2: Obsidian Markdown File Preview */}
        {activeTab === 'vault-preview' && (
          <div className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-2xl space-y-0">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-emerald-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">
                  {selectedCluster.obsidian_vault_file}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Obsidian Compatible
                </span>
              </div>
            </div>

            <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto bg-slate-950/90 leading-relaxed whitespace-pre">
              {generateObsidianMarkdown(selectedCluster)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
};

function generateObsidianMarkdown(cluster: ConsolidationCluster): string {
  return `---
title: "${cluster.centroid_topic}"
type: "semantic_memory"
consolidated_at: "${new Date().toISOString()}"
tags: [${cluster.extracted_tags.map(t => `"${t}"`).join(', ')}]
source_memories: [${cluster.episodic_memory_ids.map(id => `"${id}"`).join(', ')}]
evidence_strength: 0.98
status: "active"
---

# ${cluster.centroid_topic}

## Declarative Summary
${cluster.synthesized_fact}

## Action Items (Auto-Extracted via Saner Engine)
${cluster.extracted_action_items.map(ai => `- [ ] ${ai}`).join('\n')}

## Knowledge Graph Relations
${cluster.generated_edges.map(e => `- [[${e.target_id}]] (${e.relation})`).join('\n')}

## Historical Context & Contradiction Resolution
${cluster.resolved_contradictions.length > 0 ? cluster.resolved_contradictions.map(c => `> **Note**: ${c}`).join('\n') : 'No temporal conflicts observed during ingestion.'}

---
*Generated autonomously by Nexus-Memory-Fabric REM Engine v0.4.2*`;
}
