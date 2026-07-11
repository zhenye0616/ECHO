# Clarity sprint plan — max clarity, repo cleanup/reorg, client-facing prep

**Date:** 2026-07-10 · **Companions:** `2026-07-10-project-echo-orientation-and-closure.md` (founder control view) · `2026-07-11-team-product-graduation-pipeline.md` (maturity/release contract) · `2026-07-10-full-project-map.md` (evidence register)

**Frame.** This sprint adds no product features. It operates under the Part-4 clarity halt (`0ab0af05`), narrowed by the 2026-07-11 founder decision: the Team product and its meeting→brief wedge are the commercial focus, pain/demand are closed, and Machine/Fleet are internal assets. The halt now closes productization questions only. It blocks build specs and product-code changes, not customer outreach, offer design, or onboarding discovery. **The halt has no calendar expiry.** WS3 produces written dispositions, acceptance outlines, and a ranked queue until the founder commits a halt-lift decision at a named SHA. Only then may approved work become `backlog/proposed/` specs.

## Sprint goals

- One truth everywhere: README.md and every agent orientation surface name the Team product as the only commercial focus, meeting→brief as its first wedge, and Machine/Fleet as internal assets rather than parallel products.
- Exposure debt executed, not just mapped: HEAD redactions, separate secret/content scans, filter-repo decision, CI secret gate, and a written committed-content + data-handling policy before any additional client-derived artifact is committed or client material is shared.
- The halt closure register becomes productization-complete: every deployment/onboarding/operation/sales-execution row has a terminal disposition, owner, closure artifact, and queue rank where applicable; demand-only gates are retired.
- The merged wedge and its predecessor founder-regime evidence get their owed documentation: the 124-131 wiki pass plus correction of every current-status page that HEAD code falsifies. The current candidate remains DEV until a versioned package built from a pinned SHA completes an isolated rerun; `shipped` is not used as a synonym for FOUNDER LIVE or CLIENT LIVE.
- Client-facing prep pack separates the installable current CLI-auth/full-daemon contract from the unbuilt API-key/product-daemon target; a post-demo non-author rehearsal validates the current docs.
- The four-stage contract is canonical: DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE. Generic package CI remains diagnostic until a product-only qualification matrix exists.
- G4 makes history/reorg order explicit before any mass move; dependency-aware cleanup then gives the post-halt successor carve stable ground. Cold-db, auth-expiry, and off-founder-machine deployment evidence are recorded with predeclared rubrics.

## Execution contract

This document contains dozens of workstream bullets plus 20 reorg rows. That is a coverage inventory, not a credible promise that one founder completes every line before Jul 24. Work is selected by the gates below. WS1, WS2, the halt closure register, founder decisions, and predeclared empirical checks create clarity. Mass archival and cosmetic path normalization do not lift the halt and must not displace those gates.

### Critical-path gates

| Gate | Required outcome | Accountable role | Blocks |
|---|---|---|---|
| G0 Truth baseline | Founder accepts one commercial hierarchy: Team product first, Machine/Fleet internal, meeting→brief wedge | Strategist + founder | All downstream docs |
| G1 Exposure baseline | Separate secret and semantic-content scans; HEAD remediation; committed-content/data policy; rewrite decision | Founder, with independent rerun | New live-data artifacts and client sharing |
| G2 Clarity halt lift | Every productization row is terminal; no row reopens proven pain/demand; founder commits approval | Founder | New build specs and product work |
| G3 Jul 18 freeze | Immutable demo SHA, tarball checksum, db snapshot, plist/env export, smoke result, rollback artifact, emergency-change owner | Demo operator | Demo-box changes |
| G4 History/reorg maintenance | Holdout closed; rewrite completed or explicitly deferred; conflicting path moves frozen or rebaselined | Repo maintainer | History rewriting and conflicting moves only; unrelated reorg never blocks the carve |
| G5 Qualification | Build-once product-only artifact passes machine qualification; independent review and exact-artifact founder staging pass; checksum-bound founder release authorization completes the matrix and seals the QUALIFIED record | QA operator + independent reviewer + founder | Protected release/tag and client acceptance |
| G6 Client install + acceptance | Exact G5 artifact/checksum installed on the actual client Mac; access/agreement/consent/data recorded; healthy runtime produces a useful brief from a real meeting, repeats the workflow, and has support/recovery/rollback ownership | Founder + client counterpart | CLIENT LIVE status only after the multi-run acceptance record closes; candidate remains QUALIFIED before then |

