# ECHO Wiki — Index

Auto-generated from `.manifest.json`. Do not edit by hand.

**Totals:** 38 entries · 8 concepts · 15 entities · 9 sources · 6 analyses

---

## Concepts — Design Patterns & Architectural Commitments

### Architecture

- [[compose-not-capture|Compose, Don't Capture]] — ECHO ingests from tools that already capture; never builds its own capture surface for what others provide
- [[layer-above-saas|Layer Above SaaS]] — ECHO is additive to existing tools, never a replacement. The connective tissue between apps.
- [[sandboxed-capture|Sandboxed Capture]] — Capture enforced as code via the single gate chokepoint, now exercised in production by all four V1 capture surfaces.

### Form Factor

- [[felt-not-seen|Felt, Not Seen]] — Ambient by default; visible on demand for trust. Product appears in the result, not the interface.
- [[ambient-form-factor|Ambient Form Factor]] — Browser extension + MCP server + hotkey overlay. No destination app. Three thin presences.
- [[clipboard-and-launch|Clipboard and Launch]] — Universal delivery mechanism: assemble context, copy to clipboard, open target app, user pastes.

### Brand & Positioning

- [[context-as-moat|Context as Moat]] — Compete on context, not capability. Adjacent to foundation models, structurally outside their wars.

### V1 Scope

- [[drift-prevention|Drift Prevention]] — The discipline of not silently diverging V1 build from V1 spec. Five drift patterns + weekly audit.

---

## Entities — Components, Surfaces, Cohorts

### Form Factor

- [[browser-extension|Browser Extension]] — Already shipped. Captures web AI surfaces and web SaaS. Freemium. Funnel + thesis validator for V1.
- [[mcp-server|MCP Server]] — Local MCP server on 127.0.0.1:38478 exposing search_memories + echo_ping to MCP-compliant AI clients via Streamable HTTP/SSE.
- [[mcp-search-memories|MCP search_memories Tool]] — V1 MCP retrieval tool — case-insensitive substring + filters over captured events; embeddings deferred to V1.5.
- [[hotkey-overlay|Hotkey Overlay]] — System-wide summon. The Wispr Flow analog. Composer appears anywhere, returns context, disappears.

### Architecture — Substrate

- [[local-daemon|Local Daemon]] — Local Node process owning capture, gating, SQLite storage, and MCP retrieval. Single-instance via PID lock; loopback only.
- [[logger|Logger]] — Structured JSON-per-line logger; createLogger(source) bound to a subsystem; ECHO_LOG_LEVEL filters; one line per call to stdout.
- [[storage|Storage]] — Append-only Storage interface with MemoryStorage + SqliteStorage backends; WAL mode, migration runner, source_prefix filter.
- [[capture-gate|Capture Gate]] — Pure-function chokepoint at src/capture/gate.ts; five source kinds, six stable rejection codes, exhaustive test coverage.
- [[capture-pipeline|Capture Pipeline]] — Thin async seam joining gate to storage; processCandidate(event, storage) gates then appends; storage is dependency-injected.
- [[audit-page|Audit Page]] — Minimal Layer 5 surface. See memories, manage permissions, forget. Settings menu, not destination.

### Architecture — Capture Surfaces

- [[fs-watcher|FS Watcher]] — First capture surface; chokidar-backed watcher emitting raw FS-event candidates under allowlisted paths, no parsing.
- [[cursor-extractor|Cursor Extractor]] — Read-only SQLite extractor turning Cursor's globalStorage composer bubbles into per-turn user/assistant CaptureEvents.
- [[claude-code-extractor|Claude Code Extractor]] — Byte-offset tail of Claude Code session JSONL files, emitting one CaptureEvent per user/assistant turn pair.
- [[git-capture|Git Capture]] — Hybrid chokidar+poll watcher that emits one CaptureEvent per new commit (message + diff) from allowlisted git repos.

### Cohorts

- [[target-cohort-indie-ai-builders|Target Cohort: Indie AI Builders]] — V1 wedge: solo devs and small-team founders shipping AI tools. Strong founder-market-fit + warm distribution.

---

## Sources — Decisions & Spec Docs

### V1 Scope

- [[v1-spec|V1 Spec (Locked)]] — Final V1 scope: cohort, bundle, form factor, pricing, sequencing, non-goals, definition of done
- [[bundle-decision|Bundle Decision]] — V1 bundle: Cursor + Claude Code + GitHub + Slack + web AI extension. Why these 5; why not Zoom/email.

### Brand & Positioning

- [[brand-promise|Brand Promise]] — We don't make AI smarter. We make every AI smarter about you. Plus alternative formulations tested.

### Form Factor

- [[form-factor-decision|Form Factor Decision]] — Why no destination app. Browser extension + MCP server + hotkey overlay as the three thin presences.

### Architecture

- [[interface-layers|Interface Layers (1-5)]] — Five layers of user-ECHO communication. V1 ships L1, L3, minimal L5. L2 and L4 deferred.
- [[capture-allowlist|Capture Allowlist]] — Five-category allowlist (apps, domains, fs_paths, apis, git_repos) declared in src/capture/sources.ts; per-source PRs add entries.
- [[stack-decision|Stack Decision]] — Why ECHO's daemon is TypeScript on Node.js for V1, with the Swift Accessibility shim deferred.

### Validation

- [[extension-funnel-logic|Extension Funnel Logic]] — Extension and V1 are family, not pipeline. Gravitational conversion via shared thesis, not push-marketing.
- [[validation-experiments|Validation Experiments]] — Three experiments running parallel to substrate build: user interviews, landing page, concierge.

---

## Analyses — Cross-Cutting Synthesis

### Validation

- [[wedge-vs-thesis-validation|Wedge vs Thesis Validation]] — Extension validates thesis (people pay for unified context). V1 must separately validate the dev wedge.

### Cohorts

- [[three-cohort-comparison|Three-Cohort Comparison]] — Indie AI builders vs vibe coders vs solo SaaS founders. Why indie AI builders win the V1 wedge.

### V1 Scope

- [[tier-vs-vertical-slice|Tier-by-Tier vs Vertical Slice]] — Why building tier-by-tier (universal categories first) is wrong. Ship vertical slice across tiers instead.
- [[narrowest-v1-scope|Narrowest V1 Scope]] — L1 (passive ingestion) + L3 (summoned, Q&A + assembly) + minimal L5. Cut L2 and L4.

### Architecture

- [[system-architecture|System Architecture (Minimum Component View)]] — Six components, three layers. Sources fan in; consumers fan out; the middle (gate + storage + MCP) is fixed. The whole system at a glance.

### Process

- [[wave-1-2-3-retrospective|Wave 1-2-3 Retrospective]] — Process retrospective on items 001-015: where small items, atomic claim, and drift discipline paid off — and where they didn't.
