# Clarity sprint plan — max clarity, repo cleanup/reorg, client-facing prep

**Date:** 2026-07-10 · **Companion:** `2026-07-10-full-project-map.md` (the four-quadrant map this plan executes against)

**Frame.** This sprint adds no product code. It operates under the Part-4 clarity halt (`0ab0af05`): analysis, decisions, documentation, cleanup, and detection instruments only. One adjustment to the machine-drafted plan below is applied throughout: **WS3's conversion of the unknowns register into claimable build specs is gated on the halt lifting** — i.e., on the founder judging the map complete. Until then WS3 produces *written dispositions and a ranked queue*, not spec files. Everything else in the plan is halt-compatible as drafted.

## Sprint goals

- One truth everywhere: every orientation surface an agent or human reads first (CLAUDE.md, NORTH_STAR, AGENTS.md, AGENT_INSTRUCTIONS, v1-spec banner) names the same current product — meeting→brief lab pilot, tarball deploy, macOS box, clarity halt — with zero contradictions.
- Exposure debt executed, not just mapped: HEAD redactions, full-history secret scan, filter-repo decision, CI secret gate, and a written committed-content + data-handling policy, all BEFORE any lab data or repo link is shared.
- The unknowns register becomes a claimable backlog: every trap-map/register/stress-test must-fix has a written disposition + queue rank (spec files only at/after halt lift); zero undispositioned followup bullets at sprint close.
- The shipped client loop gets its owed documentation: the 124-131 wiki promotion pass plus correction of every shipped-status page that HEAD code currently falsifies.
- Client-facing prep pack written from existing knowledge only (box runbook, install/onboarding doc, env-var table, data-handling one-pager, lab access-discovery checklist, pricing/DoD decision) — an operator could install and run the meeting→brief box from docs alone.
- Repo physically clean and move-logged so the post-halt carve re-spec (ex-132/133, withdrawn at 0ab0af05, decisions live in register Part 4) lands on stable ground; the two never-run empirical gates (cold-db extraction, off-founder-machine deploy rehearsal) executed and recorded.

## Workstreams

### WS1 — Orientation truth pass (operating-model docs update immediately)

- Rewrite CLAUDE.md 'V1 Scope Reminder (Tape Above Desk)' to the pinned scope: university-lab pilot, meeting→brief loop only, Zoom+Mattermost adapters owed, macOS tarball box, Jul 18 freeze, clarity-halt / no-new-product-code rule.
- Refresh docs/NORTH_STAR.md 'Current Sprint Focus' to the clarity/cleanup sprint + lab-pilot readiness; keep the standing-tension block; add a dated-expiry convention to the focus header.
- Update AGENTS.md's stale 'friction-first' operating gate to the same sprint framing so all three entry docs name one sprint.
- Add a dated supersession banner (banner only, no body rewrite) to wiki/product/v1-spec.md pointing at the 2026-07-01 org-alignment reframe + 2026-07-10 scope pin; fix docs/AGENT_INSTRUCTIONS.md's mandatory-read table accordingly.
- Write a dated amendment to raw/internal/decisions/2026-07-03-yc-demo-sprint-plan.md resolving demo scenes 2-3 post-Justinian (Mattermost, mock Slack, or cut) and mark 2026-07-07-slack-enablement-two-stage-plan.md superseded/deferred.
- Correct trap-map line 82's false '(already queued)' claim to 'named, not yet specced'; correct the stale MEMORY.md CI-split-'parked' record to shipped.
- Annotate 2026-07-09-decision-loop-canonical-model.md with per-stage 'proven under conditions X' qualifiers (responder-up dependency, Justinian-only Linear validation, no-synthesis responder).
- Add 'retired' to the wiki status vocabulary (CLAUDE.md taxonomy + .manifest-schema.json) or fold hotkey-overlay-raycast's retirement into the body — resolve the enum violation once.

**Exit criteria:** A fresh agent session reading CLAUDE.md + NORTH_STAR + AGENTS.md + the mandatory-read table gets the meeting→brief lab-pilot scope with zero contradictions; grep for the indie-AI-builders/$25 scope in operating files hits only bannered historical pages; demo-plan amendment committed before Jul 18.

### WS2 — Exposure and privacy execution (gates lab contact)

