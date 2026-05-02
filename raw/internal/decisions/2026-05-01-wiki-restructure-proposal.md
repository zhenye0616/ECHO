---
authored: 2026-05-01
author: strategist (Claude session, prompted by founder via 2026-05-01-wiki-restructure handoff)
status: proposal — awaiting founder approval
target: wiki/ restructure for waves 4–6 scale
---

# Wiki restructure proposal

## TL;DR

The current four-folder taxonomy (`concepts/` `entities/` `sources/` `analyses/`) is showing the seams. I recommend an **eight-folder, audience-aligned, layer-aware structure** with a `status:` frontmatter field. The proposal preserves all 39 pages, makes the lagging-doc commitment structurally visible, and gives per-app data references and capture surfaces obvious homes that scale across the V1 bundle and beyond. Three options sketched below; I recommend Option C (my hybrid). Migration is one atomic commit, with one explicit ask to the founder: surgical updates to **5 broken markdown links** outside `wiki/` (in `docs/NORTH_STAR.md` and `docs/STATUS.md`) need to ride in the same commit, since "do not touch docs/" and "no broken links" cannot both hold under a folder rename. I am asking permission for that exception.

---

## 1. Diagnosis

The five pain points the prior session named are real. I confirm and refine.

### Pain 1: `concepts/` is a junk drawer (8 pages, three different kinds of thing)

- **Brand commitments:** `felt-not-seen`, `context-as-moat` — what we *are*.
- **Form-factor + interaction patterns:** `ambient-form-factor`, `clipboard-and-launch`, `compose-not-capture`, `layer-above-saas` — chosen *designs*.
- **Operating disciplines:** `drift-prevention`, `sandboxed-capture` — *practices* enforced.

These read at different reading distances. A founder scanning the folder is asking three different questions ("what do I believe?", "what shape did I pick?", "what discipline am I holding?") and the folder doesn't help.

### Pain 2: `entities/` is a flat 15-page list of unlike things

- **Substrate (durable middle):** `local-daemon`, `capture-gate`, `capture-pipeline`, `storage`, `logger`.
- **Capture surfaces (left edge):** `fs-watcher`, `cursor-extractor`, `claude-code-extractor`, `git-capture`.
- **Retrieval/delivery surfaces (right edge):** `mcp-server`, `mcp-search-memories`, `hotkey-overlay`, `audit-page`, `browser-extension`.
- **Cohort research finding:** `target-cohort-indie-ai-builders` — not an entity in the same sense at all.

The `system-architecture.md` page **already names this split** ("sources fan in on the left; consumers fan out on the right; the middle is fixed"). The folder structure should mirror that vocabulary.

### Pain 3: `analyses/` is also a junk drawer

- **Locked scope decisions** (functionally `sources/`): `narrowest-v1-scope`, `tier-vs-vertical-slice`.
- **Process retrospective** (operating-model meta): `wave-1-2-3-retrospective`.
- **Architecture overview** (canonical reference, not analysis): `system-architecture`.
- **Genuine cross-cutting analysis:** `wedge-vs-thesis-validation`, `three-cohort-comparison`.

Same reading-distance problem as concepts/.

### Pain 4: per-app reference pages have no natural home

`cursor-collected-data.md` is currently in `sources/`, which is a stretch — it isn't a strategic decision, it's reference documentation for "what context do I actually have for Cursor?" When `claude-code-collected-data`, `github`, `slack`, `web-extension` follow it, four more pages will land in `sources/` that aren't sources. The pattern needs first-class folder citizenship.

### Pain 5: lagging-doc commitment isn't structurally visible

`hotkey-overlay.md` and `audit-page.md` are aspirational stubs (V1-locked but not built). They live in the same folder as `mcp-server.md` (which is fully shipped, on `127.0.0.1:38478`) and `browser-extension.md` (already shipped, in Chrome Web Store review). Nothing distinguishes them. A reader scanning `wiki/` cannot tell shipped reality from planned reality. CLAUDE.md's central commitment ("the wiki is lagging documentation of shipped reality") is not enforced by anything.

### One pain the prior session didn't name: the canonical pages are buried

