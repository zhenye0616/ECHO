# Committed-content policy (public tree)

**Date:** 2026-07-11 · **Status:** committed 2026-07-11 (WS2) · **Scope:** what may and may not be committed to the ECHO repo

The ECHO repo is public (since 2026-06-06). Every commit to any branch is world-readable the moment it is pushed, and — because the repo has been public — **nothing here can revoke prior clones, forks, or caches of already-pushed content.** This policy governs what may land going forward and what to do when something forbidden slips in. It does not undo past exposure; see `docs/lab-data-handling.md` for the residual-exposure statement.

## Forbidden content classes

Never commit any of the following to the tracked tree going forward:

1. **Secrets.** API keys (`grn_*` Granola keys, `ANTHROPIC_API_KEY`, brain-vendor tokens), `.env*` values, `~/.echo/state` credential files, Slack bot/app tokens, OAuth client secrets, session cookies, private keys. This class is machine-detectable. The repo-owned `tools/secret-scan.sh` pins Gitleaks 8.30.1 and scans all reachable history with full output redaction; `.github/workflows/secret-scan.yml` runs it on every push/PR, including docs/raw-only changes. Operators may deliberately install the matching local pre-push guard with `tools/install-pre-push-hook.sh`; the installer is never automatic and warns before replacing another hook.
2. **Third-party personal names from live captures.** Real attendee names, coworker names, lead names, or advisor names that entered the repo via a captured meeting, transcript, Slack export, or brief. Fictional/placeholder names in fixtures are fine and required (see redaction rule below).
3. **Meeting titles and Granola note IDs from real workspaces.** A note ID is a live-workspace pointer, not an opaque token; treat it as identifying. (Known residual: two note IDs remain pinned in `backlog/complete/2026-07-10-131-…` AC8 as a machine-local test contract — inventoried, deliberate.)
4. **Verbatim meeting or Slack quotes.** Any pasted line of real transcript, real brief body, or real Slack message content. Describe the *shape* ("a two-line decision row with owner + date"), never the text.
5. **Employer-identifying material.** Workspace names, channel names, project codenames, or content that identifies a real employer/client organization tied to captured data.

## Client-participant naming rule

Once a real client (the lab pilot) is onboarded, **no client participant, workspace, channel, meeting, or decision content may be named in the public tree** — not in decision docs, agent-run logs, journals, tests, or wiki. Refer to roles ("the lab PI", "participant A") and shapes, never identities. This is stricter than the general third-party rule because the client relationship is contractual and ongoing.

## Dogfooding-journal redaction rule (Returned / Sources fields)

The dogfooding journal's value is MCP-call discipline and surprising failures, which are **structural**, not content. In the `Returned` and `Sources` fields:

- **Allowed:** counts, shapes, cluster/atom IDs, source families (`git`, `derived:granola-signals`, `app:cursor`), verdict, latency, error strings. "3 clusters, top one 7 atoms, all git rows dropped by the text-compare WHERE clause."
- **Forbidden:** verbatim sensitive content of what was returned — real names, real quotes, meeting titles, brief prose. Never paste the returned atom's `content` if it carries live capture.

If a journal entry cannot make its point without quoting sensitive returned content, paraphrase the shape and note the omission; do not quote.

## PII / recording-consent class (trap-map addition)

Add a PII/recording-consent class to the client-machine trap map: **meeting transcripts are recordings of identifiable people, often captured under a platform's consent regime, not the repo's.** Any artifact derived from a real meeting (transcript, brief, extracted signal, test fixture built from one) inherits that consent scope and must not be committed with identifying content. Recording-consent is the client's/platform's to grant; the repo is not a lawful destination for the raw recording or its verbatim derivatives.

## On accidental commit

If forbidden content lands in a commit:

1. **Redact at HEAD immediately** — replace the content with a placeholder or remove it, commit the redaction, push. This stops the *tracked-tree* exposure and is the minimum required before any further client-derived artifact is committed.
2. **Record it in the exposure register** — the WS2 tracking artifact that distinguishes the three jobs (June db token scan / git-history secret scan / filter-repo content rewrite). Log what leaked, which commit introduced it, the redaction commit, and whether history still retains it.
3. **State the residual honestly.** A HEAD redaction does **not** remove the content from history — it remains reachable via the pre-redaction SHA (and in any clone/fork/cache) until and unless a `filter-repo` history rewrite is executed. Note in the register whether the item is now a filter-repo target. The rewrite is a separate founder decision (`raw/internal/decisions/2026-07-11-filter-repo-decision-template.md`); redaction-at-HEAD is not a substitute for it.

## Known residuals (this policy does not pretend the tree is clean)

This policy governs future commits; it coexists with inventoried residuals it does not erase: the history anchors awaiting the filter-repo decision (lead list, coworker notes, dump, pitch drafts); dogfooding-journal entries containing live-capture names (in-the-moment records — inventoried, not rewritten); the 131 AC8 note-ID test contract; the already-initial-redacted employer references; and founder absolute paths (~142 files). The authoritative list is `raw/internal/decisions/2026-07-11-exposure-semantic-content-inventory.md`. A new commit that ADDS to any of these classes violates this policy even though residual instances exist.