- Run gitleaks/trufflehog over `git log --all` full history (all branches/blobs, 2026-04-30→present) and record results in a decision doc — the scan owed since 2026-06-06.
- Redact at HEAD from the enumerated lists: the quoted live prod brief row in 2026-07-10-brief-path-stress-test.md, real third-party names in tests/enrich/post-meeting-brief.test.ts (lines 45/60), the advisor meeting title + Granola note ID in 2026-07-09-first-advisor-loop-cycle.md, and the employer-workspace Slack quotes doc.
- Hold one founder decision session: execute-or-defer the filter-repo history rewrite (lead list, coworker notes at ab95c519, 560K dump at 1ba3580a, pitch drafts at 7bc368b5); if execute, schedule for the Jul 18-24 quiet window with all worktrees closed.
- Add a gitleaks (or equivalent) CI job + a pre-push secret hook; verify GitHub push protection is enabled and audit release.yml-uploaded tarball artifacts + repo security settings via gh api.
- Write the one-page committed-content policy: allowed/forbidden content classes for the public tree, journal Returned/Sources redaction rule, pilot-participant naming rules, and a PII/recording-consent class added to the trap map.
- Write the lab data-handling/retention one-pager: what is stored where, append-only/no-delete/unbounded-growth disclosure, custody (founder accounts in lab workspaces per B3), the two egress endpoints, MCP :38478 exposure, deletion story honesty.
- Create the tracking artifact distinguishing the three jobs so 'we scanned' stops meaning the wrong thing: June db token scan (done) vs git-history secret scan vs filter-repo content rewrite.
- Run a content-class grep sweep over backlog/reviews/ (1617 files) and raw/internal/agent-runs/ for third-party names/quotes; file findings rather than fixing inline.

**Exit criteria:** History scan run with recorded results; all enumerated HEAD redactions merged; CI secret gate green on a test commit; policy + data-handling docs committed — all complete before the repo link or any pilot-lab data is shared, and before the advisor meeting.

### WS3 — Backlog conversion: register → claimable items + system integrity

> **Halt gate:** the 'spec as proposed/ items' tasks below execute only at/after halt lift. Pre-lift, each must-fix gets a written disposition + queue rank in _followups.md instead of a spec file.

- Run the contracted strategist disposition sweep over the ~20 post-07-07 followup bullets (spec / fold / drop each); add a client/dev tag convention to _followups.md's preamble and extract a client-readiness index section.
- Spec as proposed/ (or gated inbox/) items, no code written: signals first-run cutoff + newest-first ordering; ANTHROPIC_API_KEY product brain binding; echoctl brief --wait + target-miss diagnostics; product daemon launchd unit + tarball deploy story (ex-134); fail-loud config health surfaced in doctor/heartbeat; calendar-trigger item (guard inventory from the stress test); one 130-hardening bundle (opt-in env, confirm-after-edit, classifier semantics call, store-path parity, stale-run signal filter).
- Purge the leaked test-fixture ChangesetDraft from ~/.echo/state/decision-changeset-drafts.json and fix the offending test so it cannot write to the prod store again; disposition the 6 stuck pending drafts in team-decision-drafts.json (confirm via responder or expire).
- Delete the 081 inbox zombie with a one-line commit citing complete/081 (9bf44cea) as authoritative.
- Document inbox/ (parked, non-kanban, manual promotion gate), archive/, reviews/, and task-state/ in backlog/README.md.
- Add an Inbox section to tools/backlog_index.py and regenerate the stale docs/BACKLOG.md (currently missing 124-131).
- File the dispatch-next-round.py inbox-blindness fix (thread artifact_path to request.py, per _followups.md:516) as a small item.
- Fix the time-fused candidates.test.ts:234 fixture (injectable clock) before it goes vacuous ~Jul 30.
- Batch-disposition the low-priority grab-bag (wait_for_new_turns, get_atoms budget-drop, get_recent_work_context removal, 129 deadline_missed verification) in the same sweep — none gets individual sprint time.

**Exit criteria:** proposed/ contains the full client-readiness item set (each with Out-of-Scope sections honoring the carve boundary); _followups.md has zero undispositioned bullets and a client/dev axis; docs/BACKLOG.md regenerated and showing Inbox; the prod draft store contains no fixture pollution.

### WS4 — Wiki promotion pass + shipped-page drift correction (Jul 18-24 window)

