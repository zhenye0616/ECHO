#!/usr/bin/env bash
# test-emit-sidecar.sh - AC7 test for the code-owned sidecar writer.

set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
WRITER="$ROOT/tools/review-queue/emit-sidecar.py"
VALIDATOR="$ROOT/tools/review-queue/validate-sidecar.py"
CHECKER="$ROOT/tools/review-queue/check-coupled-invariants.sh"
ITEM_ID="2026-04-30-012-git-capture"

fail() { echo "FAIL: $*" >&2; exit 1; }

TMP=$(mktemp -d -t echo-emit-sidecar-XXXX)
trap 'rm -rf "$TMP"' EXIT

CALLER_PENDING_BEFORE=$(git -C "$ROOT" status --porcelain -- backlog/pending_review)

new_repo() {
  local name="$1"
  local repo="$TMP/$name"
  mkdir -p "$repo"
  git init -q "$repo"
  git -C "$repo" config user.email "test@example.com"
  git -C "$repo" config user.name "ECHO Test"
  mkdir -p "$repo/backlog/pending_review"
  printf '%s\n' "$repo"
}

descriptor() {
  local path="$1" verdict_text="${2:-Merge with founder fixups.}"
  cat > "$path" <<EOF
{
  "item_id": "$ITEM_ID",
  "verdict": "merge with founder fixups",
  "test_counts": { "passed": 2, "failed": 0 },
  "body": {
    "verdict": "$verdict_text",
    "pre_merge_fixups": "- [ ] None",
    "expected_merge_conflicts": "none",
    "followups": "none"
  }
}
EOF
}

run_writer() {
  local repo="$1" desc="$2"
  shift 2
  (cd "$repo" && python3 "$WRITER" --input "$desc" "$@")
}

assert_no_caller_pending_dirty() {
  local now
  now=$(git -C "$ROOT" status --porcelain -- backlog/pending_review)
  [ "$now" = "$CALLER_PENDING_BEFORE" ] || fail "caller pending_review/ was modified"
}

install_checker_fixture() {
  local repo="$1"
  mkdir -p "$repo/tools/review-queue/schemas"
  cp "$CHECKER" "$repo/tools/review-queue/check-coupled-invariants.sh"
  cp "$VALIDATOR" "$repo/tools/review-queue/validate-sidecar.py"
  cp "$ROOT/tools/review-queue/_sidecar_validate.py" "$repo/tools/review-queue/_sidecar_validate.py"
  cp "$ROOT/tools/review-queue/_lib.py" "$repo/tools/review-queue/_lib.py"
  cp "$ROOT/tools/review-queue/schemas/review-sidecar.schema.json" "$repo/tools/review-queue/schemas/review-sidecar.schema.json"
}

# 1. Valid descriptor writes the canonical sidecar and it validates.
repo=$(new_repo valid)
desc="$repo/descriptor.json"
descriptor "$desc"
run_writer "$repo" "$desc" >/dev/null || fail "valid descriptor was rejected"
sidecar="$repo/backlog/pending_review/$ITEM_ID.review.md"
[ -f "$sidecar" ] || fail "valid descriptor did not write sidecar"
python3 "$VALIDATOR" "$sidecar" || fail "emitted sidecar failed validation"

# 2. A conflicting producer is rejected and writes no sidecar.
repo=$(new_repo bad-producer)
desc="$repo/descriptor.json"
cat > "$desc" <<EOF
{
  "item_id": "$ITEM_ID",
  "verdict": "merge as-is",
  "test_counts": { "passed": 1, "failed": 0 },
  "producer": "codex-child",
  "body": {
    "verdict": "Merge.",
    "pre_merge_fixups": "none",
    "expected_merge_conflicts": "none",
    "followups": "none"
  }
}
EOF
if run_writer "$repo" "$desc" >/dev/null 2>"$repo/err"; then
  fail "descriptor with conflicting producer was accepted"
fi
[ ! -e "$repo/backlog/pending_review/$ITEM_ID.review.md" ] || fail "bad producer wrote a sidecar"
grep -q "producer" "$repo/err" || fail "bad-producer error did not name producer"

