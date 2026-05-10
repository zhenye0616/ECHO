# 2026-05-10 — Coordination layer: defer pending 030 ship + live test

**Status:** Decision recorded 2026-05-10 ~01:00 PDT during strategist conversation (Claude Code session `71b36548-cf1d-4fe5-9370-b0317f9c4ac0`). **Decision: hold the coordination layer; revisit only after item 030 (`backlog/ready/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md`) ships and gets ~1–2 weeks of live dogfooding.** This note is the durable archive of the conversation that produced the decision; it captures (a) the substrate state today, (b) the design space surveyed, (c) the founder's reframes that narrowed scope, (d) the journal-race-condition data that re-opened the question, and (e) the trigger conditions that would reopen the conversation post-030.

**Why this lives in `raw/internal/decisions/` and not in `backlog/`:** the decision is "do nothing now"; there's no actionable build item until 030 lands. Per CLAUDE.md operating model, deferred reasoning of this shape archives here; an actionable item gets filed at the trigger point.

**Cross-reference:** `backlog/_followups.md` "Coordination layer — held pending 030 live test" pointer entry, added in the same commit as this note.

## TL;DR

ECHO has solved concurrency for its own substrate (append-only + WAL + atomic-claim) and for code work (worktrees). It has NOT solved cross-artifact-type, multi-agent coordination — which is the natural next substrate layer. Today's strategist brainstorm surveyed the design space (3 approaches × industry pattern fit) and the founder narrowed scope to: defer the general coordination layer; ship group session A first (item 030); revisit coordination only when (i) group session is solved AND (ii) the founder can be "completely out of the loop most of the time." The journal-write race condition (5 instances today) re-opened the question by demonstrating the deferred problem is biting *now*, not just future-state — but the founder's call held: ship 030, dogfood for ~1–2 weeks, then decide.

## Conversation history (chronological synthesis)

### Phase 1 — Friction inventory + V1.6 path

- Founder reframed the demo work this morning: "I want to organically experience these moments as a customer for my own product." → demo follows felt experience, not the other way around.
- Three friction points named (founder, 2026-05-09 afternoon):
  1. `tail_session` requires manual reactivation; founder wants linked sessions that tail each other.
  2. Resume-from-where-we-left-off is usable from user POV (settled — no further work).
  3. Version control + artifact state needs deterministic handling, generalized beyond git/codebase. Founder: "currently I have to worry if diff agent will collide with each other and whether the context will change mid task."
- Founder elaborated on (3): "I have been very careful with artifact state and that hindered my speed. I am retraining myself to scale up the agent team because of this issue but currently I haven't encountered anything serious. I want user to have the ability to just not worry about artifact state at all. We should design a robust system for that."

### Phase 2 — Design space surveyed

**Today's concurrency landscape in ECHO (verified against `wiki/architecture/storage.md`, `wiki/architecture/system-architecture.md`, `backlog/README.md`):**

| Surface | Mechanism | Reference |
|---|---|---|
| Storage layer | SQLite WAL mode → concurrent reads during writes; **append-only interface** (no update/delete/replace, only append+query+count) → "no reconciliation, no concurrent-update semantics" | `wiki/architecture/storage.md:66, 95`; `system-architecture.md:132` |
| Single store | One `echo.db` file → no cross-store federation → "no race conditions across stores" | `system-architecture.md:168` |
| MCP transport | Stateless per request; no shared session state across calls | item 027 (`backlog/complete/2026-05-08-027-mcp-stateless-transport.md`) |
| Daemon process | PID lock at boot → exactly one daemon at a time | `system-architecture.md:179` |
| Backlog item claiming | Atomic via git: single commit moves `ready/ → claimed/` + sets frontmatter; push rejection on non-fast-forward → loser knows immediately, retries | `backlog/README.md:64–83, 136, 210` |
| Code work | Per-agent git worktree at `~/Desktop/Project_echo--<slug>/` on `agent/<slug>` branch → branch-and-merge isolation; merge is a checkpoint | CLAUDE.md operating model; `backlog/README.md:208–210, 345` |
| File edits | OS-level `mtime` check + Read-before-Edit invariant in tooling. **Not ECHO-level.** | tool behavior, not in wiki |