- Run the owed 124-131 promotion pass: create wiki/surfaces/post-meeting-brief.md (including the brain-CLI prerequisite, --dangerously-skip-permissions posture, and the retrieval-less v0 truth per resolved A1), wiki/surfaces/decision-changeset-compiler.md, and a wiki/capture/ page for the Granola poller + intake path (including the content-freeze-at-first-ingest semantic).
- Correct wiki/architecture/local-daemon.md: regenerate the boot-subsystem list from src/daemon/index.ts and delete the false 'does no polling' claim.
- Correct wiki/architecture/capture-allowlist.md: six categories, apis=['granola'], the derived category and its writer-site enforcement.
- Rewrite wiki/architecture/capture-gate.md + wiki/principles/sandboxed-capture.md to the two-tier reality: gate-enforced for external captures, writer-site-policed for derived:/coord: atoms — a security claim the lab will read.
- Add the enrich/brain/stations-1-4 layer to wiki/architecture/system-architecture.md (the anchor page other corrections hang off).
- Regenerate wiki/surfaces/mcp-server.md's tool table from src/mcp/server.ts registrations; sync wiki/architecture/storage.md's contract snippet with src/storage/interface.ts.
- Resolve the browser-extension.md vs local-daemon.md contradiction; change hotkey-overlay/audit-page status planned→deferred with a pointer to tools/echo-overlay's actual location.
- Update .manifest.json and regenerate wiki/index.md via tools/wiki_index.py; diff every complete/ item's After-Completion section against the manifest as the closing check.

**Exit criteria:** No shipped-status wiki page contradicts HEAD code — grep for the known false claims ('does no polling', 'apis — still empty', 'five categories', '12+2 tools', 'three operations') returns zero; the poller→signals→brief client deliverable has wiki coverage; manifest and index regenerated.

### WS5 — Client-prep documentation pack (write-down-X only, no code)

