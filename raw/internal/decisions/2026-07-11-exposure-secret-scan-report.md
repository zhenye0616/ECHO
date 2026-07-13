# Git-history secret scan report — ECHO repo

> **Historical Phase 1 report.** This file preserves the pattern-only baseline exactly. The owed real scanner run was completed on `maint/clarity-phase2` with Gitleaks 8.30.1 and is recorded in `2026-07-11-phase2-exposure-baseline.md`. Do not reinterpret the text below as the current scan status.

**Scope:** all reachable git history (4,643 commits, all branches/blobs), repo `/Users/zhenye/Desktop/Project_echo`.
**Date:** 2026-07-11. **Mode:** READ-ONLY (no commits, no history rewrite).
**HEAD at scan:** `3f326407`.

> ## ⚠️ THIS IS A PATTERN-BASED BEST-EFFORT SCAN, **NOT** A GITLEAKS/TRUFFLEHOG RUN
> `which gitleaks trufflehog` → **neither installed**. Per instruction, nothing was installed.
> A real entropy/verifier scan (gitleaks) is **STILL OWED** and cannot be marked done off this report.
> Pattern scans miss: high-entropy secrets that don't match a known prefix, base64-wrapped keys,
> secrets split across lines, and anything in binary blobs. Treat "clean" here as *no high-signal
> prefix matches*, not *no secrets*.

## Method

```
git log --all -p --no-color | grep -aEn '<high-signal patterns>'
```
Patterns: `xox[bpoas]-`, `sk-ant-`, `sk-[A-Za-z0-9]{20,}`, `ghp_`, `github_pat_`,
`AKIA[0-9A-Z]{16}`, `-----BEGIN … PRIVATE KEY`, `Bearer …{20,}`, `xapp-`,
`GRANOLA_API_KEY=`, `ANTHROPIC_API_KEY=`, `SLACK_BOT_TOKEN`.

## Result: NO REAL SECRETS DETECTED

80 matching lines across history. Every one is either an **env-var NAME reference** or a
**placeholder / test-fake value**. No live credential material found.

| Pattern class | Distinct values seen (truncated) | Verdict |
|---|---|---|
| `xoxb-` (Slack bot) | `xoxb-token`, `xoxb` (bare), `xoxb-...` (doc ellipsis) — all ≤10 chars | Placeholder / test fake |
| `sk-ant-` (Anthropic) | `sk-ant-oat-xyz`, `sk-ant-...` (doc ellipsis), `sk-ant-` (bare) | Placeholder |
| `xapp-` (Slack app) | `xapp-token` | Placeholder |
| `SLACK_BOT_TOKEN` / `ANTHROPIC_API_KEY` | env-var names in config code + docs (`ECHO_SLACK_BOT_TOKEN` etc.) | Variable name, not a value |
| `ghp_` / `github_pat_` / `AKIA…` / `-----BEGIN … PRIVATE KEY` / `Bearer …` | **none** | No hits |

Real Slack/Anthropic tokens are 40–70+ chars; the longest value found is 10 chars. No value has
production entropy or length.

### Where the placeholder hits live (all test/doc, not credentials)
- `tests/surfaces/ceo-slack-responder/**` (drift-alert, propose-confirm, intake-*, socket-lifecycle)
- `tests/enrich/granola-intake-*.test.ts`, `tests/daemon/granola-intake-schedule.test.ts`
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06-claude.md`
- backlog specs + docs (env-var-name references in setup instructions)

### Corroborating hygiene checks (all clean)
- **`.env` files never committed on any branch** — only `.env.example` was ever added
  (`git log --all --diff-filter=A --name-only | grep .env` → `.env.example` only).
- **No artifacts tracked at HEAD** — zero `*.db`, `*.sqlite`, `*.tgz`, `*.tar.gz`, `node_modules/`.
- A prior in-tree scan note (history) already recorded the same conclusion: token greps return only
  placeholders; `.env/.env.slack/.env.fly-secrets` are gitignored and never committed.

## Gaps / what this does NOT establish
1. **Not a gitleaks run.** Entropy-based detection of non-prefixed secrets was not performed. **OWED.**
2. **No CI secret-scanning job exists** and no scanner config is present in the repo — only `.gitignore`
   stands between a future accidental commit and the public tree.
3. A secret scan says **nothing** about semantic content exposure (names, quotes, meeting IDs,
   employer material) — see `2026-07-11-exposure-semantic-content-inventory.md`. Do not let "secrets clean" imply
   "safe to share." These are different jobs (see `2026-07-11-exposure-scan-jobs-tracking.md`).
4. The repo is already public; even a future clean scan does not revoke existing clones/forks.
