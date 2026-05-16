---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
round: 6
spec_commit_sha: 280d387145e487b2e4e8fe534977fe7092f29659
artifact_path: backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md
class: structural-reform
requested_at: '2026-05-16T07:53:01Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r5 produced 4 findings (1H + 1M + 1L + 1 NIT). All accepted; spec patched\
  \ at 7235eeb. r6 verifies: (1) AC0 step 3 \u2014 explicit child.on('error', ...)\
  \ listener BEFORE child.unref(); logs structured failure; does NOT retract reviewer_invoked\
  \ atom (pre-spawn deadline fires deadline_missed naturally); daemon stays alive\
  \ on async spawn-error (EMFILE, wrapper-removed, bad shebang); (2) AC7 wrapper transport\
  \ \u2014 curl POST JSON-RPC to ${ECHO_MCP_URL:-http://127.0.0.1:${ECHO_MCP_PORT:-38478}/mcp}\
  \ with --connect-timeout 2 --max-time 5 -H 'X-Echo-Role: ${REVIEWER_NAME}' || true;\
  \ native-MCP NOT supported V1; (3) AC0 step 1 sub-steps 1+2 \u2014 shape-invalid\
  \ roles caught FIRST (no FS access claim holds), roster-invalid roles caught AFTER\
  \ loadCoordRoles() FS read but BEFORE wrapper-path construction/stat/spawn/MCP side-effects;\
  \ (4) UUID example variant byte \u2208 [89ab] \u2014 now 9a5a; (5) AC8 \u2014 new\
  \ fixtures coord-invoke-spawn-error-noncrash.test.ts (force async 'error' via wrapper-removed\
  \ or EMFILE \u2192 daemon alive + bounded failure) AND coord-emit-wrapper-transport.test.ts\
  \ (X-Echo-Role header + daemon-down non-fatality); (6) no regression. Trend r1\u2192\
  r2\u2192r3\u2192r4\u2192r5: 8\u21925\u21924\u21922\u21924; severity 6H/2M \u2192\
  \ 2H/3M \u2192 1H/2M/1L \u2192 1H/1L \u2192 1H/1M/1L/1NIT. r6 expected terminal\
  \ (0 findings) or 0-1 LOW/NIT. \u22652 findings of MED+ or HIGH/pushback = re-escalate."
---

# What to review

Read `backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md` at commit `280d387145e487b2e4e8fe534977fe7092f29659`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