### Workstream ownership and proof

| WS | DRI | Required artifact | Independent verification |
|---|---|---|---|
| WS1 | Strategist | Orientation truth audit at pinned SHA | Founder approves one canonical scope paragraph |
| WS2 | Founder + security executor | Scan reports, policy, redaction commit, rewrite decision | Second operator reruns scanners and spot-checks content classes |
| WS3 | Strategist | Pre-lift closure register and ranked dispositions; post-lift specs separately | Founder signs G2 before any spec file exists |
| WS4 | Strategist | Item-by-item 124-131 promotion/accounting matrix | Code-aware reviewer checks claims against pinned HEAD |
| WS5 | Docs owner | Current install/runbook/env/data pack; target contract clearly separate | Non-author clean-machine walkthrough after the demo |
| WS6 | QA operator | Predeclared empirical rubrics plus four-stage qualification contract; post-G2 runner/report separately | Independent grader verifies inputs, verdicts, and exact-artifact identity |
| WS7 | Repo maintainer | Consumer-aware move manifest and reference report | Orchestration tests, targeted tool tests, build/pack, and backlink diff |

### Halt-lift contract

The canonical closure rows live in `2026-07-10-project-echo-orientation-and-closure.md`. Before G2, every row must name an owner, closure artifact, and one of three terminal states. `_followups.md` alone is not evidence of closure. Halt lift is recorded in a short `clarity-halt-lift` decision naming the approved main SHA; it authorizes spec conversion but does not declare the product client-ready. The rule was ratified 2026-07-10 by strategist review at founder instruction — with a mechanical row-completeness verification clause (condition 7), a converted-specs-still-go-through-review clause, and register row X5 (confirm-leg shape) added; see the orientation doc for the ratified text.

## Workstreams

### WS1 — Orientation truth pass (operating-model docs update immediately)

- **DONE 2026-07-11:** Rewrite CLAUDE.md around the Team product, meeting→brief wedge, client-machine endpoint, and clarity halt.
- **DONE 2026-07-11:** Rewrite docs/NORTH_STAR.md around three systems / one commercial focus and client install/use/repeat.
- **DONE 2026-07-11:** Replace AGENTS.md's stale friction-first product gate with the Team-product carve gate.
- **DONE 2026-07-11:** Correct README.md as the public front door and fix the hardcoded tarball filename.
- **DONE 2026-07-11:** Banner wiki/product/v1-spec.md as retired direction and replace it in docs/AGENT_INSTRUCTIONS.md mandatory reads.
- Write a dated amendment to raw/internal/decisions/2026-07-03-yc-demo-sprint-plan.md resolving demo scenes 2-3 post-Justinian (Mattermost, mock Slack, or cut) and mark 2026-07-07-slack-enablement-two-stage-plan.md superseded/deferred.
- Correct trap-map line 82's false '(already queued)' claim to 'named, not yet specced'; assign the stale Claude private-memory CI-split record to its external owner/path rather than treating untracked `MEMORY.md` as canonical evidence.
- Annotate 2026-07-09-decision-loop-canonical-model.md with per-stage 'proven under conditions X' qualifiers (responder-up dependency, Justinian-only Linear validation, no-synthesis responder).
- Define one exact wiki lifecycle vocabulary before the promotion pass: `shipped | planned | deferred | retired`, with `deferred` for unbuilt inactive commitments and `retired` for formerly current/shipped surfaces; update CLAUDE.md, .manifest-schema.json, and index behavior together.

**Exit criteria:** A fresh agent session gets one answer: productize and sell the Team product, starting with meeting→brief on the client machine; Machine/Fleet do not compete for roadmap priority. A preserved truth audit lists residual historical claims.

### WS2 — Exposure and privacy execution (gates lab contact)