**Gap analysis — what today does NOT cover:**
- ❌ Artifact-level locking for non-code artifacts
- ❌ Version stamps / watermarks on artifact reads → no way to detect "stale read"
- ❌ Pub-sub / push notifications when an artifact mutates → consumers must poll/refresh
- ❌ Cross-session subscription → each agent is its own context window
- ❌ Mutation log for write-side MCP tools (because there are no write-side MCP tools yet)
- ❌ Multi-agent awareness primitive — founder mentally models parallelism

**Industry patterns surveyed:**

| Category | Mechanism | Where used | ECHO fit |
|---|---|---|---|
| Optimistic Concurrency Control (OCC) | Version stamps; reads tag the version; writes "if-match this version"; mismatch → 412 | HTTP ETags (S3, GitHub API), MVCC in PostgreSQL/InnoDB, DynamoDB conditional writes | **Strong fit.** Lightweight, generalizes to any artifact, compatible with append-only substrate. |
| Event sourcing + projections | Never mutate; append change events; derive state by replay; conflicts = "two events, conflicting intent" | EventStore, Kafka + KStreams, banking ledgers, Datomic | **Strong fit by accident.** ECHO is already half here — capture path is event-sourced. Extending to mutations is natural. |
| CRDTs | Operations designed to commute; eventual consistency without coordination | Figma (object-level), Linear, Y.js, Automerge, Riak | **Partial fit.** Beautiful for collaborative docs but bespoke per artifact type. Reach for it only if Notion-style co-editing becomes load-bearing. |
| Branch-and-merge | Long-lived isolation; explicit merge step; conflicts via structural diff | git, hg, Perforce; Aider auto-commits-per-edit; Plandex AI-edit-as-PR | **Already in use** for code. Don't replace; complement. Doesn't generalize to mutable external services. |
| Lease-based / actor model | Single owner per resource; explicit acquire/release with TTL | ZooKeeper locks, Redis SETNX + expire, Erlang/Akka actors, Orleans | **Opt-in fit.** Right primitive for "I'm doing something irreversible — block others." Wrong as a default. |

**AI-agent-specific prior art (recent):**
- **Aider** — every AI edit is a git commit → trivial revert. Closest spiritual match: "make collisions cheap to handle, not expensive to prevent."
- **Cursor checkpoint** — file snapshot before agent edits; reactive not preventive.
- **LangGraph state checkpoints** — programmatic git-commits-at-agent-step.
- **Claude Code worktrees** — what ECHO already uses.
- **AutoGen / CrewAI shared memory** — global state, tends toward serialization (single agent at a time touches shared state). Bad pattern for "scale up the agent team."
- **Anthropic Computer Use sandboxes** — VM-level isolation per task. Works because tasks are short and side-effect-free at boundaries.
- **Notion's block-level collaboration** — block as the CRDT unit; deterministic merge function. Heavy implementation, beautiful UX.

### Phase 3 — Three candidate approaches + robustness ladder

Strategist proposed three approaches matched to the design space:

**Approach 1 — Mutation log + read-version watermarks (passive, optimistic).**
Every artifact mutation becomes a CaptureEvent (already true for files via fs-watcher; extend to write-side MCP tools — Slack, Airtable, Notion, etc.). Every read tags the agent's session with a version watermark. When the agent writes, ECHO compares write-time version vs read-time watermark. If mismatch, the write becomes a *proposed* change that gets auto-rebased OR flagged. Default mode — invisible until conflict.
- ✅ Generalizes to any artifact ECHO captures
- ✅ Builds directly on append-only-ledger substrate
- ✅ Zero added cognitive load when no collision
- ⚠️ Auto-rebase semantics need per-artifact-type rules (code = 3-way merge; structured docs = field-level; chat messages = append-only; binary = abort)

