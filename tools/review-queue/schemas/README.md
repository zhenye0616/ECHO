# review-queue schemas

Three JSON Schemas backing the file-shape contract in
`backlog/ready/2026-05-11-039-cross-tool-review-dispatch-queue.md` (AC1).

| Schema | Path | Frontmatter on |
|---|---|---|
| request | `request.schema.json` | `backlog/reviews/<item_id>/r<N>/request.md` |
| reviewer | `reviewer.schema.json` | `backlog/reviews/<item_id>/r<N>/{codex,cursor}.md` |
| combined | `combined.schema.json` | `backlog/reviews/<item_id>/r<N>/combined.md` |

## Per-file vs. combined verdict enums

The per-reviewer enum is the narrower set; the combined enum is the wider set:

- `reviewer.verdict` ∈ `{proceed, proceed_after_patches, pushback}`
- `combined.combined_verdict` ∈ `{proceed, proceed_after_patches, pushback, divergent, single_reviewer_timeout, no_responses}`

The three combined-only values are produced by `combine.py`'s verdict roll-up and timeout paths; a reviewer cannot write them in their own response file.

## Timezone discipline

All schema-validated frontmatter timestamps (`requested_at`, `completed_at`, `combined_at`) use ISO-8601 UTC (suffix `Z`). This is the machine layer.

The dogfooding journal at `raw/internal/dogfooding/mcp-interactions-journal.md` uses PDT (founder-local) per project convention. The two layers are deliberately distinct: queue frontmatter is machine-readable and unambiguous across timezones; the journal is human-readable for the founder.

## Reviewer enum extension

`reviewer` is `{codex, cursor}` in V1. The protocol is reviewer-harness-agnostic — extending the enum (e.g., to add `gemini`) requires updating both `request.schema.json#requested_reviewers.items.enum` and `reviewer.schema.json#reviewer.enum`. No other code changes are needed: combine.py walks any `*.md` response file whose frontmatter validates against the reviewer schema.
