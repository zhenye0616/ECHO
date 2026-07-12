# Three-job scan tracking — so "we scanned" stops meaning the wrong thing

The failure mode this artifact exists to kill: conflating three DIFFERENT jobs. "We ran a scan" has
meant a June db-token check, or a pattern grep, or a promised history rewrite — none of which covers
the others. They are tracked separately below.

| # | Job | What it covers | What it does NOT cover | Status (2026-07-11) |
|---|---|---|---|---|
| **A** | **June 2026 db token scan** | Live-DB / config credential values checked | git history; semantic content | ✅ **DONE** — all placeholders, no live creds |
| **B** | **Git-history secret scan** | Credential *strings* across all reachable commits/blobs | semantic content (names/quotes/IDs); existing clones | **DONE on `maint/clarity-phase2` at `5bd7b0cd`, pending merge + independent rerun.** Gitleaks 8.30.1 scanned `--all` with full redaction: 4,493 commits / ~28.51 MB at the Phase 1 baseline and 4,494 / ~28.52 MB after the gate commit; zero findings. Exact evidence and limitations: `2026-07-11-phase2-exposure-baseline.md`. |
| **C** | **filter-repo content rewrite** | Purging sensitive *content* from git *history* | live clones/forks already out there; secret entropy | ❌ **NEVER RUN.** Promised in commit `0ee788a2` ("privacy: untrack interview/outreach notes; ignore raw/internal/interview…"). Untracking removed files from HEAD only — the blobs remain in history. **Founder execute-or-defer decision PENDING.** |

## Job C — known history exposure anchors (content still reachable in history)

Untracking-from-HEAD ≠ removal-from-history. These blobs are still `git cat-file`-able by anyone
with a clone:

| Commit | Date (PDT) | Exposure |
|---|---|---|
| `ab95c519` | 2026-06-03 | Pain/lead-hunt note — **lead list + coworker notes** |
| `1ba3580a` | 2026-05-07 | **~560K dump** carried in the diff |
| `7bc368b5` | 2026-07-04 | **Pitch drafts** added (`raw/internal/pitch/`) |
| `9d90d931` | 2026-07-04 | Pitch drafts **removed from HEAD** + gitignored — but retained in history from `7bc368b5` |
| `0ee788a2` | 2026-06-06 | Interview/outreach notes untracked from HEAD — the filter-repo rewrite this commit implied was **never performed** |

## Hard caveats (state these every time)

1. **A secret scan does NOT cover semantic content.** Even a clean gitleaks run leaves the names,
   meeting titles, live brief quotes, and employer/negotiation material inventoried in
   `2026-07-11-exposure-semantic-content-inventory.md` fully exposed. Different job entirely.
2. **Neither a HEAD redaction nor a history rewrite revokes prior public clones or forks.** The repo
   has been public since 2026-06-06. Anyone who cloned/forked retains everything. History rewrite +
   redaction reduce *future* exposure surface; they cannot recall what's already out.
3. **Job B closed on a real Gitleaks run, not the earlier pattern report.** Preserve the scanner
   version, command, ref scope, redaction posture, and negative control on every rerun. A later clean
   result still says nothing about semantic-content classes or prior clones.

## Recommended sequencing (not decisions — inputs to the founder session)
1. Apply the 4 HEAD redactions (`2026-07-11-exposure-semantic-content-inventory.md`) — cheap, reduces new-clone exposure now.
2. Re-run the pinned repo-owned Gitleaks wrapper after merge and confirm the first GitHub secret-scan workflow run; install the local pre-push hook deliberately where desired.
3. Founder execute-or-defer session on Job C (filter-repo) — weigh against caveat #2 (existing clones).