**Approach 2 — Per-task workspace isolation, generalized beyond git.**
Every agent task spawns isolated workspace for *all* touched artifacts: git worktree for code; copy-on-write directory snapshot for files-not-in-repo; read-only views with queued-mutations-on-commit for external services. On task completion, diff workspace vs current main state, auto-merge or flag.
- ✅ Reuses the worktree pattern already operated by
- ✅ Strong isolation guarantee
- ⚠️ Hard to generalize to mutable external services (Slack message — what does "snapshot" even mean?)
- ⚠️ Big-bang merge at end can produce late conflicts (anxiety just shifts to commit time)

**Approach 3 — Lease-based attention coordinator (active, opt-in).**
New MCP tool: `claim_artifact(uri, ttl)` returns a lease token. Other agents see "leased by X until T+ttl"; can wait, work elsewhere, or proceed with warning. Auto-expire on heartbeat fail.
- ✅ Lightest weight; substrate invisible until agents opt-in
- ✅ Explicit critical-section semantics
- ⚠️ Stalls parallelism when leases stack
- ⚠️ Fragile lease-tuning (TTL too short = thrash; too long = orphaned locks)

**Strategist's recommendation:** Approach 1 as the default + Approach 3 as an opt-in escalation for critical sections. Code stays on git-worktrees per current operation. The three layers form a "robustness ladder" — most workflows just need Approach 1; high-stakes workflows opt up.

### Phase 4 — Founder reframes (this is where scope narrowed)

Three founder reframes during the brainstorm reshaped the strategic frame:

1. **"1:n instead of multiple 1:1"** — current brand promise ("we make every AI smarter about you") is 1:1 framing (ECHO ↔ each AI). The reframe: ECHO turns N parallel agents into a coordinated *team* via shared substrate, instead of a fan-out where the founder is the bottleneck routing context between them. **Stronger claim than "AI knows about you" — it's "your AI agents work as a team, not as separate tools you have to manage."** Worth holding for the demo opening line; conceptually load-bearing for V1.6+ direction.

2. **"Self-throttling, not actual collision"** — founder explicitly: "I have been very careful with artifact state and that hindered my speed... I haven't encountered anything serious." The felt friction is **preemptive worry**, not collision-recovery. The fix shape is "let the user stop worrying," not "detect-and-recover-from-collisions."

3. **"Demo follows felt experience"** — founder pulled the conversation back from "design a robust coordination substrate" with: *"I don't want to drift too far from our original goal. Goal is to close L1 and L2 gap and experience the magic moment first hand."* The coordination layer was scope creep relative to the actual goal (close L1/L2 friction → felt magic moment → demo).

4. **The deferral rule** (founder, late afternoon): *"we can revisit the coordination layer when we fully solve the group session and i can be completely out of the loop most of the time."* Two preconditions:
   - Group session A solved (item 030 — synchronized human-driven multi-agent group)
   - Founder out of the loop most of the time (V2-territory; not V1.6)

**This is the deferral-rule the strategist held to until late evening.**

### Phase 5 — Journal-race-condition data re-opened the question

Late evening (~00:30 PDT 2026-05-10), the dogfooding journal entry capturing the cross-tool spec review pattern was lost twice during write — once silently overwritten by a parallel agent (commit `25e7a11` shipped `.html` only with `1 file changed, 16 insertions, 284 deletions` — the `.md` change vanished), once rejected by the Edit tool's mtime guard. **Cumulative count today: 5 demonstrated instances of the journal-write race-condition class.**

The two failure modes (formal):