`wiki/analyses/system-architecture.md` is the single best landing page for understanding ECHO end-to-end (the diagram + six components + data shape). It is currently in `analyses/`. Same for `interface-layers.md` in `sources/` — the L1–L5 model that anchors the spec's vocabulary. These should be the most-read, most-linked pages, and they're hidden among process retros and validation analyses.

---

## 2. Three structural options

I evaluated three — the prior session's Option A, an audience-first lifecycle-cut alternative, and a hybrid that integrates spec vocabulary with audience clarity. I'll be direct: A is in the right neighborhood; B has a fatal flaw; C (my own) is what I recommend.

### Option A — Topic + audience hybrid (prior session's sketch)

```
wiki/
├── product/              locked decisions + research
├── principles/           commitments + disciplines
├── architecture/         the substrate that doesn't move
├── capture/              L1 — getting data IN
├── retrieval/            L3 — getting data OUT to AI
├── delivery/             form factors users touch
├── per-app/              what's collected from each app
├── operating-model/      meta — agents, drift, retros
└── index.md
```

**Why it works:** Splits the three current junk drawers into clear-membership folders. Aligns "capture" with the spec vocabulary (L1). Per-app gets a top-level home.

**Where it breaks for ECHO specifically:** `retrieval/` and `delivery/` are both L3 outputs. MCP server is *both* — it delivers context to AI clients, and it's the retrieval interface. Splitting them produces a fight over which folder MCP belongs in. The audit page (L5) is a "delivery" of audit data to the user — but it's not a Layer 3 retrieval. Two folders create one judgment call per page; that's exactly the kind of taxonomic friction we're trying to eliminate. Also: `per-app/` as a top-level peer of `architecture/` is a category error — per-app reference is *part of* capture (it documents what each capture surface produces), not a peer of the substrate.

### Option B — Audience-first lifecycle (shipped/planned/research)

```
wiki/
├── strategy/             scope decisions + roadmap
├── shipped/              what works today (substrate + surfaces + per-app)
├── planned/              specced but not yet built (audit-page, hotkey)
├── research/             cohort + thesis validation work
├── operating-model/      drift, retros
└── index.md
```

**Why someone might reach for it:** The lagging-doc commitment is the folder structure itself. `planned/` makes the aspirational pages sit visibly outside shipped reality.

**Why it's a fatal flaw for ECHO:** Pages move folders when their underlying thing ships. `hotkey-overlay.md` lives in `planned/` today, then moves to `shipped/` on week 10, then merges with whatever group its siblings live in. Every wiki rewrite breaks links from `docs/`, `backlog/`, and the YC wiki. Worse: it splits siblings — `audit-page` (planned) is conceptually cousin to `mcp-server` (shipped) but they live in different folders. Reading "what surfaces does ECHO have?" requires touching two folders. The lagging-doc visibility belongs in **frontmatter** (`status:`), not folder structure. A `status:` field gets you the visibility without the migration churn.

### Option C — Layer-aligned audience hybrid (my recommendation)

```
wiki/
├── product/              the strategic "what" — locked scope, target cohort, brand
├── principles/           design + brand + scope commitments (active disciplines)
├── architecture/         the durable middle — substrate + the canonical models
├── capture/              L1 — per-source surfaces (substrate's left edge)
│   └── per-app/          what each app actually contributes
├── surfaces/             L3 + L5 — what users + AI clients touch (substrate's right edge)
├── research/             cohort + thesis validation work
├── operating-model/      meta — process retros, drift audits
├── index.md
└── .manifest.json
```

**Why it works for ECHO specifically:**

1. **Mirrors the spec's own vocabulary.** `system-architecture.md` says "sources fan in / middle is fixed / consumers fan out." That's exactly what `capture/` → `architecture/` → `surfaces/` reads as. `interface-layers.md` defines L1, L3, L5 — which `capture/` (L1), `surfaces/` (L3+L5) make legible.
2. **Eliminates the retrieval/delivery split.** L3 push (hotkey + clipboard) and L3 pull (MCP) and L5 (audit) are *all* surfaces ECHO presents. They share trust profile, share the felt-not-seen commitment, and share the architectural property that they fan out from the same `storage`. One folder.
3. **Per-app is part of capture, not a peer.** Reading `wiki/capture/cursor-extractor.md` (the mechanics) and `wiki/capture/per-app/cursor-collected-data.md` (the field-level reference) sits naturally; they're sibling concerns, not sibling folders.
4. **Principles are honest disciplines, not patterns mixed with brand.** `felt-not-seen` and `drift-prevention` and `sandboxed-capture` are all *commitments the founder is actively holding* — different content, same reading distance.
5. **The lagging-doc commitment lives in frontmatter.** A `status: shipped | planned` field on every page makes the visibility structural without the migration churn of B.

