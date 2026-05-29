#!/usr/bin/env bash
# test-clean-snapshot.sh — AC1 test for the shared clean-snapshot substrate
# and combine.py's live-checkout guard.
#
# Asserts (observable invariants, NOT byte-identity across the three inline
# copies — r2 codex F3):
#   - echo_enter_clean_snapshot <role> creates a detached worktree at
#     $TMPDIR/echo-<role>-<uuid> pinned to origin/main
#   - it exports $WT and ECHO_REVIEW_QUEUE_REPO_ROOT=$WT
#   - the cleanup trap discards the worktree on exit
#   - combine.py's git-mutating path REFUSES the founder live checkout
#     without --allow-live, and PROCEEDS inside a valid snapshot
#   - the STALE-ENV bypass is refused (env points at echo-* but --repo-root
#     resolves to a live-shaped checkout) — r1 codex-ops F6
#   - the 044-style temp-clone live-path invocation stays green under the
#     chosen test-compat rule (recognized as not-the-founder-live-checkout)
#
# Run from the repo root.

set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
TOOL_DIR="$ROOT/tools/review-queue"

fail() { echo "FAIL: $*" >&2; exit 1; }

# ── 1. echo_enter_clean_snapshot observable invariants ──────────────────
# Build a tiny origin + working clone so the helper's `git fetch origin main`
# and `git worktree add --detach ... origin/main` have a real remote.
ORIGIN=$(mktemp -d -t echo-cs-origin-XXXX)
git -C "$ORIGIN" init -q --bare -b main
CLONE=$(mktemp -d -t echo-cs-clone-XXXX)
git -C "$CLONE" init -q -b main
git -C "$CLONE" config user.email t@e.com
git -C "$CLONE" config user.name t
git -C "$CLONE" remote add origin "$ORIGIN"
echo seed > "$CLONE/f"
git -C "$CLONE" add f
git -C "$CLONE" commit -q -m seed
git -C "$CLONE" push -q -u origin main

# Use an isolated TMPDIR so the worktree path + GC stay sandboxed.
SANDBOX_TMP=$(mktemp -d -t echo-cs-tmp-XXXX)

REPORT=$(mktemp -t echo-cs-report-XXXX)
TMPDIR="$SANDBOX_TMP" bash -c '
  set -e
  cd "'"$CLONE"'"
  source "'"$TOOL_DIR"'/_clean-snapshot.sh"
  echo_enter_clean_snapshot myrole
  {
    echo "WT=$WT"
    echo "RQRR=$ECHO_REVIEW_QUEUE_REPO_ROOT"
    echo "HEAD=$(git rev-parse HEAD)"
    echo "DETACHED=$(git symbolic-ref -q HEAD || echo detached)"
    echo "ORIGIN_MAIN=$(git -C "'"$CLONE"'" rev-parse origin/main)"
    echo "PWD=$PWD"
    echo "EXISTS=$( [ -d "$WT" ] && echo yes || echo no )"
  } > "'"$REPORT"'"
'  # subshell exits here -> trap fires -> worktree discarded

WT=$(grep '^WT=' "$REPORT" | cut -d= -f2-)
RQRR=$(grep '^RQRR=' "$REPORT" | cut -d= -f2-)
HEAD=$(grep '^HEAD=' "$REPORT" | cut -d= -f2-)
DETACHED=$(grep '^DETACHED=' "$REPORT" | cut -d= -f2-)
ORIGIN_MAIN=$(grep '^ORIGIN_MAIN=' "$REPORT" | cut -d= -f2-)
INNER_PWD=$(grep '^PWD=' "$REPORT" | cut -d= -f2-)

[ "$DETACHED" = "detached" ] || fail "worktree HEAD not detached"
[ "$HEAD" = "$ORIGIN_MAIN" ] || fail "worktree not pinned to origin/main ($HEAD != $ORIGIN_MAIN)"
[ "$WT" = "$RQRR" ] || fail "ECHO_REVIEW_QUEUE_REPO_ROOT ($RQRR) != WT ($WT)"
[ "$INNER_PWD" = "$WT" ] || fail "helper did not cd into WT (pwd=$INNER_PWD)"
case "$WT" in
  "$SANDBOX_TMP"/echo-myrole-*) ;;
  *) fail "WT path not \$TMPDIR/echo-<role>-<uuid> (got $WT)" ;;
esac
# trap-discards-on-exit: the worktree dir must be gone after the subshell.
[ ! -d "$WT" ] || fail "cleanup trap did not discard the worktree ($WT still exists)"

rm -f "$REPORT"
rm -rf "$ORIGIN" "$CLONE" "$SANDBOX_TMP"