- Run gitleaks/trufflehog over all reachable history (all branches/blobs, 2026-04-30→present) and record the exact command/config/results in a decision doc — this is the secret scan owed since 2026-06-06.
- Run a separate semantic-content inventory over the tracked tree and reachable history for names, quotes, note IDs, meeting titles, employer/client material, and large raw captures. Secret scanners do not detect the repo's primary exposure class.
- Redact at HEAD from the enumerated lists: the quoted live prod brief row in 2026-07-10-brief-path-stress-test.md, real third-party names in tests/enrich/post-meeting-brief.test.ts (lines 45/60), the advisor meeting title + Granola note ID in 2026-07-09-first-advisor-loop-cycle.md, and the employer-workspace Slack quotes doc.
- Hold one founder decision session: execute-or-defer the filter-repo history rewrite (lead list, coworker notes at ab95c519, 560K dump at 1ba3580a, pitch drafts at 7bc368b5). If executing, wait until the holdout-131 retest is preserved and its worktree/branch are closed; then stop all writers, snapshot, rewrite, fresh-clone, rescan, and re-pin before any reorg move log is created.
- Add a gitleaks (or equivalent) CI job + a pre-push secret hook; verify GitHub push protection is enabled and audit release.yml-uploaded tarball artifacts + repo security settings via gh api.
- Write the one-page committed-content policy: allowed/forbidden content classes for the public tree, journal Returned/Sources redaction rule, client-participant naming rules, and a PII/recording-consent class added to the trap map.
- Write the lab data-handling/retention one-pager: what is stored where, append-only/no-delete/unbounded-growth disclosure, custody (founder accounts in lab workspaces per B3), the two egress endpoints, MCP :38478 exposure, deletion story honesty.
- Create the tracking artifact distinguishing the three jobs so 'we scanned' stops meaning the wrong thing: June db token scan (done) vs git-history secret scan vs filter-repo content rewrite.
- Include backlog/reviews/ and raw/internal/agent-runs/ in the semantic-content inventory, but do not limit the scan to those directories; file findings by content class rather than fixing inline.

**Exit criteria:** Secret and semantic-content scans have reproducible reports; all enumerated HEAD redactions are merged; CI secret gate is green on a test commit; policy + data-handling docs are committed; filter-repo is executed in the safe order or explicitly deferred with residual exposure stated. The repo is already public, so none of this can revoke prior clones/forks/caches; the gate prevents additional live-data exposure and governs client-material sharing.

### WS3 — Backlog conversion: register → claimable items + system integrity

> **Halt gate:** pre-lift WS3 produces the companion halt closure register plus ranked dispositions and acceptance outlines. Post-lift conversion starts only after the committed founder decision named in G2. New actionable specs go to `backlog/proposed/`, never to inbox as a way around the gate.

> **Outline boundary:** a pre-lift acceptance outline may contain only the required outcome, evidence, unresolved decision, owner, dependencies, and queue rank. It must not contain files-to-modify, implementation design, acceptance criteria, test contracts, task-state pointers, or any backlog artifact. Those belong to post-G2 spec review.

- Run the contracted strategist disposition sweep over the ~20 post-07-07 followup bullets (post-lift spec / fold / drop / accepted-risk / deferred-with-trigger); add a client/dev tag convention to _followups.md's preamble and extract a client-readiness index section.
- Pre-lift, write ranked acceptance outlines for: the graduation foundation (product composition root/fence, runtime isolation, `tests/product/`, build-once matrix record); signals first-run cutoff + newest-first ordering; ANTHROPIC_API_KEY product brain binding; echoctl brief --wait + target-miss diagnostics; product daemon launchd unit + tarball deploy story; fail-loud config health surfaced in doctor/heartbeat; calendar-trigger guard inventory; and one 130-hardening bundle. Post-lift, convert only founder-approved outlines into `backlog/proposed/` specs, with the graduation foundation first.
- Purge the leaked test-fixture ChangesetDraft from ~/.echo/state/decision-changeset-drafts.json and disposition the 6 stuck pending drafts in team-decision-drafts.json (confirm via responder or expire). Pre-lift, record and rank the offending-test fix; create its proposed item only after G2.
- Delete the 081 inbox zombie with a one-line commit citing complete/081 (9bf44cea) as authoritative.
- Document inbox/ (parked, non-kanban, manual promotion gate), archive/, reviews/, and task-state/ in backlog/README.md.
- Add an Inbox section to tools/backlog_index.py and regenerate the stale docs/BACKLOG.md (currently missing 124-131).
- Rank and outline the dispatch-next-round.py inbox-blindness fix (thread artifact_path to request.py, per _followups.md:516); file it as a proposed item only post-lift.
- Fix the time-fused candidates.test.ts:234 fixture (injectable clock) before it goes vacuous ~Jul 30.
- Batch-disposition the low-priority grab-bag (wait_for_new_turns, get_atoms budget-drop, get_recent_work_context removal, 129 deadline_missed verification) in the same sweep — none gets individual sprint time.

