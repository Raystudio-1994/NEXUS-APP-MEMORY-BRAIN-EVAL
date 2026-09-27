import React from 'react';
import { 
  Network, 
  FileText, 
  Cpu, 
  Moon, 
  ShieldCheck, 
  Terminal, 
  BarChart3, 
  Bot, 
  Sparkles,
  Layers,
  Database,
  CheckCircle2
} from 'lucide-react';
import { SystemMetrics } from '../types/memory';

export type ActiveTab = 
  | 'blueprint' 
  | 'topology' 
  | 'compiler' 
  | 'consolidation' 
  | 'provenance' 
  | 'api-sandbox' 
  | 'benchmarks' 
  | 'agent-workbench';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  metrics: SystemMetrics;
  hasApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  hasApiKey
}) => {
  const tabs = [
    { id: 'blueprint', label: 'Architecture Blueprint', icon: FileText, badge: 'v1.0' },
    { id: 'topology', label: '4-Tier Topology Graph', icon: Network, badge: `${metrics.graph_nodes} nodes` },
    { id: 'compiler', label: 'Context Compiler', icon: Cpu, badge: 'Knapsack' },
    { id: 'consolidation', label: 'REM Nightly Engine', icon: Moon, badge: 'Auto-Sync' },
    { id: 'provenance', label: 'Provenance Guardrail', icon: ShieldCheck, badge: 'SHA-256' },
    { id: 'api-sandbox', label: 'API & gRPC Sandbox', icon: Terminal, badge: 'REST/MCP' },
    { id: 'benchmarks', label: 'Competitive Matrix', icon: BarChart3, badge: 'LoCoMo' },
    { id: 'agent-workbench', label: 'Agent Playground', icon: Bot, badge: 'AI Live' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-950/60 bg-[#07090e]/90 backdrop-blur-md">
      {/* Top Banner with System Telemetry */}
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 border-b border-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
            <Layers className="h-5 w-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Nexus<span className="text-cyan-400">MemoryFabric</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/50 text-cyan-300">
                  NMF OS v0.4.2
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Autonomous Multi-Tier Agent Memory OS & Knowledge Graph Infrastructure
            </p>
          </div>
        </div>

        {/* Live System Status Metrics */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900/60 text-slate-300">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>Store: <strong className="text-slate-100 font-mono">Postgres 18 + Qdrant</strong></span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900/60 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Provenance: <strong className="text-emerald-400 font-mono">100% Attested</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-cyan-900/40 bg-cyan-950/30 text-cyan-300 font-mono text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>{hasApiKey ? 'Gemini 3.1 Pro Live' : 'Deterministic Mode'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 py-1.5 no-scrollbar bg-[#090d16]/70">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-cyan-500/20 text-cyan-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
