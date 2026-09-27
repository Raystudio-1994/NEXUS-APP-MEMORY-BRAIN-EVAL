import React, { useState, useEffect } from 'react';
import { MemoryItem, MemoryEvent, ProvenanceAnchor } from '../types/memory';
import { api } from '../lib/apiClient';
import { 
  Bot, 
  Send, 
  Cpu, 
  Sparkles, 
  Clock, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle,
  Database,
  Brain,
  RefreshCw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface LiveAgentWorkbenchProps {
  memories: MemoryItem[];
  events: MemoryEvent[];
  onAddMemory: (newMem: MemoryItem) => void;
  onAddEvent: (newEvt: MemoryEvent) => void;
  onAddAnchor: (newAnch: ProvenanceAnchor) => void;
}

export const LiveAgentWorkbench: React.FC<LiveAgentWorkbenchProps> = ({
  memories,
  events,
  onAddMemory,
  onAddEvent,
  onAddAnchor
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      text: 'Nexus-Memory-Fabric Agent initialized. I have full contextual access to your 4-tier memory substrate, bitemporal decisions, and provenance ledger. How can I assist you?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [retrievalTrace, setRetrievalTrace] = useState<any>(null);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    const startTime = performance.now();

    // 1. Trigger live backend semantic extraction
    try {
      const extracted = await api.extract(text, 'chat');
      if (extracted.memories && extracted.memories.length > 0) {
        extracted.events.forEach(e => onAddEvent(e));
        extracted.memories.forEach(m => onAddMemory(m));
        extracted.citations.forEach(c => onAddAnchor(c));
      }
    } catch (err) {
      console.warn('Extraction failure:', err);
    }

    // 2. Trigger compileContext server-side to get grounded prompt and trace details
    let responseText = '';
    try {
      const capsule = await api.compile(text, 1500);
      setRetrievalTrace(capsule);

      if (capsule.current_knowledge && capsule.current_knowledge.length > 0) {
        responseText = `Based on our verified memory substrate:\n\n` +
          capsule.current_knowledge.map((k: any) => `• [Tier ${k.tier}] ${k.statement}`).join('\n\n') +
          `\n\nAll decisions are grounded in immutable event records with SHA-256 provenance.`;
      } else {
        responseText = `I have received your query. There are no direct matching bitemporal assertions in the active context, but I will record this interaction to episodic buffers.`;
      }
    } catch (e) {
      console.error('Server context compilation failed:', e);
      responseText = 'Failed to load grounded context from persistent memory OS.';
    }

    const agentMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: responseText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, agentMsg]);
    setIsThinking(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col h-full bg-[#07090e] border-r border-slate-800/80 relative">
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 select-text">
          {messages.map((msg) => {
            const isAgent = msg.sender === 'agent';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isAgent 
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-200'
                }`}>
                  {isAgent ? <Bot className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                </div>

                <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                  isAgent
                    ? 'bg-[#090d16]/90 border-slate-800 text-slate-100 shadow-md'
                    : 'bg-slate-900/60 border-slate-800/60 text-slate-200'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[10px] text-slate-500 font-mono text-right">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 p-3 rounded-xl border border-slate-800 bg-[#090d16] text-xs font-mono text-cyan-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Scanning 4-tier vector/graph substrate...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Dock */}
        <div className="p-4 bg-[#090d16]/80 border-t border-slate-800/80 flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Search, recall, or teach the memory graph..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={isThinking || !inputText.trim()}
            className="p-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-all shadow-md shadow-cyan-600/10 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Retrieval Trace & Memory Telemetry Panel */}
      <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#090d16] p-5 overflow-y-auto space-y-5 shrink-0 font-sans">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase mb-1">
            <Cpu className="h-4 w-4" />
            <span>Retrieval Trace telemetry</span>
          </div>
          <h2 className="text-base font-bold text-white">Context Attestation Log</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-signal relevance scoring and Knapsack Packing calculations for active LLM context injection.
          </p>
        </div>

        {retrievalTrace ? (
          <div className="space-y-4">
            {/* Packing Overview */}
            <div className="p-4 rounded-xl border border-slate-850 bg-slate-950/60 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Interactive Context</span>
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {retrievalTrace.tokens_used} tok / {retrievalTrace.token_budget} max
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Packed <strong className="text-slate-200">{retrievalTrace.trace.candidates_selected}</strong> memories out of <strong className="text-slate-200">{retrievalTrace.trace.candidates_retrieved}</strong> candidates safely.
              </div>
            </div>

            {/* Trace Metrics Breakdown */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Multi-Signal Breakdown Scores
              </h3>
              <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-900">
                  <span>Semantic Similarity score:</span>
                  <span className="text-cyan-400 font-bold">{retrievalTrace.trace.retriever_breakdown.semantic_cosine}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-900">
                  <span>BM25 Word matching:</span>
                  <span className="text-purple-400 font-bold">{retrievalTrace.trace.retriever_breakdown.bm25_lexical}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-900">
                  <span>Entity overlap score:</span>
                  <span className="text-emerald-400 font-bold">{retrievalTrace.trace.retriever_breakdown.entity_overlap}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-900">
                  <span>Graph neighborhood centrality:</span>
                  <span className="text-amber-400 font-bold">{retrievalTrace.trace.retriever_breakdown.temporal_graph}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl border border-dashed border-slate-800 bg-[#090d16]/30 flex flex-col items-center justify-center text-center h-48 text-xs">
            <Brain className="h-8 w-8 text-slate-700 mb-2" />
            <p className="text-slate-500">Submit a query or chat message to generate and inspect real server-side context compile traces.</p>
          </div>
        )}
      </aside>
    </div>
  );
};
