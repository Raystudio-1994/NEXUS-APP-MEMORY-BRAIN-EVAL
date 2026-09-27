# Implementation Plan — Nexus-Memory-Fabric (NMF) Cognitive OS

Nexus-Memory-Fabric (NMF) is an enterprise-grade autonomous Memory Operating System that transforms ambient developer and agent interactions into an evidence-backed, self-healing, multi-tier cognitive graph.

---

## 1. Core Architecture & System Features

### 🏛️ 1.1 Four-Tier Cognitive Memory Substrate
- **Tier 1: Working Memory (RAM / Redis)** — Active session token streams, sliding-window buffers, prompt prefix caches, and sub-millisecond scratchpads.
- **Tier 2: Episodic Memory (Vector DB / Qdrant / Milvus)** — Continuous event diary, multi-dimensional semantic embeddings, temporal logs, and novelty-driven decay.
- **Tier 3: Semantic & Declarative Memory (Graph + Obsidian Vault / Neo4j / Kùzu)** — Timeless declarative knowledge, bi-directional `[[wikilinks]]`, community clusters, and provenance-anchored facts.
- **Tier 4: Procedural Memory (Relational / PostgreSQL & SQLite)** — Deterministic agent trajectories, error-recovery recipes, prompt chains, workflow states, and CRDT sync vectors.

---

## 2. Interactive Systems & UI Modules

### 🎬 2.1 Executive Visual Storyboard & Cognitive Lifecycle
- **Interactive 6-Stage Timeline**:
  1. *Developer Commit & Activity Capture* (Git diffs, file modifications, terminal logs with SHA-256)
  2. *Event Ingestion & Buffering* (API / gRPC Gateway $\to$ Redis working context)
  3. *Episodic Memory Formation* (Vector indexing, temporal tags, Ebbinghaus decay curve)
  4. *Nightly REM Consolidation* (DBSCAN clustering, conflict resolution, Saner.AI auto-synthesis)
  5. *Semantic Graph & Markdown Sync* (Obsidian vault synchronization, bi-directional linking)
  6. *Agent Recall & Attested Context* (Composite scoring: cosine similarity + centrality + temporal validity)
- **Executive Diagram Integration**: Built-in interactive architectural diagrams mirroring the official NMF executive blueprints.

### 🌌 2.2 Interactive 4-Tier Topology & Blast Radius Explorer
- **Interactive Force/Brain Graph Canvas**: Visual representation of nodes across all 4 tiers with color-coded classification (Working, Episodic, Semantic, Procedural).
- **Node Inspector**: Inspect canonical IDs, SHA-256 hashes, confidence levels, bitemporal timestamps ($t_v$ vs $t_i$), and supersession DAGs.
- **Blast Radius Calculator**: One-click transitive dependency calculation showing the cascading invalidation impact of any memory edit or deletion.

### ⚡ 2.3 Context Compiler & Token Budget Optimizer Studio
- **Constrained Knapsack Optimization**: Dynamic memory allocation solver ($\max \sum U_i x_i \text{ subject to } \sum \text{tokens}_i \le B$).
- **OpenViking Progressive Context (L0–L3)**:
  - **L0**: Single-line abstract memory
  - **L1**: Structured explanation & state capsule
  - **L2**: Evidence, provenance hashes & source references
  - **L3**: Zero-trust raw evidence envelope (`<MEMORY_EVIDENCE>`) with prompt-injection defense
- **Real-Time Token Counter**: Interactive slider for context budgets (500 to 8000 tokens) demonstrating deterministic packing.

### 🌙 2.4 Autonomous REM + Saner.AI Consolidation Simulator
- **Step-by-Step Batch Runner**:
  - *Phase 1: Episodic Extraction & Decay*: Identifies stale nodes using $S(t) = S_0 e^{-\lambda t}$.
  - *Phase 2: DBSCAN Vector Clustering*: Density-based grouping ($\epsilon=0.15$) of related episodic events.
  - *Phase 3: LLM Auto-Synthesis*: Generates consolidated semantic nodes, extracts action items, and resolves temporal contradictions (e.g., PostgreSQL supersedes Redis).
  - *Phase 4: Obsidian Vault Sync*: Generates live markdown notes with YAML frontmatter, tags, and bi-directional links.

### 🛡️ 2.5 Strict Cryptographic Provenance & Guardrail Lab
- **NotebookLM-Style Strict Grounding**: Verbatim extracts mapped to SHA-256 checksums and immutable source events.
- **Tamper & Hallucination Guardrail Test**: Interactive byte tampering simulator that demonstrates instantaneous detection and flagging of ungrounded LLM drift.
- **Zero-Trust IAM Policy Editor**: Scoped memory token verification (`READ_ONLY`, `SCOPE: Project_Alpha`).

### 🤖 2.6 Live Multi-Turn Agent Workbench & Trace Telemetry
- **Agent Intelligence**: Powered by Gemini (`gemini-3.1-pro-preview` with High Thinking mode for complex reasoning, `gemini-3.5-flash` for general queries, and `gemini-3.1-flash-lite` for low-latency memory extraction).
- **Retrieval Trace Inspector**: Deep inspection of why each memory was surfaced (semantic similarity, entity overlap, temporal match, authority score, conflict penalty).
- **Live Memory Ingestion**: Chat messages and agent tool calls automatically generate normalized memory events and update the live graph in real-time.

### 📊 2.7 Competitive Benchmark Suite & API Sandbox
- **Comparative Matrix**: Native evaluation against Mem0, Claude Code Auto Memory, OpenViking, and Hermes Agent across LoCoMo, LongMemEval-V2, and BEAM 10M token stress tests.
- **Interactive REST/gRPC Sandbox**: Live testing of `/v1/events/observe`, `/v1/memory/surface`, `/v1/memory/sync` (Yjs CRDT), and `/v1/memory/{id}` cascade deletion.

---

## 3. Implementation Verification & Quality Gates

- Run build verification with `compile_applet` and typecheck via `lint_applet`.
- Ensure real-time state reactivity across all simulator tabs.
- Ensure cryptographic SHA-256 calculation runs deterministically in-browser.