**Pre-lift exit:** Every halt-register row has a terminal closure state; every post-07-07 followup is dispositioned and ranked; the client/dev axis and client-readiness index exist; docs/BACKLOG.md reflects the documented topology; the prod draft store contains no fixture pollution; `backlog/proposed/` remains empty unless G2 has landed.

**Post-lift exit:** Approved acceptance outlines have been converted into `backlog/proposed/` specs with explicit Out-of-Scope sections and fresh references; unapproved/deferred work remains out of the kanban pipeline.

### WS4 — Wiki promotion pass + shipped-page drift correction (Jul 18-24 window)

- Build an item-by-item promotion matrix for every After Completion block in 124-131 before editing: 124 loop-observability truth, 125 trace-card, 126 merge-prompt flake record, 127 packaging/Windows evidence, 128 intake cutoff, 129 coord/deadline semantics, 130 changeset compiler, and 131 post-meeting brief. A final manifest diff is not a substitute for this checklist.
- Run the owed 124-131 promotion pass: create wiki/surfaces/post-meeting-brief.md (including the brain-CLI prerequisite, --dangerously-skip-permissions posture, and the retrieval-less v0 truth per resolved A1), wiki/surfaces/decision-changeset-compiler.md, and a wiki/capture/ page for the Granola poller + intake path (including the content-freeze-at-first-ingest semantic).
- Correct wiki/architecture/local-daemon.md: regenerate the boot-subsystem list from src/daemon/index.ts and delete the false 'does no polling' claim.
- Correct wiki/architecture/capture-allowlist.md: six categories, apis=['granola'], the derived category and its writer-site enforcement.
- Rewrite wiki/architecture/capture-gate.md + wiki/principles/sandboxed-capture.md to the two-tier reality: gate-enforced for external captures, writer-site-policed for derived:/coord: atoms — a security claim the lab will read.
- Add the enrich/brain/stations-1-4 layer to wiki/architecture/system-architecture.md (the anchor page other corrections hang off).
- Regenerate wiki/surfaces/mcp-server.md's tool table from src/mcp/server.ts registrations; sync wiki/architecture/storage.md's contract snippet with src/storage/interface.ts.
- Resolve the browser-extension.md vs local-daemon.md contradiction; apply the WS1 lifecycle vocabulary consistently; point to tools/echo-overlay's current location and require WS7 to update that reference in the same commit if the app later moves.
- Update .manifest.json and regenerate wiki/index.md via tools/wiki_index.py; diff every complete/ item's After-Completion section against the manifest as the closing check.

**Exit criteria:** The 124-131 promotion matrix has one closure row per After Completion request; a code-aware reviewer checks every changed capability claim against the pinned SHA; preserved greps for the known false claims return zero; the poller→signals→brief deliverable has wiki coverage; schema, manifest, and index regenerate cleanly.

### WS5 — Client-prep documentation pack (write-down-X only, no code)

