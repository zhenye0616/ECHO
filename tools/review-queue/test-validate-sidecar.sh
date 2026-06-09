#!/usr/bin/env bash
# test-validate-sidecar.sh — AC3 test for the committed-sidecar validator.
#
# Asserts:
#   - a well-formed committed sidecar from the orchestrator producer validates
#   - retired producer values fail validation
#   - the live UNQUOTED reviewed_at template (PyYAML -> datetime) validates,
#     proving the datetime -> ISO-string coercion accepts the live artifact
#   - the EXACT Step-C parenthetical heading validates (live-artifact shape)
#   - a missing required heading fails, naming the heading
#   - a bad verdict enum fails
#   - verdict block without "Open questions for founder" fails
#   - the merge-and-cleanup Step-A consume path (validate then read
#     verdict/reviewed_at) succeeds on a valid sidecar and refuses an invalid
#     one — the producer<->consumer round-trip
#
# Run from the repo root.

set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
VALIDATOR="$ROOT/tools/review-queue/validate-sidecar.py"

fail() { echo "FAIL: $*" >&2; exit 1; }

TMP=$(mktemp -d -t echo-rq-sidecar-XXXX)
trap 'rm -rf "$TMP"' EXIT

write_sidecar() {
  # $1=path  $2=verdict  $3=producer  [$4=extra-body]
  local path="$1" verdict="$2" producer="$3" extra="${4:-}"
  cat > "$path" <<EOF
---
item_id: 2026-04-30-012-git-capture
verdict: $verdict
reviewed_at: 2026-04-30T22:30:00Z
test_counts: { passed: 132, failed: 0 }
producer: $producer
---

## Verdict
$verdict

## Pre-merge fixups
none

## Expected merge conflicts
none

## Follow-up items (defer, do not block merge)
none
$extra
EOF
}

# ── 1. orchestrator producer validates; retired producers fail
#       (live unquoted reviewed_at + exact parenthetical heading) ───────
write_sidecar "$TMP/p.review.md" "merge with founder fixups" "review-pending-orchestrator"
python3 "$VALIDATOR" "$TMP/p.review.md" || fail "valid orchestrator sidecar rejected"

for PRODUCER in claude-code-subagent codex-child; do
  write_sidecar "$TMP/retired.review.md" "merge with founder fixups" "$PRODUCER"
  if python3 "$VALIDATOR" "$TMP/retired.review.md" 2>"$TMP/producer.err"; then
    fail "retired producer value was accepted: $PRODUCER"
  fi
  grep -q "producer" "$TMP/producer.err" || fail "retired-producer error did not name producer"
done

# ── 2. verdict block WITH the required open-questions heading validates ──
write_sidecar "$TMP/blk-ok.review.md" "block" "review-pending-orchestrator" "
## Open questions for founder
q?"
python3 "$VALIDATOR" "$TMP/blk-ok.review.md" || fail "valid block sidecar (with open questions) rejected"

# ── 3. missing required heading fails, naming the heading ───────────────
write_sidecar "$TMP/full.review.md" "merge as-is" "review-pending-orchestrator"
grep -v "^## Pre-merge fixups" "$TMP/full.review.md" > "$TMP/missing.review.md"
if python3 "$VALIDATOR" "$TMP/missing.review.md" 2>"$TMP/err"; then
  fail "sidecar missing '## Pre-merge fixups' was accepted"
fi
grep -q "Pre-merge fixups" "$TMP/err" || fail "missing-heading error did not name the heading"

# ── 4. bad verdict enum fails ───────────────────────────────────────────
write_sidecar "$TMP/badv.review.md" "merge as-is" "review-pending-orchestrator"
sed 's/^verdict: merge as-is/verdict: totally-bogus/' "$TMP/badv.review.md" > "$TMP/badv2.review.md"
if python3 "$VALIDATOR" "$TMP/badv2.review.md" 2>/dev/null; then
  fail "sidecar with invalid verdict enum was accepted"
fi

# ── 5. verdict block without open-questions heading fails ───────────────
write_sidecar "$TMP/blk-bad.review.md" "block" "review-pending-orchestrator"
if python3 "$VALIDATOR" "$TMP/blk-bad.review.md" 2>"$TMP/err2"; then
  fail "verdict block without '## Open questions for founder' was accepted"
fi
grep -q "Open questions for founder" "$TMP/err2" || fail "block-missing-heading error did not name the heading"

# ── 6. producer<->consumer round-trip: replicate merge-and-cleanup Step-A
#       consume (validate-sidecar.py then read verdict/reviewed_at) ──────
write_sidecar "$TMP/rt.review.md" "merge with founder fixups" "review-pending-orchestrator"
python3 "$VALIDATOR" "$TMP/rt.review.md" || fail "round-trip: validator rejected a valid sidecar"
VERDICT=$(python3 - "$TMP/rt.review.md" <<'PY'
import sys, yaml
with open(sys.argv[1], encoding="utf-8") as f:
    print(yaml.safe_load(f.read().split("---")[1])["verdict"])
PY
)
[ "$VERDICT" = "merge with founder fixups" ] || fail "round-trip: verdict read mismatch ('$VERDICT')"
REVIEWED_AT=$(python3 - "$TMP/rt.review.md" <<'PY'
import datetime as dt, sys, yaml
with open(sys.argv[1], encoding="utf-8") as f:
    value = yaml.safe_load(f.read().split("---")[1])["reviewed_at"]
if isinstance(value, dt.datetime):
    if value.tzinfo is not None:
        value = value.astimezone(dt.timezone.utc).replace(tzinfo=None)
    print(value.strftime("%Y-%m-%dT%H:%M:%SZ"))
else:
    print(value)
PY
)
[ "$REVIEWED_AT" = "2026-04-30T22:30:00Z" ] || fail "round-trip: reviewed_at read mismatch ('$REVIEWED_AT')"

# consumer refuses an invalid sidecar (Step-A fail-loud)
if python3 "$VALIDATOR" "$TMP/badv2.review.md" 2>/dev/null; then
  fail "round-trip: consumer accepted an invalid sidecar"
fi

echo "PASS: validate-sidecar accepts the live orchestrator artifact (unquoted ts, parenthetical heading), rejects retired producers/malformed sidecars, and round-trips through merge-and-cleanup Step-A reads"