**Where it has friction:**

- **`drift-prevention` is borderline** between `principles/` and `operating-model/`. It's the canonical discipline AGENT_INSTRUCTIONS.md cites. I put it in `principles/` because it shapes the *product* (drift would change what V1 ships), not just the build process. But a reader looking under `operating-model/` for it has a defensible case. **Decision: principles/.** It is actively held; it's not a retrospective.
- **`interface-layers` is borderline** between `product/` (the V1 layer cut is a scope decision) and `architecture/` (the L1–L5 model is a generic communication-stack model). I put it in `architecture/` because it defines the model itself; the V1 cut is reflected in `v1-spec.md` and `narrowest-v1-scope.md`. **Decision: architecture/.**
- **`extension-funnel-logic` is borderline** between `product/` (a strategic positioning decision) and `research/` (it's reasoning about validation/funnel). I put it in `research/` because it reasons about wedge/thesis signal flow; it sits next to `wedge-vs-thesis-validation.md` and `validation-experiments.md`. **Decision: research/.**

These three are the only judgment calls I see; I'll defend any of them but I think the default reading is right. None of the other 36 pages have a meaningful tossup.

---

## 3. Recommended option

**Option C.** Reasons, in priority order:

1. **It mirrors vocabulary the spec already uses.** Every other option teaches the reader new words; this one reinforces L1 / substrate / L3+L5, which are the words `system-architecture.md` and `interface-layers.md` already use. That makes the strategist's job mechanical: "this item shipped, page goes here" maps to spec layers without judgment.
2. **It absorbs known growth without re-restructuring.** `capture/per-app/` scales from 1 page (Cursor) to 5 (full V1 bundle) to 8+ (V1.5+ adapters). New capture surfaces add to `capture/` directly. New principles add to `principles/`. New retros add to `operating-model/`. Each Wave 4–6 page has an obvious home.
3. **It eliminates judgment calls.** `concepts/`'s "is this a brand commitment or an interaction pattern?" disappears (both are principles). `entities/`'s "is this substrate or a surface?" gets a clear answer (left edge / middle / right edge). `analyses/`'s "is this a decision or an analysis?" disappears (decisions in product/, analyses in research/).
4. **It handles the lagging-doc commitment in the right place.** Folder ≠ status. A `status: shipped | planned` frontmatter field on every page (rendered in the index) lets the reader scan visibility without folder churn.
5. **It centers the canonical pages.** `system-architecture.md` becomes the lead page in `architecture/`. `interface-layers.md` joins it. They stop being analyses-folder strangers.

**The honest tradeoff:** eight folders is more than four. Two folders cross-reference each other on the architecture diagram (`capture/` and `surfaces/` are both rendered by `architecture/system-architecture.md`). Readers who want to find a single page by guessing the folder will sometimes guess wrong on a borderline case (e.g., `clipboard-and-launch` is in `principles/` but a reader could plausibly look for it in `surfaces/` since the hotkey overlay uses it). The mitigation is the index — `wiki/index.md` is the front door, not the folder tree. As long as the index is regenerated correctly, folder-guessing is a fallback path, not the primary path.

I do not see Option A as wrong, only avoidable; if the founder prefers A's split of retrieval / delivery I will defer, but I think the merge into `surfaces/` is cleaner and reduces the folder count.

---

## 4. Complete file-move table

All 39 pages preserved, none merged, none renamed (filenames stable so wikilinks don't change). Folder destinations only.

### `product/` — strategic "what" (9 pages)

| Current path | New path | Why |
|---|---|---|
| `sources/v1-spec.md` | `product/v1-spec.md` | The locked-scope decision |
| `sources/brand-promise.md` | `product/brand-promise.md` | Mission/positioning decision |
| `sources/bundle-decision.md` | `product/bundle-decision.md` | The 5-tool decision |
| `sources/form-factor-decision.md` | `product/form-factor-decision.md` | The "no destination app" decision |
| `sources/stack-decision.md` | `product/stack-decision.md` | TS/Node + better-sqlite3 + chokidar choice |
| `analyses/narrowest-v1-scope.md` | `product/narrowest-v1-scope.md` | The L1+L3+L5 cut decision (currently mis-shelved as analysis) |
| `analyses/tier-vs-vertical-slice.md` | `product/tier-vs-vertical-slice.md` | Sequencing decision |
| `entities/target-cohort-indie-ai-builders.md` | `product/target-cohort-indie-ai-builders.md` | Cohort decision (not an entity) |
| `analyses/three-cohort-comparison.md` | `product/three-cohort-comparison.md` | The reasoning behind the cohort decision |

### `principles/` — design + brand + scope commitments (8 pages)

| Current path | New path |
|---|---|
| `concepts/felt-not-seen.md` | `principles/felt-not-seen.md` |
| `concepts/ambient-form-factor.md` | `principles/ambient-form-factor.md` |
| `concepts/compose-not-capture.md` | `principles/compose-not-capture.md` |
| `concepts/layer-above-saas.md` | `principles/layer-above-saas.md` |
| `concepts/context-as-moat.md` | `principles/context-as-moat.md` |
| `concepts/clipboard-and-launch.md` | `principles/clipboard-and-launch.md` |
| `concepts/sandboxed-capture.md` | `principles/sandboxed-capture.md` |
| `concepts/drift-prevention.md` | `principles/drift-prevention.md` |

### `architecture/` — the durable middle (8 pages)

| Current path | New path | Why |
|---|---|---|
| `analyses/system-architecture.md` | `architecture/system-architecture.md` | The canonical landing diagram. Promoted out of analyses/. |
| `sources/interface-layers.md` | `architecture/interface-layers.md` | The L1–L5 model itself (the V1 *cut* lives in product/) |
| `sources/capture-allowlist.md` | `architecture/capture-allowlist.md` | The runtime declaration of permitted sources |
| `entities/capture-gate.md` | `architecture/capture-gate.md` | The chokepoint (runtime enforcement of the allowlist) |
| `entities/capture-pipeline.md` | `architecture/capture-pipeline.md` | Gate→storage seam |
| `entities/storage.md` | `architecture/storage.md` | The append-only substrate |
| `entities/local-daemon.md` | `architecture/local-daemon.md` | The host process for the substrate |
| `entities/logger.md` | `architecture/logger.md` | Cross-cutting observability of the substrate |

### `capture/` — L1 capture surfaces (4 pages + per-app subfolder)

| Current path | New path |
|---|---|
| `entities/fs-watcher.md` | `capture/fs-watcher.md` |
| `entities/cursor-extractor.md` | `capture/cursor-extractor.md` |
| `entities/claude-code-extractor.md` | `capture/claude-code-extractor.md` |
| `entities/git-capture.md` | `capture/git-capture.md` |

### `capture/per-app/` — field-level data references (1 page; will grow to 5+ in V1.5)

| Current path | New path | Why |
|---|---|---|
| `sources/cursor-collected-data.md` | `capture/per-app/cursor-collected-data.md` | First per-app reference. `claude-code`, `github`, `slack`, `web-extension` follow as siblings. |

### `surfaces/` — L3 + L5 (5 pages)

| Current path | New path | Why |
|---|---|---|
| `entities/mcp-server.md` | `surfaces/mcp-server.md` | L3-Pull retrieval interface |
| `entities/mcp-search-memories.md` | `surfaces/mcp-search-memories.md` | The MCP tool itself |
| `entities/hotkey-overlay.md` | `surfaces/hotkey-overlay.md` | L3-Push composer |
| `entities/audit-page.md` | `surfaces/audit-page.md` | L5 inspector |
| `entities/browser-extension.md` | `surfaces/browser-extension.md` | Both ingestion (L1) and surface (L3 web-AI). Lives here because users *touch* it; cross-link from `capture/`. |

### `research/` — validation work (3 pages)

| Current path | New path |
|---|---|
| `analyses/wedge-vs-thesis-validation.md` | `research/wedge-vs-thesis-validation.md` |
| `sources/validation-experiments.md` | `research/validation-experiments.md` |
| `sources/extension-funnel-logic.md` | `research/extension-funnel-logic.md` |

### `operating-model/` — process meta (1 page)

| Current path | New path |
|---|---|
| `analyses/wave-1-2-3-retrospective.md` | `operating-model/wave-1-2-3-retrospective.md` |

**Totals:** 9 + 8 + 8 + 4 + 1 + 5 + 3 + 1 = **39 ✓**

No filename changes. No content changes. All wikilinks (`[[mcp-server]]` etc.) continue to resolve because Obsidian uses the filename, not the folder.

---

## 5. Frontmatter changes

### New field on every page: `status:`

Two values used:

- **`shipped`** — the page documents reality that exists in the world (substrate code merged on `main`, decisions locked, research findings logged).
- **`planned`** — the page documents a V1 commitment whose underlying thing is specced but not yet built.

(I considered a third value, `deferred`, for V2+ ideas. No current page is V2+; if/when one appears, the schema will already accept it.)

Per-page assignments:

**`shipped` (37 pages)** — every page except the two listed below.

**`planned` (2 pages):**

- `surfaces/hotkey-overlay.md` — V1 spec status: "Hotkey ❌ — Week 10 work" (per `wiki/sources/v1-spec.md` "Status as of waves 1–3 ship" section).
- `surfaces/audit-page.md` — not yet built; V1 commits to the page existing minimally for trust ([[felt-not-seen]] refinement).

**Note on `surfaces/browser-extension.md`:** I'm marking this `shipped`. The extension itself exists and is in Chrome Web Store review (per the page's own status section). The V1 *upgrade* (wiring it into ECHO's unified store) is later work, but the page documents the artifact-as-it-exists, so the lagging-doc commitment holds.

### Other frontmatter changes (non-status)

Two pages have `topic`/`subtopic` strings worth refreshing post-move; the rest stay as-is. None of these affect linking or rendering — they're just keeping the manifest taxonomy honest.

| Page | Current `topic`/`subtopic` | Proposed change |
|---|---|---|
| `analyses/system-architecture.md` → `architecture/system-architecture.md` | `Architecture` / `System Architecture` | unchanged — already correct |
| `concepts/clipboard-and-launch.md` → `principles/clipboard-and-launch.md` | `Form Factor` / `Hotkey Overlay` | unchanged — describes the pattern, location is now consistent |

(I intentionally avoid sweeping topic/subtopic edits in the move commit. Move-only diff.)

### Frontmatter examples

For a shipped substrate page:

```yaml
---
status: shipped
topic: Architecture
subtopic: Storage
aliases:
  - Capture Gate
  - Gate
---
```

For a planned page:

```yaml
---
status: planned
topic: Form Factor
subtopic: Hotkey Overlay
aliases:
  - Hotkey Overlay
  - Hotkey Composer
---
```

The manifest's `_taxonomy` block stays unchanged. Only `_folders` and `_consolidation` need updating to reflect the new layout.

---

## 6. Migration plan

### Strict scope of the migration commit

- All file moves (39 `git mv`).
- `wiki/.manifest.json` rewritten with new paths.
- `wiki/.manifest-schema.json` `_folders` block + `_consolidation` description updated.
- `wiki/index.md` regenerated.
- Surgical link fixes outside `wiki/` (see Section 7 ask below).
- No body content rewrites in any wiki page. Frontmatter additions (`status:` field) only.

### Numbered checklist

1. **Branch.** `git checkout -b wiki-restructure-waves-4plus` from current `main`.
2. **Move files.** Apply the 39 `git mv` operations from the table in Section 4. `git mv` preserves history.
3. **Add `status:` frontmatter** to all 39 pages (37 `shipped`, 2 `planned`). Single-line addition, no other body changes.
4. **Rewrite `wiki/.manifest.json`.** Update each entry's key from `concepts/foo.md` → `principles/foo.md` (etc.) and add `status` field to each entry. Bump `_meta.version` to `wave-3-shipped-restructured` and `_meta.generated` to `2026-05-XX`.
5. **Update `wiki/.manifest-schema.json`.**
   - Replace the `_folders` block with the 8 new folder descriptions.
   - Add `status` to `_entry_template` and document allowed values in `_rules`.
   - Update `_consolidation.index.md` description to match the new layout.
6. **Regenerate `wiki/index.md`.** The new layout has 8 sections (one per folder) plus a top "Status" line ("39 pages: 37 shipped · 2 planned"). I recommend writing a tiny generator at `tools/wiki_index.py` that reads the manifest and emits the index — see Section 7 sub-ask. Alternative: keep hand-edited and update the header to be honest (drop the "Auto-generated; do not edit by hand" line).
7. **Fix folder-prefixed markdown links** in tracked files outside `wiki/`:
   - `docs/NORTH_STAR.md` lines 82–85 (4 links).
   - `docs/STATUS.md` line 110 (1 link).
   - These are explicit `[text](./wiki/sources/foo.md)` links that will 404 after the rename. **Surgical link-target updates only**, no other docs/ changes. (Section 7 asks for explicit founder approval on this exception.)
8. **Optional same-commit clean-up of descriptive prose** referencing old folder names (text mentions, not links — they don't break, but they instruct agents to look in folders that no longer exist):
   - `docs/AGENT_INSTRUCTIONS.md` lines 19, 20, 22.
   - `docs/README.md` line 67.
   - `claude.md` lines 18, 28, 33.
   - `backlog/README.md` lines 301–302.
   - `.claude/commands/process-backlog.md` lines 13–14.
   - `.claude/commands/process-backlog-batch.md` lines 15–16.
   - `raw/internal/agent-runs/README.md` line 100.
   - `raw/internal/extension/README.md` line 14.
   - `raw/internal/decisions/README.md` line 88.
   - `raw/internal/v1-spec/README.md` lines 14–15.
   - `raw/internal/interviews/README.md` line 57.
   These can ship in the same commit, a follow-up commit, or be skipped in favor of a "first hit fixes it" approach. Founder picks. **My recommendation: same commit.** Otherwise an agent reads AGENT_INSTRUCTIONS.md tomorrow and gets told to look in folders that don't exist.
9. **Validate.** Run these and report the output:
   ```bash
   # Page count consistency
   python3 -c "import json; m=json.load(open('wiki/.manifest.json')); print(sum(1 for k in m if not k.startswith('_') and k != '\$schema'))"
   find wiki -name '*.md' ! -name 'index.md' | wc -l
   # Both should print 39.

   # Wikilink resolution: every [[link]] should resolve to a wiki/*/<link>.md file
   # (except the two intentional cross-project / forward references)
   grep -roh '\[\[[a-z0-9-]*[]|]' wiki --include='*.md' | sed 's/\[\[//;s/[]|]//g' | sort -u
   # Compare against:
   find wiki -name '*.md' ! -name 'index.md' -exec basename {} .md \; | sort -u
   # Expected unresolved: append-only-ledger (cross-project to AIE wiki),
   #                     ride-along-capture (forward reference, future principle).

   # No remaining folder-prefixed wiki paths in wiki/
   grep -rEn 'wiki/(concepts|sources|entities|analyses)/' wiki/ || echo "OK: no stale paths inside wiki/"
   ```
10. **Commit.** Message: `wiki: restructure for scale (waves 4+)`. Body: 2–3 paragraphs explaining the new shape + link to this proposal doc.
11. **Push.** Single push to `origin/wiki-restructure-waves-4plus` (or directly to `main` if the founder prefers — solo project, no PR review needed).
12. **Report back to founder** with the validation step output and a one-paragraph navigation guide for the new structure.

### Risk surface

- **Cross-project wikilinks** (`[[append-only-ledger]]` to AIE wiki, `[[ride-along-capture]]` forward reference) — verified expected unresolved; documented in Section 6 step 9 expected output. No action.
- **Backlog `complete/` items** (Wave 1–3 specs) reference old wiki paths in their bodies as historical record. **Do not modify.** They're frozen artifacts of what was specced at the time; rewriting them rewrites history. The wiki paths in them won't render as broken links because Obsidian resolves wikilinks by filename. The descriptive text mentions are forensic record.
- **`raw/internal/handoffs/2026-05-01-wiki-restructure.md`** — the handoff that triggered this work — references old paths. Out of scope. The handoff is a frozen artifact too.
- **`backlog/_followups.md`** — does not reference wiki paths. No change.
- **The two cross-project `[[/Users/zhenye/Desktop/yc/yc-wiki/...]]` wikilinks** in `wiki/concepts/context-as-moat.md`, `wiki/sources/brand-promise.md`, `wiki/sources/validation-experiments.md` — these point outside the project and remain valid post-move (the file moves, the absolute target doesn't).

---

## 7. The one explicit ask + two sub-asks

### Main ask: "fix broken markdown links outside wiki/" exception

The handoff says **"Do not touch `docs/`, `backlog/`, `raw/`, or `src/` as part of this work — they're out of scope."** I read that as "don't restructure those." But the strict reading conflicts with another constraint: 5 markdown links in `docs/NORTH_STAR.md` and `docs/STATUS.md` are explicit `[text](./wiki/sources/v1-spec.md)`-style hyperlinks that will produce 404s after the rename. Both rules cannot hold under a folder rename.

Three principled options:

- **A: Update those 5 links surgically as part of the migration commit.** Justification: "fix broken links" is not "restructure docs." Net diff: 5 line-edits across 2 files, each a path substitution.
- **B: Defer the 5 link fixes to a follow-up commit.** Justification: tighter "no docs/ in this commit" reading. Net cost: between the two commits, the founder's daily NORTH_STAR.md read is broken.
- **C: Don't move the 5 linked-to wiki pages** (`v1-spec.md`, `bundle-decision.md`, `form-factor-decision.md`, `narrowest-v1-scope.md`). Net cost: the restructure becomes a different shape (those four are central pages); `product/` becomes substantially less coherent.

**My recommendation: A.** Smallest blast radius, smallest amount of time anything is broken.

### Sub-ask 1: optional cleanup of descriptive prose (Section 6 step 8)

Same commit, follow-up commit, or skip? My recommendation: same commit. Otherwise AGENT_INSTRUCTIONS.md tomorrow is documenting folders that don't exist.

### Sub-ask 2: index generator script

Two paths:

- Build `tools/wiki_index.py` (~50 LOC) that reads `wiki/.manifest.json` and emits `wiki/index.md`. Header stays "Auto-generated; do not edit by hand" honestly.
- Keep `wiki/index.md` hand-edited; remove the "auto-generated" header.

My recommendation: **build the generator.** With 39 → eventually ~100 pages and 8 folders, manual index drift is inevitable. A tiny script removes a future class of bug. I'd write it as Python (matches `tools/blocked.py`), no new dependencies, idempotent.

If founder declines, I'll keep the index hand-edited and update the header.

---

## 8. Future moves (intentionally deferred)

These are clean restructures that don't fit today but are predictable Wave 4–6 evolutions. I'm calling them out so you know what's intentionally out of scope of this commit.

1. **Split `product/` into `product/strategy/` + `product/research/`** when it crosses ~15 pages. Today it's 9; will likely be 12 by end of V1, 18 by V1.5. The cohort/three-cohort pages would migrate to `product/research/cohort/`, the spec/scope decisions would stay in `product/strategy/`. Trigger: when the folder ToC starts feeling heterogeneous.

2. **Rename per-app files to drop the `-collected-data` suffix.** Today: `cursor-collected-data.md`. Tomorrow (with sibling `claude-code-collected-data.md`, `github-collected-data.md`, etc.) the suffix becomes redundant — the folder name `per-app/` already says "data collection." Future-clean: `per-app/cursor.md`, `per-app/github.md`. **Filename change requires updating every wikilink that names them**, so this is its own commit, deliberately deferred. Hold today; revisit when the second per-app page is being authored.

3. **Add `surfaces/v1-funnel/` or `surfaces/extension/`** subfolder if the browser extension grows multiple sub-pages (privacy disclosures, capture-categories doc, freemium-tier doc). Today `browser-extension.md` is one page; doesn't merit a subfolder yet.

4. **Add a `concepts/` *back* (under a new name like `vocabulary/`) if cross-cutting design vocabulary emerges** that doesn't fit principles or research. Today, none does. The current 8 "concept" pages are all principles. Resist adding concepts/ back until there's a real reason.

5. **Promote a `_status_` summary block in the index** that reads from frontmatter and shows shipped/planned counts per folder. Cosmetic; can ride on top of the generator script. Defer until there are >5 planned pages worth grouping.

6. **Add `operating-model/spec-template.md` and `operating-model/drift-prevention-runbook.md`** — distinct from the principle page. The principle is "what we believe"; the runbook is "how we audit weekly." Today they're conflated in `drift-prevention.md`. Splitting would require strategist content work, not just a move. Out of scope for migration. Worth raising for Wave 4 spec template fixes.

7. **`per-app/cursor-data-empirical-coverage.md`** as a distinct page from `per-app/cursor-collected-data.md` once the empirical coverage section grows past one table (currently embedded in the page; will likely warrant its own surface when extension and Slack get their own coverage probes). Defer.

These seven are signposted, not promised. Each is its own future commit when the conditions are met.

---

## 9. What I'm asking the founder to do

1. **Read sections 1–3** and confirm or push back on the diagnosis + Option C recommendation. If you prefer Option A's `retrieval/` + `delivery/` split, say so and I'll switch.
2. **Approve, modify, or reject the file-move table in section 4.** If a single page should land somewhere else, name it and where.
3. **Decide the four explicit asks:**
   - Section 7 Main: **A**, **B**, or **C** for the docs/ link-fix tension. (My pick: A.)
   - Section 7 Sub-ask 1: include descriptive-prose cleanup (Section 6 step 8) in the migration commit, in a follow-up, or skip. (My pick: same commit.)
   - Section 7 Sub-ask 2: build `tools/wiki_index.py`, or keep hand-edited and remove the "auto-generated" header. (My pick: build the generator.)
   - Section 5: confirm `status: shipped | planned` (only two values) is right; or add `deferred` now even though no page uses it.
4. **Tell me to proceed**, or send revisions.

I will not move any files until you explicitly say "proceed" or its equivalent.

---

## Appendix A — Folder-level page counts (recommended structure)

| Folder | Page count | Growth axis |
|---|---:|---|
| `product/` | 9 | strategic decisions; +3–6 by V1.5 |
| `principles/` | 8 | active commitments; +1–2 per wave |
| `architecture/` | 8 | substrate; +1–3 as new substrate components ship |
| `capture/` | 4 | per-source surfaces; +3–5 as bundle expands |
| `capture/per-app/` | 1 | field-level refs; +4 in V1, +N in V1.5 |
| `surfaces/` | 5 | user/AI-facing surfaces; +2–4 V2 |
| `research/` | 3 | validation work; +5–10 as interviews/concierge experiments accumulate |
| `operating-model/` | 1 | wave retros; +1 per wave |

Projected size at end of V1: ~52 pages. End of V1.5: ~75. End of V2.0: ~100. The structure absorbs that growth without re-restructuring.

## Appendix B — Five known broken-link targets after rename

For Section 7 Main ask reference. Exact diffs would be:

```diff
# docs/NORTH_STAR.md (4 lines)
-- [V1 Spec (Locked)](./wiki/sources/v1-spec.md)
-- [Bundle Decision](./wiki/sources/bundle-decision.md)
-- [Form Factor Decision](./wiki/sources/form-factor-decision.md)
-- [Narrowest V1 Scope](./wiki/analyses/narrowest-v1-scope.md)
++ [V1 Spec (Locked)](./wiki/product/v1-spec.md)
++ [Bundle Decision](./wiki/product/bundle-decision.md)
++ [Form Factor Decision](./wiki/product/form-factor-decision.md)
++ [Narrowest V1 Scope](./wiki/product/narrowest-v1-scope.md)

# docs/STATUS.md (1 line, line 110)
-## Week-by-Week Sequencing (per [V1 Spec](./wiki/sources/v1-spec.md))
+## Week-by-Week Sequencing (per [V1 Spec](./wiki/product/v1-spec.md))
```

End of proposal.