- Write the client-box runbook from trap-map section 10, item by item, each marked 'automated | documented workaround'; include verbatim the plist-wipe-on-reinstall trap and the bootout+bootstrap (not kickstart -k) env-reload rule.
- Write two explicitly separate install contracts. **Current pre-carve contract:** node + tarball + GRANOLA_API_KEY + an installed/authenticated Codex or Claude CLI + launchd; the full lab daemon boots. **Target post-binding contract (not yet shipped):** node + tarball + GRANOLA_API_KEY + ANTHROPIC_API_KEY + product launchd unit, reusing the direct Claude Agent SDK pattern already shipped in `src/surfaces/ceo-slack-responder/intake-agent.ts` but not yet wired to Granola extraction. Both state macOS-required, the shared-workspace habit, transcript pre-check, edit-before-poll freeze rule, internalDomains=[] bypass, and the ~20-min Granola latency floor. Never present the target contract as installable today.
- Generate the env-var reference table (~50 ECHO_* vars: name, default, subsystem, client-box-relevant yes/no) — grep-derived, feeds the ex-134 deploy spec.
- Write the lab access-discovery checklist to execute WITH the lab: Mattermost version/admin/bot/websocket rights, Zoom plan + transcript export path, OAuth app-review lead time; seed raw/external/precedents/zoom-transcript-access-model.md and mattermost-bot-model.md.
- Write the initial commercial offer and B6 delivery metric: buyer, price or time-bounded paid-engagement posture, payment mechanism, assisted onboarding included, conversion trigger, and success defined as install + real meeting + useful brief + repeat use on the client's machine. Sales conversations refine these mechanics; they do not gate the carve.
- Banner or archive the three retired install docs (docs/SEND-TO-TESTER.md, docs/echo-init.customer.example.json, scope banner on docs/echoctl-install.md) so the dead product cannot be handed to the lab.
- Decide and record the version/CHANGELOG fix: bump past the 0.1.0-beta.1 semver inversion + backfill a customer-facing entry, or write an explicit deferral — folded into the ex-134 deploy spec.
- Draft the n=2 Granola account-topology question (advisor's own key vs shared-workspace-only) as a founder decision doc — it hard-blocks the advisor becoming a user.

**Author-complete exit:** Current and target contracts are unambiguously separated; every trap-map section-10 folklore step is written down; every lab-facing question (consent, pricing, access, feedback) has a written artifact before the advisor meeting.

**Operator-validated exit:** After Jul 24, a non-author follows the current contract on a clean Mac/scratch user, records every deviation, and the docs are corrected. This rehearsal validates today's full-lab tarball, not the future unbuilt product daemon.

The current-contract rehearsal is diagnostic input only and cannot close G5. G5 requires the built, versioned product-only artifact to pass the full qualification matrix on clean target-like Mac environments plus an exact-artifact founder staging smoke. G6, separately, installs that same checksum on the actual client machine and records acceptance/handoff.

### WS6 — Detection instruments + never-run empirical gates

- **DONE 2026-07-11 (contract only):** Define `DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE`, the controlled release matrix, build-once identity, three evidence records, and G5/G6 split in `2026-07-11-team-product-graduation-pipeline.md`. The runner and product gates remain post-G2 work.
- Before any empirical run, commit a rubric naming inputs, expected outputs, timeout/quality threshold, privacy handling, stop condition, grader, and what result counts as pass, accepted risk, or blocker. Do not design the verdict after seeing the output.
- Run the cold-db extraction gate (register A2): scratch ECHO_HOME + fresh db against a real meeting transcript, grade extraction vs the warm-db baseline, record the verdict as a decision doc — before any customer-facing run.
- Run the deploy rehearsal on a non-founder machine (clean macOS VM or scratch user): scripted tarball install + upgrade + rollback, exercising the 12-class trap map; record every deviation.
- Probe expired-CLI-auth behavior: does an unattended brain subprocess hang or fail loud when codex/claude auth lapses — box-day blocker classification depends on the answer.
- Fix the 2026-07 codex journal shard (missing '## Interactions' marker) and verify tools/dogfooding/journal-cat.sh 2026-07 exits 0 — the canonical merged read is currently broken for the whole month.
- Extend tools/sync-skills.sh --check to flag orphan adapters (or add a documented exemption list); create the canonical skills/office-hours.md so the check stops passing falsely.
- One-shot launchctl bootout of the ~7 leaked com.echo.selftest.* daemons (they flake gates at load ~100, corrupting this sprint's own verification signal); record and rank the structural teardown fix pre-lift, then create a proposed item only after G2.
- Build and run once the composite staleness sweep: diff complete/ After-Completion sections vs wiki/.manifest.json, lint inbox specs' paths against HEAD, flag task-state pointers whose item is complete; file findings as followups.
- Run one live drift sweep against the 3 confirmed derived:team-decisions rows (the shipped 114/118/119 surfaces have never executed on real data); stamp eval/cold-reader/README.md as the frozen 2026-05-31 archived record.
- Verify the .env.slack guard chain end-to-end (check-ignore + hook + CI) after WS2's hook lands — the symlink-node_modules near-miss proves gitignore alone can fail.
- Freeze the demo operationally before Jul 18: record immutable SHA, tarball checksum, db snapshot, plist/env export, smoke result, previous-tarball rollback artifact, emergency-change owner, and a rule that the demo box is untouched outside that process.

**Exit criteria:** Predeclared rubrics and result documents exist for cold-db, deploy-rehearsal, and auth-expiry checks; journal-cat 2026-07 is green; sync-skills check is bidirectional; zero leaked selftest daemons remain; the drift surface has one real execution on record; the freeze manifest is sufficient to recreate or roll back the demo state.

### WS7 — Physical repo reorg (post-demo and post-G4; not quiet-window work)

- Do not start until holdout-131 evidence is preserved/closed and filter-repo is either completed with a fresh clone/rescan/re-pin or explicitly deferred. A history rewrite after a SHA-based move log would invalidate the log.
- WS7 is optional maintenance, not a commercial-product gate. Freeze or defer any move that touches carve files or references; unrelated reorganization never delays post-G2 productization.
- Convert every move into a dependency-migration row: old path → new path → all runtime writers/importers/package scripts/tests/docs/spec backlinks → compatibility stub decision → targeted checks → commit SHA. `rg` backlink inventories run before and after each batch, and current canonical references update in the same commit.
- Hard boundary: zero moves or renames under src/; no src/product/ creation; no per-worker enable flags or files-manifest surgery — all of that is register-Part-4 carve territory for the post-demo re-spec.
- After each batch: npm run test:product + npm run test:orchestration + typecheck + lint + build:cli + npm pack --dry-run + tools/sync-skills.sh --check, plus targeted tests for every moved consumer. Never batch a move with unrelated edits.
- Before moving any test file, verify it is not named in the carve register's standing decisions and that vitest config include globs still match; defer to post-demo if ambiguous.
- Regenerate docs/BACKLOG.md and stamp docs/architecture-map with a 'refresh owed post-carve' banner at close.

**Exit criteria:** Every move is applied or explicitly deferred with a dated reason; dependency-aware move manifest and backlink diff are committed; targeted and full verification are green; working tree is clean; tools/ disk usage drops from gigabytes to megabytes; nothing under src/ changed.

## Reorg moves (carve-boundary safe: zero moves under src/)

| Target | Change | Rationale |
|---|---|---|
| backlog/inbox/2026-05-29-081-raycast-command-disposition-and-removal.md | Delete (or move to backlog/archive/) with a one-line commit citing complete/081 at 9bf44cea as authoritative | Zombie duplicate of a shipped item reading as open work; with 132/133 withdrawn it is now the ONLY inbox file, so removal leaves inbox empty and honest. |
| backlog/reviews/ (dirs of complete/archived items) | Move to backlog/archive/reviews/<YYYY-MM>/; keep only in-flight items' rounds live; extend the archive policy README | 1617 files / 6.9M of pure history — the largest mass in the repo; nothing in flight references closed rounds. |
| backlog/complete/ (wiki-promoted items) | Batch-run the documented stub-and-archive reduction to backlog/archive/shipped/ (after WS4's promotion pass closes each item's After-Completion debt) | Only 5 of 130 completed item specs have archive counterparts; do NOT bulk-normalize stale status: frontmatter — README forbids it. |
| backlog/task-state/ (pointers for completed items) | Archive to backlog/archive/task-state/ alongside each item's stub | 51+ dead pointers are active cold-start misdirection for role-typed actors; only live-item pointers stay. |
| tools/echo-overlay/ | Remove untracked node_modules + src-tauri/target after confirming no process uses them; defer tracked-app relocation until its tsconfig/wiki/docs/test consumer inventory is complete | A dormant Tauri product-surface prototype, not a tool; disk cleanup is local hygiene, while relocation is a dependency migration rather than a cosmetic move. |
| echoctl-agent-onboard-runbook.md (repo root) | Diff into docs/echoctl-agent-onboard-runbook.md (canonical), then delete the root copy; make SEND-TO-TESTER copy from docs/ at send time | Confirmed-diverged duplicate; two truths for an install runbook is exactly the drift class this sprint kills. |
| echoctl-0.1.0.tgz + .workflow-echo-080-*.js (repo root, untracked) | Delete all four files | Stale Jun-2 tarball whose version contradicts package.json, plus item-080 scratch; the deploy model regenerates tarballs per deploy. |
| wiki/.obsidian/ (5 tracked files) | git rm -r --cached wiki/.obsidian | Tracked despite .gitignore declaring it per-user state; workspace.json is per-user churn risk. |
| raw/internal/queue-errors/ (directory) | Rename to raw/internal/queue-error-artifacts/ only with updates to push-round-state.sh, task-state tests, canonical skills/adapters, and all backlinks | Name collision with the append-only queue-errors.md log file is real, but this directory has a live runtime writer and cannot be moved as prose-only cleanup. |
| raw/internal/ceo-loop-retest-105.md | Move into raw/internal/dogfooding/reports/ (live-test record) | Loose file at raw/internal/ root violating the documented subfolder taxonomy. |
| raw/internal/dogfooding/ (8+ analysis artifacts + forensic HTML) | Move analyses to raw/internal/dogfooding/reports/; delete the on-disk closed-loop-078 forensic HTML | Journal shards (the canonical journal-cat inputs) should be the only top-level files in the dogfooding dir. |
| raw/internal/extension/, raw/internal/v1-spec/, raw/internal/prototypes/ | Delete only empty/README-only stubs after folding pointers; preserve brief-now-prototype.mjs as the item-131 reference asset or move it with all backlinks | The first two are early-structure remnants; prototypes/ contains a cited reference implementation and is not wholesale-deletable. |
| docs/execution/echo/linear-intake-gate-setup.md | Move to docs/linear-intake-gate-setup.md; remove docs/execution/ | Three-level path for exactly one file while docs/ root hosts flat runbooks. |
| ~/Desktop/Project_echo--subject-key-unification/ | Delete the empty directory (not in git worktree list) | Pure orphan from item 112's worktree, shipped 2026-07-04. |
| .claude/commands/office-hours.md | Create canonical skills/office-hours.md and re-sync (or add a documented Claude-only exemption list to sync-skills.sh) | Orphan adapter with no canonical source violates the skills-are-the-protocol rule and defeats --check. |
| tools/ root-level loose scripts (~20) | Group trace-viewer scripts only after updating package.json scripts, test imports, docs, and completed-spec backlinks; prove tail-mcp.sh/foreign-install-smoke.sh unreferenced before delete/move; document scripts-vs-tools boundary | Undocumented boundary between loose scripts and 6 purpose-subdirs; package scripts and tests make this a live dependency migration. |
| tests/smoke.test.ts, tests/windows-compat.test.ts | Move into tests/packaging/ and tests/windows/ respectively — ONLY after verifying vitest config include-globs still match and neither is named in the carve register; otherwise defer to post-demo | Last two loose root test files; windows-compat placement obscures the Windows epic's scope. Deferred-if-ambiguous keeps carve-inventory churn at zero. |
| assets/echo-system-architecture.png | Keep in assets/ unless assets/README.md's canonical contract is deliberately changed in the same reviewed change | The current assets README declares this location canonical; visual tidiness alone is not enough reason to invalidate that contract. |
| docs/SEND-TO-TESTER.md + docs/echo-init.customer.example.json | Move to docs/archive/ with dated supersession headers (or retitle explicitly as the Windows dev-capture beta); create the real client-runtime example in WS5 | The only 'customer-facing' install docs describe the retired dev context-layer product; must be impossible to hand to the lab by accident. |
| holdout/131-confirmation branch + Project_echo--holdout-131 worktree | Add to the sprint cleanup checklist now; delete worktree + local/remote branch only AFTER the advisor-meeting tier-2/3 retest closes 131 verification | Still potentially needed for the deferred retest; premature deletion destroys the blind-holdout evidence chain. |

## Sequencing

1. Jul 10-11 (first): WS1 orientation truth pass + journal-cat 2026-07 fix + 081 zombie deletion — every subsequent actor and agent session reads corrected docs, and the canonical journal read must work before evidence-gathering tasks cite it.
1. Jul 10-12: WS2 HEAD redactions, reproducible secret + semantic-content scans, CI gitleaks job + pre-push hook — containment of an already-public repo; the filter-repo execute-or-defer decision is made now, but execution waits for G4.
1. Jul 11-14: WS3 halt closure register + followup disposition sweep + acceptance outlines + prod draft-store fixture purge. No spec conversion occurs unless G2 is committed; no calendar date implies lift.
1. Jul 12-16: WS5 client-prep doc pack + the B5/B6 pricing/definition-of-done decision doc; the YC demo-plan amendment (WS1) locks before Jul 18 since it changes what gets frozen.
1. Before Jul 18: commit empirical rubrics; run cold-db and expired-auth probes; boot out leaked selftest daemons; create the full G3 freeze manifest. Nothing touches the frozen demo box afterward except the recorded emergency process.
1. Jul 18-24 demo-quiet window: WS4 wiki promotion and drift corrections only, against a pinned source SHA. No filter-repo, mass reorg, package-path migration, or demo-box mutation.
1. Start C4 immediately: write the offer, name target accounts, set an outreach cadence and demo/CTA, and record the first contact date. G1 gates sharing client/repo/live-data material, not outreach; C4 does not wait for G2 or validate demand again.
1. Jul 24 demo/advisor window: continue pricing/buyer/onboarding discovery, the recipient-feedback question, 130 checklist, and holdout-131 tier-2/3 retest; preserve evidence before cleanup. These refine sales and delivery, not product selection.
1. Post-Jul 24: close the holdout worktree/branch after evidence preservation; run the current-contract deploy rehearsal on a clean Mac/scratch user and fold deviations into WS5.
1. G4 maintenance window: stop writers → snapshot → filter-repo + fresh clone/rescan/re-pin if approved (or record deferral). Run only non-conflicting WS7 moves; defer the rest.
1. After G2, once filter-repo is completed or explicitly deferred: propose the graduation foundation first, then qualify individual wedge capabilities. Freeze conflicting WS7 moves; do not put general reorganization in front of the carve.

## Risks

- Ground truth moved under the planning inputs: 132/133 were WITHDRAWN at 0ab0af05 (Jul 10 15:55 PDT, numbers freed, 'clarity halt declared'), not inbox-parked. Any residual citation to '132/133 promotion ≥Jul 25' must be read as historical and corrected to 'post-halt successor carve'; the A7 staleness-reverify protocol still applies.
- Reorg churn rots the carve's standing move inventories: mitigated by the zero-src/-moves boundary and the committed move log, but any exception (test files, package.json files manifest) silently invalidates register-Part-4 decisions — defer anything ambiguous.
- filter-repo rewrites every SHA: it breaks local clones and worktrees (holdout-131 is still needed), invalidates all SHA-pinned references, and cannot revoke already-cloned/forked/cached content. It requires the G4 exclusive window; deferring with honest residual exposure is legitimate.
- Scope creep past the halt: the highest-leverage findings (signals first-run cutoff, API-key brain, brief --wait, fail-loud config) are code fixes the new docs will make tempting. Pre-lift work stops at dispositions and acceptance outlines; even spec creation waits for G2.
- Demo-box fragility after Jul 18: any post-freeze mutation can invalidate the live demo state. The artifact is pinned and the box is untouched; wiki/doc work happens against that SHA, while reorg and history work wait for G4.
- Founder decision bottleneck (solo founder + demo prep): filter-repo, pricing posture, phase-1 definition of done, demo scenes 2-3, and the n=2 Granola account topology all need founder calls — batch them into one office-hours session in the first two days or they slip past the freeze and the advisor meeting arrives with unwritten answers.
- Redaction theater: HEAD redactions or a later rewrite cannot undo prior public disclosure. The data-handling one-pager must state residual clone/fork/cache exposure honestly, and the content policy must prevent recurrence.
- Calendar collisions at client-sprint start: candidates.test.ts goes vacuous ~Jul 30 and the carve re-spec + adapter work land post-demo — a slip leaves the client sprint with a decayed test, an unwritten commercial offer, and an unrehearsed deployment path.

## Founder decision batch (blockers if unmade — batch into one office-hours session, first two days)

1. filter-repo history rewrite: execute only in the post-holdout G4 window (snapshot, fresh clone/rescan, re-pin plan) or defer with residual exposure stated honestly in the lab data-handling doc.
2. YC application: submit vs defer; if submit, what the video shows post-pivot (meeting→brief on real founder meetings is the only halt-compatible scene) and how the IP/prior-employer questions are answered.
3. B1 rollout calendar; B5 price/buyer/payment mechanics + customer-visible name; B6 client-machine install/use/repeat and operational rollback thresholds; C4 offer/target list/outreach cadence. None reopens product demand.
4. A3 brain economics/terms/key custody plus n=2 Granola topology (advisor's own key vs shared-workspace-only); who pays for vendor usage and whether the initial client engagement requires the Zoom adapter.
5. Entity form + one-page initial client agreement with payment or a time-bounded paid-conversion term.
6. Halt lift: ratify or edit the candidate rule and row-by-row closure register in `2026-07-10-project-echo-orientation-and-closure.md`; if ratified, commit the approval at a named SHA before WS3 creates specs.
