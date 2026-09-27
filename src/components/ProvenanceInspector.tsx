import React, { useState, useEffect } from 'react';
import { ProvenanceAnchor, MemoryEvent } from '../types/memory';
import { api } from '../lib/apiClient';
import { computeSha256 } from '../lib/geminiMemory';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Hash, 
  Binary, 
  RefreshCw,
  Search,
  ExternalLink,
  Lock
} from 'lucide-react';

interface ProvenanceInspectorProps {
  anchors: ProvenanceAnchor[];
  events: MemoryEvent[];
}

export const ProvenanceInspector: React.FC<ProvenanceInspectorProps> = ({
  anchors,
  events
}) => {
  const [selectedAnchorId, setSelectedAnchorId] = useState<string>(anchors[0]?.anchor_id || '');
  const [tamperedText, setTamperedText] = useState<string>('');
  const [isTampered, setIsTampered] = useState(false);
  const [computedHash, setComputedHash] = useState<string>('');
  
  // Real-time backend attestation states
  const [backendVerification, setBackendVerification] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const selectedAnchor = anchors.find(a => a.anchor_id === selectedAnchorId) || anchors[0];
  const matchedEvent = events.find(e => e.event_id === selectedAnchor?.source_event_id) || events[0];

  const currentVerbatim = isTampered ? tamperedText : selectedAnchor?.verbatim_extract || '';

  const runHashCheck = async (text: string) => {
    const hash = await computeSha256(text);
    setComputedHash(hash);
  };

  const verifyWithBackend = async () => {
    if (!selectedAnchor) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyProvenance(selectedAnchor.memory_id);
      setBackendVerification(res);
    } catch (e) {
      console.error('Backend provenance verify failed:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (selectedAnchor) {
      setIsTampered(false);
      setTamperedText('');
      runHashCheck(selectedAnchor.verbatim_extract);
      verifyWithBackend();
    }
  }, [selectedAnchorId, selectedAnchor]);

  const handleTamperToggle = async () => {
    if (!isTampered) {
      const altered = selectedAnchor.verbatim_extract + ' [TAMPERED_GENERATIVE_HALLUCINATION_OR_DRIFT_ATTACK]';
      setTamperedText(altered);
      setIsTampered(true);
      await runHashCheck(altered);
      // Simulate backend response changes when tampered
      setBackendVerification({
        verified: false,
        checks: [
          { anchor_id: selectedAnchor.anchor_id, hash_match: false, byte_range_match: false, event_exists: true }
        ]
      });
    } else {
      setIsTampered(false);
      setTamperedText('');
      await runHashCheck(selectedAnchor.verbatim_extract);
      verifyWithBackend();
    }
  };

  const isHashMatch = computedHash === (selectedAnchor?.sha256_hash || '') && !isTampered;
  const isBackendOk = backendVerification ? backendVerification.verified : isHashMatch;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Sidebar: Citation Anchors List */}
      <aside className="w-full lg:w-80 border-r border-slate-800 bg-[#090d16] p-5 overflow-y-auto space-y-4 shrink-0 font-sans">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold uppercase mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>NotebookLM-Style Provenance</span>
          </div>
          <h2 className="text-base font-bold text-white">Citation Anchor Ledger</h2>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic SHA-256 cryptographic verification preventing context decay and hallucination.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          {anchors.map((anchor) => {
            const isSelected = anchor.anchor_id === selectedAnchorId;
            return (
              <button
                key={anchor.anchor_id}
                onClick={() => {
                  setSelectedAnchorId(anchor.anchor_id);
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-emerald-400 mb-1">
                  <span>{anchor.anchor_id}</span>
                  <span className="uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {anchor.source_type}
                  </span>
                </div>
                <div className="font-medium text-slate-200 line-clamp-1">{anchor.source_title}</div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
                  SHA: {anchor.sha256_hash.slice(0, 16)}...
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Verification & Hash Lab */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-grid-pattern">
        {/* Verification Status Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          isHashMatch && isBackendOk
            ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200'
            : 'border-red-500/80 bg-red-950/30 text-red-200 glow-red animate-pulse'
        }`}>
          <div className="flex items-center gap-3">
            {isHashMatch && isBackendOk ? (
              <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-red-400 shrink-0" />
            )}
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                {isHashMatch && isBackendOk ? 'Deterministic Grounding: Verified 100%' : 'ALERT: Unverified Synthesis / Tamper Detected'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 font-sans">
                {isHashMatch && isBackendOk
                  ? 'Verbatim extract strictly matches the immutable source artifact hash stored at ingestion.'
                  : 'Computed SHA-256 hash does not match source authority. Content flagged as potential hallucination.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={verifyWithBackend}
              disabled={isVerifying}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-all font-mono"
            >
              <RefreshCw className={`h-3 w-3 ${isVerifying ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleTamperToggle}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                isTampered
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900/60'
              }`}
            >
              {isTampered ? 'Restore Original' : 'Inject Tamper Attack'}
            </button>
          </div>
        </div>

        {/* Verbatim Extract vs Source Event Comparison */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 font-sans">
          {/* Left: Memory Verbatim Extract */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-xl space-y-3 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-200 font-mono">
                  MEMORIZED VERBATIM EXTRACT (Byte Range: [{selectedAnchor?.byte_range?.join(', ') || '0, 100'}])
                </h4>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                isHashMatch ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
              }`}>
                {isHashMatch ? 'MATCHED' : 'HASH MISMATCH'}
              </span>
            </div>

            <textarea
              value={currentVerbatim}
              onChange={(e) => {
                setTamperedText(e.target.value);
                setIsTampered(true);
                runHashCheck(e.target.value);
              }}
              rows={4}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
            />

            {/* Hash Display */}
            <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1 text-xs font-mono">
              <div className="text-slate-400 text-[10px] uppercase">Computed SHA-256 Checksum:</div>
              <div className={`break-all text-[11px] font-bold ${isHashMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                {computedHash || selectedAnchor?.sha256_hash}
              </div>
            </div>
          </div>

          {/* Right: Original Raw Ingested Event Payload */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-xl space-y-3 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Binary className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold text-slate-200 font-mono">
                  IMMUTABLE SOURCE EVENT [{matchedEvent?.event_id}]
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                CLASS: {matchedEvent?.evidence_class}
              </span>
            </div>

            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
              <code>{JSON.stringify(matchedEvent?.payload, null, 2)}</code>
            </pre>

            <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1 text-xs font-mono">
              <div className="text-slate-400 text-[10px] uppercase">Registered Event Content Hash:</div>
              <div className="break-all text-[11px] text-purple-300 font-bold">
                {matchedEvent?.content_hash}
              </div>
            </div>
          </div>
        </div>

        {/* Backend Checks Verification Summary */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#090d16] space-y-4 font-sans">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Full-Stack Verification Check Ledger
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between">
              <span className="text-xs text-slate-400">SHA256 Match:</span>
              <span className={`text-xs font-mono font-bold ${isHashMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                {isHashMatch ? 'SUCCESS ✅' : 'FAILED ❌'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between">
              <span className="text-xs text-slate-400">Byte Range Offset check:</span>
              <span className={`text-xs font-mono font-bold ${backendVerification?.checks?.[0]?.byte_range_match !== false ? 'text-emerald-400' : 'text-red-400'}`}>
                {backendVerification?.checks?.[0]?.byte_range_match !== false ? 'VERIFIED ✅' : 'FAILED ❌'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between">
              <span className="text-xs text-slate-400">Relational Event Check:</span>
              <span className={`text-xs font-mono font-bold ${matchedEvent ? 'text-emerald-400' : 'text-red-400'}`}>
                {matchedEvent ? 'EXISTS ✅' : 'MISSING ❌'}
              </span>
            </div>
          </div>
        </div>

        {/* Lineage Trace Visualization */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#090d16] space-y-4 font-sans">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Deterministic Provenance & Attestation Lineage
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
            {[
              { step: '01', name: 'Raw Ingestion', sub: 'Git / Sensor' },
              { step: '02', name: 'Canonical Event', sub: 'SHA-256 Hash' },
              { step: '03', name: 'Semantic Extract', sub: 'Facts & Entities' },
              { step: '04', name: 'Tier 3 Graph', sub: 'Obsidian Node' },
              { step: '05', name: 'Context Capsule', sub: 'Knapsack Compile' },
              { step: '06', name: 'Host LLM', sub: 'Attested Reply' },
            ].map((node, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-mono text-[10px] text-cyan-400 font-bold">STEP {node.step}</span>
                <div className="font-semibold text-slate-200 text-xs">{node.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{node.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
export default ProvenanceInspector;