# ── 2. combine.py guard: refuse founder live checkout, proceed in snapshot,
#       refuse stale-env bypass. Exercise the predicate functions directly
#       (monkeypatching _founder_live_checkout to a controlled path) so the
#       test does not need to write into ~/Desktop/Project_echo. ──────────
python3 - "$TOOL_DIR" <<'PY'
import os, subprocess, sys, tempfile, uuid, importlib.util
from pathlib import Path

tool_dir = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location("combine", tool_dir / "combine.py")
combine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(combine)

def git(cwd, *args):
    subprocess.run(["git", "-C", str(cwd), *args], check=True,
                   capture_output=True, text=True)

failures = []

def expect(cond, msg):
    if not cond:
        failures.append(msg)

with tempfile.TemporaryDirectory() as td:
    td = Path(td).resolve()

    # (a) "founder live checkout" stand-in: a plain repo.
    live = td / "live"
    live.mkdir()
    git(live, "init", "-q", "-b", "main")
    git(live, "config", "user.email", "t@e.com")
    git(live, "config", "user.name", "t")
    (live / "f").write_text("x")
    git(live, "add", "f")
    git(live, "commit", "-q", "-m", "seed")

    # Monkeypatch the live-checkout target onto our stand-in.
    combine._founder_live_checkout = lambda: live.resolve()

    # (a) refuse the live checkout without --allow-live.
    os.environ.pop("ECHO_REVIEW_QUEUE_REPO_ROOT", None)
    os.environ.pop("TMPDIR", None)
    try:
        combine.assert_git_mutation_target_safe(live, allow_live=False)
        expect(False, "(a) guard did NOT refuse the founder live checkout")
    except SystemExit:
        pass

    # (a') --allow-live overrides the refusal.
    try:
        combine.assert_git_mutation_target_safe(live, allow_live=True)
    except SystemExit:
        expect(False, "(a') --allow-live did not override the refusal")

    # (b) a valid echo-<role>-<uuid> snapshot proceeds. Build a registered
    #     worktree off the live repo inside a controlled TMPDIR.
    sbtmp = td / "tmp"
    sbtmp.mkdir()
    os.environ["TMPDIR"] = str(sbtmp)
    snap = sbtmp / f"echo-myrole-{uuid.uuid4()}"
    git(live, "worktree", "add", "--detach", str(snap), "HEAD")
    os.environ["ECHO_REVIEW_QUEUE_REPO_ROOT"] = str(snap)
    expect(combine._is_valid_clean_snapshot(snap),
           "(b) a valid snapshot was not recognized as clean")
    # Guard must NOT refuse a non-live snapshot target.
    try:
        combine.assert_git_mutation_target_safe(snap, allow_live=False)
    except SystemExit:
        expect(False, "(b) guard wrongly refused a valid snapshot")

    # (c) STALE-ENV bypass: env points at an echo-* path but --repo-root
    #     resolves to the live checkout. Must be refused (r1 codex-ops F6).
    os.environ["ECHO_REVIEW_QUEUE_REPO_ROOT"] = str(snap)  # stale, points elsewhere
    expect(not combine._is_valid_clean_snapshot(live),
           "(c) stale-env bypass: live checkout wrongly accepted as snapshot")
    try:
        combine.assert_git_mutation_target_safe(live, allow_live=False)
        expect(False, "(c) stale-env bypass was NOT refused")
    except SystemExit:
        pass

    # (d) 044-style temp clone (NOT under ~/Desktop/Project_echo, NOT a
    #     registered echo-* snapshot) is recognized as not-the-founder-live
    #     and proceeds WITHOUT --allow-live under the chosen test-compat rule.
    clone = td / "echo-rq-044-clone-xyz"
    clone.mkdir()
    git(clone, "init", "-q", "-b", "main")
    git(clone, "config", "user.email", "t@e.com")
    git(clone, "config", "user.name", "t")
    (clone / "f").write_text("y")
    git(clone, "add", "f")
    git(clone, "commit", "-q", "-m", "seed")
    try:
        combine.assert_git_mutation_target_safe(clone, allow_live=False)
    except SystemExit:
        expect(False, "(d) 044-style temp clone was wrongly refused")

    git(live, "worktree", "remove", "--force", str(snap))

if failures:
    for m in failures:
        print("FAIL:", m, file=sys.stderr)
    sys.exit(1)
print("combine.py guard checks OK")
PY
GUARD_RC=$?
[ "$GUARD_RC" -eq 0 ] || fail "combine.py guard checks failed"

echo "PASS: clean-snapshot observable invariants + trap discard + combine.py live-checkout guard (refuse live / proceed in snapshot / refuse stale-env / 044 temp-clone green)"