# 3. A caller-supplied target_path is rejected and writes no sidecar.
repo=$(new_repo bad-target)
desc="$repo/descriptor.json"
cat > "$desc" <<EOF
{
  "item_id": "$ITEM_ID",
  "verdict": "merge as-is",
  "test_counts": { "passed": 1, "failed": 0 },
  "target_path": "/tmp/should-not-exist.review.md",
  "body": {
    "verdict": "Merge.",
    "pre_merge_fixups": "none",
    "expected_merge_conflicts": "none",
    "followups": "none"
  }
}
EOF
if run_writer "$repo" "$desc" >/dev/null 2>"$repo/err"; then
  fail "descriptor with target_path was accepted"
fi
[ ! -e "$repo/backlog/pending_review/$ITEM_ID.review.md" ] || fail "target_path descriptor wrote a sidecar"
grep -q "target_path" "$repo/err" || fail "target_path error did not name target_path"

# 4. Missing required descriptor field is rejected and writes no sidecar.
repo=$(new_repo missing-field)
desc="$repo/descriptor.json"
cat > "$desc" <<EOF
{
  "item_id": "$ITEM_ID",
  "verdict": "merge as-is",
  "body": {
    "verdict": "Merge.",
    "pre_merge_fixups": "none",
    "expected_merge_conflicts": "none",
    "followups": "none"
  }
}
EOF
if run_writer "$repo" "$desc" >/dev/null 2>"$repo/err"; then
  fail "descriptor missing test_counts was accepted"
fi
[ ! -e "$repo/backlog/pending_review/$ITEM_ID.review.md" ] || fail "missing field wrote a sidecar"
grep -q "test_counts" "$repo/err" || fail "missing-field error did not name test_counts"

# 5. Existing target rejects by default and is untouched; --replace overwrites.
repo=$(new_repo existing)
desc="$repo/descriptor.json"
descriptor "$desc" "Original verdict."
run_writer "$repo" "$desc" >/dev/null || fail "initial existing-target write failed"
sidecar="$repo/backlog/pending_review/$ITEM_ID.review.md"
before=$(cat "$sidecar")
descriptor "$desc" "Replacement verdict."
if run_writer "$repo" "$desc" >/dev/null 2>"$repo/err"; then
  fail "existing target was overwritten without --replace"
fi
[ "$(cat "$sidecar")" = "$before" ] || fail "existing target changed after rejected write"
grep -q "target already exists" "$repo/err" || fail "existing-target error did not name target"
run_writer "$repo" "$desc" --replace >/dev/null || fail "--replace did not overwrite target"
grep -q "Replacement verdict" "$sidecar" || fail "--replace did not write replacement content"
python3 "$VALIDATOR" "$sidecar" || fail "replacement sidecar failed validation"

# 6. Coupled-invariant sidecar gate passes with empty pending_review/.
repo=$(new_repo gate-empty)
install_checker_fixture "$repo"
(cd "$repo" && bash tools/review-queue/check-coupled-invariants.sh) >/dev/null || fail "gate rejected empty pending_review"

# 7. Coupled-invariant sidecar gate fails and names an invalid committed sidecar.
repo=$(new_repo gate-invalid)
install_checker_fixture "$repo"
cat > "$repo/backlog/pending_review/$ITEM_ID.review.md" <<EOF
---
item_id: $ITEM_ID
verdict: merge as-is
reviewed_at: 2026-04-30T22:30:00Z
test_counts: { passed: 1, failed: 0 }
producer: codex-child
---

## Verdict
invalid producer

## Pre-merge fixups
none

## Expected merge conflicts
none

## Follow-up items (defer, do not block merge)
none
EOF
git -C "$repo" add "backlog/pending_review/$ITEM_ID.review.md"
git -C "$repo" commit -q -m "fixture: invalid sidecar"
if (cd "$repo" && bash tools/review-queue/check-coupled-invariants.sh) >"$repo/gate.out" 2>"$repo/gate.err"; then
  fail "gate accepted invalid pending_review sidecar"
fi
grep -q "backlog/pending_review/$ITEM_ID.review.md" "$repo/gate.err" || fail "gate error did not name invalid sidecar"

assert_no_caller_pending_dirty

echo "PASS: emit-sidecar writes validated sidecars, rejects unsafe descriptors/existing targets, supports --replace, and gates live sidecars"