- Write the client-box runbook from trap-map section 10, item by item, each marked 'automated | documented workaround'; include verbatim the plist-wipe-on-reinstall trap and the bootout+bootstrap (not kickstart -k) env-reload rule.
- Write the client install/onboarding doc for the pinned profile: tarball + node + GRANOLA_API_KEY + ANTHROPIC_API_KEY + launchd, macOS-required, the move-note-to-shared-workspace habit, Granola transcript-setting pre-check, edit-the-note-before-ECHO-polls freeze rule, internalDomains=[] bypass, ~20-min Granola latency floor, and the honest pre-carve paragraph: 'the tarball boots the full lab stack; here is what runs on a client box and why it is inert'.
- Generate the env-var reference table (~50 ECHO_* vars: name, default, subsystem, client-box-relevant yes/no) — grep-derived, feeds the ex-134 deploy spec.
- Write the lab access-discovery checklist to execute WITH the lab: Mattermost version/admin/bot/websocket rights, Zoom plan + transcript export path, OAuth app-review lead time; seed raw/external/precedents/zoom-transcript-access-model.md and mattermost-bot-model.md.
- One decisions doc for B5/B6: lab-pilot pricing posture (even 'deliberately free until X') + phase-1 definition of done (the WTP-equivalent of '3/5 ask to pay'); schedule the burned-buyer + WTP screens and a per-brief recipient-feedback question for the advisor meeting.
- Banner or archive the three retired install docs (docs/SEND-TO-TESTER.md, docs/echo-init.customer.example.json, scope banner on docs/echoctl-install.md) so the dead product cannot be handed to the lab.
- Decide and record the version/CHANGELOG fix: bump past the 0.1.0-beta.1 semver inversion + backfill a customer-facing entry, or write an explicit deferral — folded into the ex-134 deploy spec.
- Draft the n=2 Granola account-topology question (advisor's own key vs shared-workspace-only) as a founder decision doc — it hard-blocks the advisor becoming a user.

**Exit criteria:** A competent operator could install, configure, and run the meeting→brief box from docs alone; every trap-map section-10 folklore step is written down; every lab-facing question (consent, pricing, access, feedback) has a written artifact before the advisor meeting.

### WS6 — Detection instruments + never-run empirical gates

- Run the cold-db extraction gate (register A2): scratch ECHO_HOME + fresh db against a real meeting transcript, grade extraction vs the warm-db baseline, record the verdict as a decision doc — before any customer-facing run.
- Run the deploy rehearsal on a non-founder machine (clean macOS VM or scratch user): scripted tarball install + upgrade + rollback, exercising the 12-class trap map; record every deviation.
- Probe expired-CLI-auth behavior: does an unattended brain subprocess hang or fail loud when codex/claude auth lapses — box-day blocker classification depends on the answer.
- Fix the 2026-07 codex journal shard (missing '## Interactions' marker) and verify tools/dogfooding/journal-cat.sh 2026-07 exits 0 — the canonical merged read is currently broken for the whole month.
- Extend tools/sync-skills.sh --check to flag orphan adapters (or add a documented exemption list); create the canonical skills/office-hours.md so the check stops passing falsely.
- One-shot launchctl bootout of the ~7 leaked com.echo.selftest.* daemons (they flake gates at load ~100, corrupting this sprint's own verification signal); file the structural teardown fix as a small item.
- Build and run once the composite staleness sweep: diff complete/ After-Completion sections vs wiki/.manifest.json, lint inbox specs' paths against HEAD, flag task-state pointers whose item is complete; file findings as followups.
- Run one live drift sweep against the 3 confirmed derived:team-decisions rows (the shipped 114/118/119 surfaces have never executed on real data); stamp eval/cold-reader/README.md as the frozen 2026-05-31 archived record.
- Verify the .env.slack guard chain end-to-end (check-ignore + hook + CI) after WS2's hook lands — the symlink-node_modules near-miss proves gitignore alone can fail.

**Exit criteria:** Cold-db, deploy-rehearsal, and auth-expiry results exist as recorded decision docs with pass/fail verdicts; journal-cat 2026-07 green; sync-skills check bidirectional; zero leaked selftest daemons; the drift surface has one real execution on record.

### WS7 — Physical repo reorg (executes reorg_moves; carve-boundary safe)

- Apply the reorg_moves list in small batches with a committed per-move log (old path → new path → commit SHA) explicitly written for the post-halt carve re-spec to consume.
- Hard boundary: zero moves or renames under src/; no src/product/ creation; no per-worker enable flags or files-manifest surgery — all of that is register-Part-4 carve territory for the post-demo re-spec.
- After each batch: npm run test:product + typecheck + tools/sync-skills.sh --check green before pushing; never batch a move with unrelated edits (git-add pathspec atomicity lesson).
- Before moving any test file, verify it is not named in the carve register's standing decisions and that vitest config include globs still match; defer to post-demo if ambiguous.
- Regenerate docs/BACKLOG.md and stamp docs/architecture-map with a 'refresh owed post-carve' banner at close.

**Exit criteria:** All reorg_moves applied or explicitly deferred with a dated note; move log committed; CI green; working tree clean; du -sh tools/ drops from 2.4G to megabytes; nothing under src/ changed.

## Reorg moves (carve-boundary safe: zero moves under src/)

| Target | Change | Rationale |
|---|---|---|
| backlog/inbox/2026-05-29-081-raycast-command-disposition-and-removal.md | Delete (or move to backlog/archive/) with a one-line commit citing complete/081 at 9bf44cea as authoritative | Zombie duplicate of a shipped item reading as open work; with 132/133 withdrawn it is now the ONLY inbox file, so removal leaves inbox empty and honest. |
| backlog/reviews/ (dirs of complete/archived items) | Move to backlog/archive/reviews/<YYYY-MM>/; keep only in-flight items' rounds live; extend the archive policy README | 1617 files / 6.9M of pure history — the largest mass in the repo; nothing in flight references closed rounds. |
| backlog/complete/ (wiki-promoted items) | Batch-run the documented stub-and-archive reduction to backlog/archive/shipped/ (after WS4's promotion pass closes each item's After-Completion debt) | Discipline is ~96% behind (5 of 132 archived); do NOT bulk-normalize stale status: frontmatter — README forbids it. |
| backlog/task-state/ (pointers for completed items) | Archive to backlog/archive/task-state/ alongside each item's stub | 51+ dead pointers are active cold-start misdirection for role-typed actors; only live-item pointers stay. |
| tools/echo-overlay/ | rm untracked node_modules + src-tauri/target immediately (~2.35G); relocate the tracked app (37 files) to apps/echo-overlay/ or archive it out of tools/ | A dormant Tauri product-surface prototype, not a tool; poisons every carve, grep, and du; off client scope and off the demo path. |
| echoctl-agent-onboard-runbook.md (repo root) | Diff into docs/echoctl-agent-onboard-runbook.md (canonical), then delete the root copy; make SEND-TO-TESTER copy from docs/ at send time | Confirmed-diverged duplicate; two truths for an install runbook is exactly the drift class this sprint kills. |
| echoctl-0.1.0.tgz + .workflow-echo-080-*.js (repo root, untracked) | Delete all four files | Stale Jun-2 tarball whose version contradicts package.json, plus item-080 scratch; the deploy model regenerates tarballs per deploy. |
| wiki/.obsidian/ (5 tracked files) | git rm -r --cached wiki/.obsidian | Tracked despite .gitignore declaring it per-user state; workspace.json is per-user churn risk. |
| raw/internal/queue-errors/ (directory) | Rename to raw/internal/queue-error-artifacts/ | Name collision with the append-only queue-errors.md log file causes grep/tab-completion ambiguity. |
| raw/internal/ceo-loop-retest-105.md | Move into raw/internal/dogfooding/reports/ (live-test record) | Loose file at raw/internal/ root violating the documented subfolder taxonomy. |
| raw/internal/dogfooding/ (8+ analysis artifacts + forensic HTML) | Move analyses to raw/internal/dogfooding/reports/; delete the on-disk closed-loop-078 forensic HTML | Journal shards (the canonical journal-cat inputs) should be the only top-level files in the dogfooding dir. |
| raw/internal/extension/, raw/internal/v1-spec/, raw/internal/prototypes/ | Delete the README-only stub dirs (fold pointer content into decisions/); merge the one prototypes .mjs into an attic or delete | Dead early-structure remnants; three dirs holding effectively nothing. |
| docs/execution/echo/linear-intake-gate-setup.md | Move to docs/linear-intake-gate-setup.md; remove docs/execution/ | Three-level path for exactly one file while docs/ root hosts flat runbooks. |
| ~/Desktop/Project_echo--subject-key-unification/ | Delete the empty directory (not in git worktree list) | Pure orphan from item 112's worktree, shipped 2026-07-04. |
| .claude/commands/office-hours.md | Create canonical skills/office-hours.md and re-sync (or add a documented Claude-only exemption list to sync-skills.sh) | Orphan adapter with no canonical source violates the skills-are-the-protocol rule and defeats --check. |
| tools/ root-level loose scripts (~20) | Group trace-viewer scripts (render-trace, serve-trace, _trace_render, trace-card, stream-watch, loop-dashboard) into tools/trace-view/; delete or move tail-mcp.sh + foreign-install-smoke.sh to tools/diagnostics/; add a scripts/README.md one-liner documenting the scripts-vs-tools boundary | Undocumented boundary between loose scripts and 6 purpose-subdirs; two scripts referenced by nothing live. |
| tests/smoke.test.ts, tests/windows-compat.test.ts | Move into tests/packaging/ and tests/windows/ respectively — ONLY after verifying vitest config include-globs still match and neither is named in the carve register; otherwise defer to post-demo | Last two loose root test files; windows-compat placement obscures the Windows epic's scope. Deferred-if-ambiguous keeps carve-inventory churn at zero. |
| assets/echo-system-architecture.png | Move to docs/ (or wiki-adjacent assets); keep the echo-roles/echo-workflows TOML payloads in place | Marketing PNG mixed with installer inputs that install-echo-codex-skills.sh actively reads. |
| docs/SEND-TO-TESTER.md + docs/echo-init.customer.example.json | Move to docs/archive/ with dated supersession headers (or retitle explicitly as the Windows dev-capture beta); create the real client-profile example in WS5 | The only 'customer-facing' install docs describe the retired dev context-layer product; must be impossible to hand to the lab by accident. |
| holdout/131-confirmation branch + Project_echo--holdout-131 worktree | Add to the sprint cleanup checklist now; delete worktree + local/remote branch only AFTER the advisor-meeting tier-2/3 retest closes 131 verification | Still potentially needed for the deferred retest; premature deletion destroys the blind-holdout evidence chain. |

## Sequencing

1. Jul 10-11 (first): WS1 orientation truth pass + journal-cat 2026-07 fix + 081 zombie deletion — every subsequent actor and agent session reads corrected docs, and the canonical journal read must work before evidence-gathering tasks cite it.
1. Jul 10-12: WS2 HEAD redactions, full-history secret scan, CI gitleaks job + pre-push hook — hard gate before the repo link or any lab-derived content is shared; the filter-repo execute-or-defer founder decision is made now even if execution waits.
1. Jul 11-14: WS3 followup disposition sweep + register→items spec conversion + prod draft-store fixture purge — the client sprint's backlog must exist before the freeze so nothing is specced under demo pressure.
1. Jul 12-16: WS5 client-prep doc pack + the B5/B6 pricing/definition-of-done decision doc; the YC demo-plan amendment (WS1) locks before Jul 18 since it changes what gets frozen.
1. Before Jul 18 (machine-touching work): WS6's cold-db extraction gate, leaked-selftest-daemon bootout, and expired-auth probe run pre-freeze so the demo box is not destabilized afterward; nothing touching the daemon/CLI path lands after the freeze.
1. Jul 18-24 demo-quiet window: WS4 wiki promotion + drift corrections (pure docs, zero demo risk) — the single biggest block of hours, deliberately parked in the window where code must not move.
1. Jul 18-24: WS7 physical reorg moves confined to backlog/, raw/, docs/, tools/, wiki/ (never src/, never the demo path); filter-repo executes here if approved, with all worktrees except holdout-131 closed and a full snapshot taken first.
1. Jul 24 (demo day) + advisor meeting: run the WTP/burned-buyer screens, the recipient-feedback question, and the 130 pre-meeting checklist; capture triage-pattern notes (stage-2 concierge discipline) — the sprint's only live-customer tasks.
1. Post-Jul 24: deploy rehearsal on a non-founder machine (WS6), holdout-131 branch/worktree cleanup after the tier-2/3 retest, and any deferred test-file moves.
1. Jul 25+ (sprint close → client sprint handoff): post-halt carve re-spec from register Part 4 consuming the committed move log (successor to withdrawn 132/133); regenerate docs/BACKLOG.md; stamp architecture-map 'refresh owed post-carve'; hand the client sprint a specced, claimable queue.

## Risks

- Ground truth moved under the planning inputs: 132/133 were WITHDRAWN at 0ab0af05 (Jul 10 15:55 PDT, numbers freed, 'clarity halt declared'), not inbox-parked as the map states — any task or doc citing '132/133 promotion ≥Jul 25' must be re-read as 'post-halt carve re-spec from register Part 4'; the A7 staleness-re-verify protocol still applies to the re-spec.
- Reorg churn rots the carve's standing move inventories: mitigated by the zero-src/-moves boundary and the committed move log, but any exception (test files, package.json files manifest) silently invalidates register-Part-4 decisions — defer anything ambiguous.
- filter-repo rewrites every SHA: it breaks local clones and worktrees (holdout-131 is still needed), invalidates all SHA-pinned references (head_sha fields, architecture-map pin 0f77efa1, review-round spec_commit_sha values), and orphans any forks — requires a snapshot, a founder-supervised window, and a written re-pin plan; deferring is a legitimate outcome of the decision session.
- Scope creep past 'no new product code': the highest-leverage findings (signals first-run cutoff, API-key brain, brief --wait, fail-loud config) are code fixes the new docs will make screamingly tempting — this sprint only SPECS them; building early both violates the clarity halt and adds pre-freeze demo risk.
- Demo-box fragility after Jul 18: any post-freeze commit touching the daemon/CLI/enrich path can break the live demo running on real captured data — quiet-window work is restricted to docs/backlog/raw/tools by rule, and the leaked-daemon bootout must happen pre-freeze because it manipulates launchd on the demo machine.
- Founder decision bottleneck (solo founder + demo prep): filter-repo, pricing posture, phase-1 definition of done, demo scenes 2-3, and the n=2 Granola account topology all need founder calls — batch them into one office-hours session in the first two days or they slip past the freeze and the advisor meeting arrives with unwritten answers.
- Redaction theater: HEAD redactions without the history rewrite leave the lead list, coworker notes, and capture dump publicly reachable — the data-handling one-pager must state residual history exposure honestly, or the lab conversation starts on a false claim.
- Calendar collisions at client-sprint start: candidates.test.ts goes vacuous ~Jul 30 (silent coverage loss) and the carve re-spec + adapter work all land immediately post-demo — if the sprint slips even a week, the client sprint inherits a decayed test suite, an unscreened WTP assumption, and an unrehearsed deploy path simultaneously.

## Founder decision batch (blockers if unmade — batch into one office-hours session, first two days)

1. filter-repo history rewrite: execute (Jul 18-24 window, snapshot first, re-pin plan written) or defer with the residual-exposure line stated honestly in the lab data-handling doc.
2. YC application: submit vs defer; if submit, what the video shows post-pivot (meeting→brief on real founder meetings is the only halt-compatible scene) and how the IP/prior-employer questions are answered.
3. B5 pricing posture + customer-visible name; B6 phase-1 definition of done (the WTP-equivalent of '3/5 ask to pay').
4. n=2 Granola account topology (advisor's own key vs shared-workspace-only) — hard-blocks the advisor becoming a user; plus who pays for Granola seats, or whether the pilot gates on the Zoom adapter instead.
5. Entity form + one-page free-pilot letter for the lab.
6. Halt-lift criterion: what 'map complete' means, so WS3's spec conversion has a trigger.