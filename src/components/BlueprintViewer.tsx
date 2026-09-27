import React, { useState } from 'react';
import { 
  BLUEPRINT_SECTIONS, 
  BlueprintSection 
} from '../data/blueprintData';
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  ChevronRight, 
  Cpu, 
  Calculator, 
  ShieldAlert, 
  Database,
  Code2,
  Sparkles
} from 'lucide-react';

export const BlueprintViewer: React.FC = () => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('system-overview');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Math calculator state for R(m,q)
  const [simSemantic, setSimSemantic] = useState(0.88);
  const [simLexical, setSimLexical] = useState(0.72);
  const [simEntity, setSimEntity] = useState(0.95);
  const [simGraph, setSimGraph] = useState(0.65);
  const [simTemporal, setSimTemporal] = useState(1.0);
  const [simConflict, setSimConflict] = useState(0.0);
  const [simAuthority, setSimAuthority] = useState(0.92);

  // Calculate composite score
  const computedScore = (
    0.35 * simSemantic +
    0.15 * simLexical +
    0.15 * simEntity +
    0.15 * simGraph +
    0.10 * simTemporal +
    0.10 * simAuthority -
    0.40 * simConflict
  ).toFixed(3);

  const activeSection = BLUEPRINT_SECTIONS.find(s => s.id === selectedSectionId) || BLUEPRINT_SECTIONS[0];

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleDownloadMarkdown = () => {
    const fullDoc = BLUEPRINT_SECTIONS.map(s => {
      let doc = `# Section ${s.number}: ${s.title}\n**${s.subtitle}**\n\n${s.summary}\n\n${s.contentMarkdown}\n`;
      if (s.codeBlocks) {
        s.codeBlocks.forEach(cb => {
          doc += `\n### File: \`${cb.filename}\`\n${cb.description}\n\`\`\`${cb.language}\n${cb.code}\n\`\`\`\n`;
        });
      }
      return doc;
    }).join('\n---\n\n');

    const blob = new Blob([`# Nexus-Memory-Fabric Architecture Blueprint v1.0\n\n${fullDoc}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Nexus-Memory-Fabric-Architecture-Blueprint-v1.0.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-[#07090e]">
      {/* Sidebar navigation */}
      <aside className="w-full lg:w-80 border-r border-slate-800/80 bg-[#090d16]/80 p-4 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              System Specifications
            </h2>
            <p className="text-[11px] text-slate-400">Canonical Design Blueprint</p>
          </div>
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/60 hover:text-cyan-200 transition-colors"
            title="Download Full Blueprint Markdown"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export MD</span>
          </button>
        </div>

        <nav className="space-y-1.5">
          {BLUEPRINT_SECTIONS.map((section) => {
            const isSelected = section.id === selectedSectionId;
            return (
              <button
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start justify-between group ${
                  isSelected
                    ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-cyan-500 font-bold">
                      §{section.number}
                    </span>
                    <span className="font-medium text-slate-200 group-hover:text-white">
                      {section.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {section.subtitle}
                  </p>
                </div>
                <ChevronRight className={`h-4 w-4 mt-0.5 shrink-0 transition-transform ${
                  isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                }`} />
              </button>
            );
          })}
        </nav>

        {/* Quick Invariants Box */}
        <div className="mt-6 p-3 rounded-lg border border-amber-500/20 bg-amber-950/10 text-amber-200/90 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Prime Invariant Rule</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
            Canonical Truth ≠ Retrieved Memory ≠ LLM Context. Raw evidence is immutable; beliefs are temporal.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-grid-pattern">
        {/* Section Header */}
        <div className="border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold mb-2">
            <span>SPECIFICATION DOCUMENT</span>
            <span>•</span>
            <span>SECTION {activeSection.number}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {activeSection.title}
          </h1>
          <p className="text-sm lg:text-base text-cyan-200/80 mt-1 font-medium">
            {activeSection.subtitle}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {activeSection.tags.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700 bg-slate-800/70 text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-sm text-slate-300 leading-relaxed">
            <strong className="text-slate-100 font-semibold">Executive Summary: </strong>
            {activeSection.summary}
          </div>
        </div>

        {/* Markdown Content */}
        <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4">
          <div className="whitespace-pre-line font-sans">
            {activeSection.contentMarkdown}
          </div>
        </div>

        {/* Interactive Formulas & Sliders (for Section 04: Token Optimization) */}
        {activeSection.mathFormulas && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span>Mathematical Formulation & Live Evaluator</span>
            </h3>

            {activeSection.mathFormulas.map((math, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-cyan-900/40 bg-[#090d16]/90 space-y-4">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-cyan-300 text-center text-sm md:text-base overflow-x-auto shadow-inner">
                  {math.formula}
                </div>
                <p className="text-xs text-slate-400">{math.explanation}</p>

                {/* Live parameter sliders for R(m,q) */}
                {activeSection.id === 'token-optimization' && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Interactive Composite Score Simulator</span>
                      <span className="font-mono text-cyan-400 font-bold px-2 py-1 rounded bg-cyan-950/80 border border-cyan-800/60">
                        R(m,q) Result = {computedScore}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Semantic Cosine (S_sem):</span>
                          <span className="font-mono text-cyan-300">{simSemantic}</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.01" 
                          value={simSemantic} 
                          onChange={e => setSimSemantic(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">BM25 Lexical Overlap (S_lex):</span>
                          <span className="font-mono text-cyan-300">{simLexical}</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.01" 
                          value={simLexical} 
                          onChange={e => setSimLexical(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Entity Overlap (S_ent):</span>
                          <span className="font-mono text-cyan-300">{simEntity}</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.01" 
                          value={simEntity} 
                          onChange={e => setSimEntity(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Conflict Penalty (X_conflict):</span>
                          <span className="font-mono text-red-400">{simConflict}</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.01" 
                          value={simConflict} 
                          onChange={e => setSimConflict(parseFloat(e.target.value))}
                          className="w-full accent-red-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Variable dictionary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400">
                  {Object.entries(math.variables).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-1.5">
                      <span className="font-mono text-cyan-400 font-semibold">{k}:</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System Diagrams */}
        {activeSection.diagrams && activeSection.diagrams.map((diag, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              <span>{diag.title}</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] sm:text-xs text-cyan-300/90 overflow-x-auto shadow-xl leading-relaxed whitespace-pre">
              {diag.definition}
            </div>
          </div>
        ))}

        {/* Code Blocks / Schemas */}
        {activeSection.codeBlocks && activeSection.codeBlocks.map((cb, idx) => (
          <div key={idx} className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400/80"></span>
                <span className="font-mono text-xs font-semibold text-slate-200">{cb.filename}</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800">
                  {cb.language}
                </span>
              </div>

              <button
                onClick={() => handleCopy(cb.code, `${activeSection.id}-${idx}`)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              >
                {copiedCodeId === `${activeSection.id}-${idx}` ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-mono text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="font-mono text-[11px]">Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 text-xs text-slate-400 border-b border-slate-800/60 bg-slate-950/40">
              {cb.description}
            </div>

            <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto bg-slate-950/90 max-h-96 leading-relaxed">
              <code>{cb.code}</code>
            </pre>
          </div>
        ))}
      </main>
    </div>
  );
};
