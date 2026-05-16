---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
round: 2
spec_commit_sha: 7fcb4b202523cf3e27d032926050d273c86a0a1c
artifact_path: backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md
class: structural-reform
requested_at: '2026-05-16T07:11:07Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r1 escalated (codex pushback + codex-ops proceed_after_patches; 8 findings,\
  \ 6H+2M). Founder explicit override at 'full auto until convergence for 057b' (00:08\
  \ PDT). All findings accepted; spec patched at 2e01162. Key resolutions WITHOUT\
  \ re-opening 057a: (1) AC0 step 1+3 \u2014 coord_invoke spawns tools/review-queue/run-<role>-reviewer.sh\
  \ (existing wrapper that handles prompt routing + log redirect + codex argv assembly),\
  \ env={ECHO_COORD_REQUEST_PATH, ECHO_COORD_CORRELATION_ID}, shell:false; wrapper\
  \ path derived from role slug; headless:false roles rejected; (2) AC0 step 5 + AC7\
  \ outcome enum \u2014 pinned-request bind-failure path emits coord:tick_start BEFORE\
  \ bind-validate then coord:tick_end(outcome=bind_failed, reason=...) on failure;\
  \ 057a's existing expects-based close rule handles the close (reviewer_invoked.expects=tick_start,\
  \ tick_start.expects=tick_end); NO new tick_failed_to_bind event type; (3) AC7 request.py\
  \ uses str(uuid.uuid4()) \u2014 36 chars with dashes; matches schema pattern AND\
  \ coord_invoke validation regex; one representation everywhere; (4) frontmatter\
  \ blocked_by: ['2026-05-16-057a-coord-substrate-and-observability'] added; spec_refs\
  \ lists BOTH complete/ and ready/ paths for 057a; (5) tools/blocked.py regex widened\
  \ at 497ea46 (pre-disposition fix; founder caught the symptom running /process-backlog);\
  \ test_alpha_suffixed_id_is_accepted added; (6) the 5 non-reviewer event types (round_combined,\
  \ merge_start, merge_complete, item_claimed, item_pushed) deferred to a follow-on\
  \ builder/merger/watcher observability spec \u2014 057b scope tightens to REVIEWER-role\
  \ active trigger only; merge-and-cleanup + process-backlog skill flows unchanged.\
  \ r2 verifies: (a) wrapper-spawn semantics in AC0; (b) tick_start+tick_end(bind_failed)\
  \ flow closes 057a's deadline correctly; (c) one correlation_id representation;\
  \ (d) blocked_by + dual spec_refs; (e) deferred event types are truly out of scope\
  \ in AC7 + Out-of-Scope; (f) no new architectural concerns that would re-open 057a.\
  \ ops lens: wrapper-spawn under daemon vs launchd-fallback paths; env-var inheritance\
  \ through subprocess.spawn; bind-failure emission idempotency under concurrent retries.\
  \ CONVERGENCE: r2 0-1 findings = terminal trajectory; \u22653 findings or HIGH/pushback\
  \ = re-escalate per 049 asymptote rule."
---

# What to review

Read `backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md` at commit `7fcb4b202523cf3e27d032926050d273c86a0a1c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