**Failure mode A — Silent overwrite (Edit succeeds, change vanishes):**
```
T0: Agent A reads file        (state X)
T1: Agent B reads file        (state X)
T2: Agent A Edit → state X+A  (success — A's content on disk)
T3: Agent B Write → state X+B (A's content silently overwritten;
                                B used Write or fs-direct, no mtime check)
T4: Agent A git add → file on disk is state X+B (not X+A)
T5: Agent A commit → only .html shows changes
```

**Failure mode B — Edit's mtime guard rejects (safety net firing correctly):**
```
T0: Agent A reads file        (state X, records mtime_X)
T1: Agent B Write → state X+B (mtime advances)
T2: Agent A Edit → REJECTED   (Edit checks mtime; refuses)
```

**The asymmetry is the load-bearing observation:** Edit's mtime guard protects against case B (you're about to overwrite someone), but does NOT protect against case A (someone overwrites you AFTER your Edit succeeded). Once you've persisted, the protection is over. **Mode A is undetectable to the agent that gets overwritten** — Edit returned "success," yet the change vanishes. This is silent data loss, the worst class of bug.

The asymmetry holds because `Edit` checks mtime but `Write`, shell writes (`echo > file`), and direct fs-API writes all bypass the check. As long as one agent uses Edit and another uses anything else, the asymmetric failure exists.

**Why the journal specifically:**
1. Multi-writer by design (CLAUDE.md mandates every agent logs there).
2. In-the-moment discipline (no batching, writes during active work).
3. Single canonical file (no per-agent shards; everyone writes one path).

These three structural properties concentrate collisions on this one file. Other shared files (code, tests, specs) follow the worktree pattern → one agent per branch → no contention. The journal lives on `main`, written by everyone. **The journal is structurally the most-likely-to-collide file in the project.**

### Phase 6 — Three framings considered + decision

The journal race re-opened the strategic question: **does the evidence un-defer the coordination layer, or just demand a narrow journal-specific fix?** Strategist proposed three framings:

**A. Hold the line.** Coordination layer stays deferred. Journal race is acceptable cost-of-doing-business at current parallelism (3-4 agents); fix it narrowly with per-agent shards (`journal-<agent>-<session>.md` + periodic merger) as a tiny V1.6 item. Doesn't unlock anything broader; just stops the bleeding on this one file.

**B. Promote.** The journal race is the canary. The same silent-overwrite class will hit any other shared file the moment more than one agent touches it (already happened to the spec earlier today — system-reminder caught it). Defer-until-out-of-loop reasoning was wrong because it weighed cognitive load but not silent-loss. Promote the coordination layer to V1.6 alongside group session.

**C. Half-step.** Add a minimal `Storage.append_journal_entry(path, content)` MCP tool that handles the write atomically (server-mediated, single writer), without building the full coordination layer. Generalizes to other shared-write surfaces later as they surface.

**Strategist's lean was C.** Founder's actual call (verbatim, ~01:00 PDT 2026-05-10): *"for now hold till 030 lands and live tested then we can move on to coordination layer. make a detailed note with all we have talked about."*

**Decision: A (the founder-discipline answer) for now, with explicit re-evaluation trigger.** The narrow journal-specific fix is also held — not even ship-the-narrow-fix-now. The reasoning:

- Item 030 is the load-bearing V1.6 ship; splitting attention to a journal-fix would dilute it.
- 5 instances today is significant signal but the data is one day; ~1–2 weeks of live dogfooding (the natural 030 deprecation period) will show whether the rate stabilizes, escalates, or causes semantic damage.
- If the dogfooding period produces meaningful semantic loss (vs the 5 instances today, all of which were caught quickly), the trigger fires.
- If the rate stays at "annoying but recoverable," coordination layer can stay deferred per the original founder rule.

## Trigger conditions to revisit

Reopen the coordination layer conversation when AT LEAST ONE of these fires post-030-merge:

1. **Semantic loss from journal race.** A journal entry is silently lost AND the loss is discovered after the contributing context is gone (i.e., the entry can't be re-recovered from the agent's own session memory). Today's 5 instances were all caught in-session and recovered; if a future instance ships unnoticed, that's the trigger.
2. **Race spreads beyond the journal.** Another shared file (`backlog/_followups.md`, `docs/BACKLOG.md`, a wiki page) is silently overwritten by a parallel agent. Today's spec-write conflict was caught by a system-reminder; if a future one ships unnoticed, that's the trigger.
3. **Group session A (030) lands and the founder feels ready to step out of the loop on routine work.** This was the original deferral-rule precondition. If the founder reaches the "I'm out of the loop most of the time" state, coordination layer becomes load-bearing for that mode (per Approach 1+3 robustness ladder framing).
4. **Cohort dogfooding reveals collision in the bundle.** If a paying customer or beta cohort member hits a multi-agent collision (their two AI clients corrupt each other's work), the trigger fires regardless of internal dogfooding state — that's the V1 reliability bar.
5. **The narrow journal-specific fix is itself non-trivial.** If post-030 we sit down to ship per-agent journal shards + merger and discover the merge logic is non-trivial (semantic conflicts, ordering preservation, dedup), the right move may be to build the general primitive once instead of the narrow fix per-file.

## Open questions for revisit time

When the trigger fires:

- **Has the journal race rate stabilized, escalated, or caused semantic damage?** (Empirical question; data from the 030 dogfooding period.)
- **Did any race surface on a non-journal shared file?** (Generalization question.)
- **Has the founder's parallelism scaled?** (More agents in flight = more contention surface = different cost calculus.)
- **Did Approach 1's auto-rebase rules turn out to be feasible per artifact type, or did the per-type rule explosion kill the design?** (Tractability question — only answerable when forced to actually design the merge functions.)
- **Did `wait_for_new_turns` (item 030) end up needing server state to be useful in practice?** (If yes, the "stateless" purity that motivated Approach 1+3 over actor-model loosens.)

## What stays untouched until the trigger fires

- The `truncations: string[]` field in item 030 stands as the read-time trust mechanism — it's not the same problem space as write-time concurrency, doesn't need the coordination layer to ship.
- The journal-write discipline in CLAUDE.md stays as written; agents continue to log in-the-moment to the single canonical journal file. The race remains; agents notice + recover.
- `_followups.md` carries a pointer entry to this decision note so the deferral is discoverable from the working-memory queue.
- Strategists adding entries to the journal should chain `verify → pandoc → git add → commit → push` as a single shell command (not separate steps) to minimize the race window — the practice that recovered today's lost entry.

## What this note explicitly does NOT decide

- The shape of the eventual coordination layer (Approach 1 vs 2 vs 3 vs hybrid). The empirical data from the 030 dogfooding period should drive that.
- Whether the eventual coordination layer is V1.6 or V2 territory. Depends on which trigger fires and how severely.
- Whether `wait_for_new_turns` (item 030's group-session primitive) ends up sharing substrate with the eventual coordination layer. Could go either way; design at trigger time.
- Whether the journal stays on a single canonical file or migrates to per-agent shards. The narrow fix is the obvious short-term move but the founder's "hold" decision says even that waits for evidence.

## References

- `backlog/ready/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` — the V1.6 ship that gates this reopening
- `backlog/_followups.md` "Coordination layer — held pending 030 live test" — pointer entry
- `wiki/architecture/storage.md` — append-only substrate (the foundation Approach 1 builds on)
- `wiki/architecture/system-architecture.md` — single-store + WAL + atomic-claim story
- `backlog/README.md` — atomic-claim mechanics for backlog items (the existing coordination model)
- `raw/internal/dogfooding/mcp-interactions-journal.md` — the contested file where 5 race instances landed today; entry at "2026-05-10 — dogfooding day 4" documents each instance
- `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md` — the immediately-prior decision-archive note in this convention
