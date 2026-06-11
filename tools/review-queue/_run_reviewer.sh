#!/usr/bin/env bash
# _run_reviewer.sh — generic headless reviewer tick wrapper (043 AC3 + 050 + 056 AC5).
#
# Reads REVIEWER_NAME env var; expects a matching reviewers.json entry with
# mode:headless. Fails fast with a clear diagnostic if REVIEWER_NAME is unset,
# unknown, or refers to an IDE-mode reviewer.
#
# Working repo is selected via ${ECHO_REVIEW_QUEUE_REPO_ROOT}; default is the
# founder's production repo. Single source of truth for the launchd-tick
# wrapper body — per-vendor scripts (run-codex-reviewer.sh,
# run-codex-ops-reviewer.sh, run-claude-reviewer.sh) are 5-line drivers
# that `exec env REVIEWER_NAME=<slug> ${this_script}`.
#
# 050 worktree-isolation (architectural invariant): the wrapper does NOT
# launch the child CLI inside the founder's live main checkout. Each tick
# creates an ephemeral, detached-HEAD worktree at
# $TMPDIR/echo-<reviewer>-<uuid>, routes the child via CWD + env +
# prompt-path + the vendor's own pinning flag, and discards the worktree
# on unified ERR/EXIT cleanup. The live main .git/index is never written
# to by an automated reviewer tick.
#
# 087 reviewer-invocation argv contract: each headless reviewer resolves an
# argv vector from reviewer-bindings.json, and the prompt path is redirected
# onto stdin via the binding's stdin_from field. No bash -c shell-string path
# is used for child dispatch.

set -euo pipefail

: "${REVIEWER_NAME:?REVIEWER_NAME env var required}"
if [[ ! "$REVIEWER_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "invalid REVIEWER_NAME for dogfooding journal shard: '$REVIEWER_NAME' (expected ^[a-z][a-z0-9-]*$)" >&2
  exit 1
fi

REPO_ROOT="${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"

if ! cd "$REPO_ROOT" 2>/dev/null; then
  echo "ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a directory: '${ECHO_REVIEW_QUEUE_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a git repo: '${ECHO_REVIEW_QUEUE_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi

TOOL_DIR="$(cd "$(dirname "$0")" && pwd)"
export PYTHONPATH="$TOOL_DIR:${PYTHONPATH:-}"
source "$TOOL_DIR/_effect-runner.sh"

# PATH augmentation — launchd's environment is stripped down; codex (and
# common dependencies it shells out to, including the python3 with
# jsonschema installed) live in user-local bin directories under Homebrew
# or asdf/nodenv. Cover the common locations. MUST come BEFORE any
# python3 invocation — under bare launchd PATH=/usr/bin:/bin:..., python3
# resolves to /usr/bin/python3 (Xcode 3.9, no site-packages) and the gate
# fails with ModuleNotFoundError: jsonschema. Surfaced 2026-05-14 when
# 048 R1 codex review tick silently failed every 10min for ~2h.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.nodenv/shims:$HOME/.asdf/shims:$HOME/bin:$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Validate REVIEWER_NAME exists in reviewers.json with mode=headless. The
# invocation binding itself is resolved after the isolated worktree exists so
# binding failures can be recorded through queue_error.sh before cleanup.
python3 "$TOOL_DIR/_reviewer_gate.py" >/dev/null || exit $?

LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/echo-review-queue-${REVIEWER_NAME}.log"
mkdir -p "$LOG_DIR"

# Rotate at 10MB (10485760 bytes) — keep one .1 sidecar, drop older.
if [ -f "$LOG_FILE" ]; then
  size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "${size:-0}" -gt 10485760 ]; then
    mv -f "$LOG_FILE" "$LOG_FILE.1"
  fi
fi

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick start REVIEWER=$REVIEWER_NAME ECHO_REVIEW_QUEUE_REPO_ROOT=$REPO_ROOT"

  # ── 057b AC7 Phase 1 — scheduler health (bootstrap-scoped) ─────────────
  # Emit coord:scheduler_health at log-redirect-open. This opens a SHORT
  # bootstrap-window deadline (default 120s / max 300s per 057a's
  # coord-roles.json) that covers ONLY the worktree-creation, env-setup,
  # prompt-routing, codex-argv-assembly window. After that finishes (just
  # before INVOKE_CMD runs), Phase 1 emits scheduler_health_done to close
  # the deadline. Round-tier tick_start/tick_end takes over from there.
  # The split (r3 codex-ops F2 MED) prevents long real reviews from
  # firing false coord:deadline_missed alerts on the scheduler tier.
  TICK_RUN_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/coord-emit.sh" scheduler_health \
    --tick-run-id="$TICK_RUN_ID" || true

  # ── 050 AC1: enter a clean detached-HEAD snapshot. The shared helper
  # preserves the observable invariants from the former inline block:
  # pre-flight hygiene, origin/main fetch, $TMPDIR/echo-<reviewer>-<uuid>
  # worktree, WT + ECHO_REVIEW_QUEUE_REPO_ROOT exports, and unified cleanup.
  source "$TOOL_DIR/_clean-snapshot.sh"
  echo_enter_clean_snapshot "$REVIEWER_NAME"
  TOOL_DIR="$WT/tools/review-queue"
  export PYTHONPATH="$TOOL_DIR:${PYTHONPATH:-}"
  source "$TOOL_DIR/_effect-runner.sh"

  # Route the child CLI into $WT via the binding-owned argv + stdin model.
  # CWD/env still land the prompt body's repository operations in the
  # worktree; the binding supplies both argv (including any vendor-specific
  # worktree flag such as `-C`) and the prompt path redirected onto stdin.
  set +e
  STDIN_FROM=$(env WT="$WT" REVIEWER_NAME="$REVIEWER_NAME" \
    python3 "$TOOL_DIR/_reviewer_gate.py" --print stdin_from 2>/tmp/echo-rq-stdin-gate-err.$$)
  stdin_gate_rc=$?
  stdin_gate_err=$(cat /tmp/echo-rq-stdin-gate-err.$$ 2>/dev/null || true)
  rm -f /tmp/echo-rq-stdin-gate-err.$$
  set -e
  if [ "$stdin_gate_rc" -ne 0 ] || [ -z "$STDIN_FROM" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: stdin_from resolution failed: $stdin_gate_err" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "stdin_from_unresolved" "${stdin_gate_err:-no diagnostic from gate}" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record stdin_from_unresolved" >&2
    exit 1
  fi

  if [ ! -f "$STDIN_FROM" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: prompt missing at $STDIN_FROM" >&2
    # Pre-spawn failure: log + push a queue-error row through the durable
    # helper BEFORE the cleanup trap removes $WT. See 056 AC5 part 4.
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "prompt_missing" "expected prompt at $STDIN_FROM" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record prompt_missing" >&2
    exit 1
  fi

  # Resolve argv through a temp file so the Python gate's exit status is
  # observed before Bash reads the NUL-delimited vector. Do not use process
  # substitution here: a failed producer can leave `read` with an empty argv
  # and a zero wrapper status under set -e.
  argv_file="$(mktemp "${TMPDIR:-/tmp}/echo-rq-argv.XXXXXX")"
  argv_err_file="$(mktemp "${TMPDIR:-/tmp}/echo-rq-argv-err.XXXXXX")"
  set +e
  env WT="$WT" REVIEWER_NAME="$REVIEWER_NAME" \
    python3 "$TOOL_DIR/_reviewer_gate.py" --print argv_nul > "$argv_file" 2>"$argv_err_file"
  gate_rc=$?
  gate_err=$(cat "$argv_err_file" 2>/dev/null || true)
  set -e
  if [ "$gate_rc" -ne 0 ] || [ ! -s "$argv_file" ]; then
    rm -f "$argv_file" "$argv_err_file"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: argv resolution failed: $gate_err" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "argv_unresolved" "${gate_err:-no diagnostic from gate}" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record argv_unresolved" >&2
    exit 1
  fi
  INVOKE_ARGV=()
  while IFS= read -r -d '' arg; do
    INVOKE_ARGV+=("$arg")
  done < "$argv_file"
  rm -f "$argv_file" "$argv_err_file"
  if [ "${#INVOKE_ARGV[@]}" -eq 0 ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: argv resolution returned empty argv" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "argv_unresolved" "empty argv from gate" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record argv_unresolved" >&2
    exit 1
  fi

  # Verify the resolved CLI executable is on PATH before spawning. The first
  # argv element is the executable name; if `command -v` can't resolve it,
  # we'd otherwise get an opaque "command not found" from the child.
  EXE_NAME="${INVOKE_ARGV[0]}"
  if [ "${ECHO_EFFECT_MODE:-live}" = "live" ] && ! command -v "$EXE_NAME" >/dev/null 2>&1; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: executable not on PATH: $EXE_NAME" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "executable_not_found" "$EXE_NAME not on PATH" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record executable_not_found" >&2
    exit 1
  fi

  set +e
  COMMIT_POLICY=$(env WT="$WT" REVIEWER_NAME="$REVIEWER_NAME" \
    python3 "$TOOL_DIR/_reviewer_gate.py" --print commit_policy 2>/tmp/echo-rq-policy-gate-err.$$)
  policy_gate_rc=$?
  policy_gate_err=$(cat /tmp/echo-rq-policy-gate-err.$$ 2>/dev/null || true)
  rm -f /tmp/echo-rq-policy-gate-err.$$
  set -e
  if [ "$policy_gate_rc" -ne 0 ] || [ -z "$COMMIT_POLICY" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: commit_policy resolution failed: $policy_gate_err" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "commit_policy_unresolved" "${policy_gate_err:-no diagnostic from gate}" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record commit_policy_unresolved" >&2
    exit 1
  fi

  emit_scheduler_done() {
    if [ "${SCHEDULER_DONE_EMITTED:-0}" -eq 0 ]; then
      export TICK_RUN_ID
      REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/coord-emit.sh" scheduler_health_done \
        --tick-run-id="$TICK_RUN_ID" || true
      SCHEDULER_DONE_EMITTED=1
    fi
  }

  emit_tick_start() {
    local corr="${1:-}"
    if [ -n "$corr" ]; then
      REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/coord-emit.sh" tick_start \
        --correlation-id="$corr" || true
    fi
  }

  emit_tick_end() {
    local corr="${1:-}"
    local outcome="${2:-completed}"
    if [ -n "$corr" ]; then
      REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/coord-emit.sh" tick_end \
        --correlation-id="$corr" \
        --payload="{\"outcome\":\"$outcome\"}" || true
    fi
  }

  state_get() {
    python3 - "$WRAPPER_STATE_FILE" "$1" <<'PY'
import json
import sys

state = json.load(open(sys.argv[1], encoding="utf-8"))
value = state.get(sys.argv[2], "")
if value is None:
    value = ""
print(value)
PY
  }

  binding_capture_get() {
    python3 - "$TOOL_DIR/reviewer-bindings.json" "$REVIEWER_NAME" "$1" <<'PY'
import json
import sys

cfg = json.load(open(sys.argv[1], encoding="utf-8"))
reviewer = sys.argv[2]
field = sys.argv[3]
for entry in cfg.get("bindings", []):
    if entry.get("reviewer") == reviewer:
        capture = entry.get("capture") or {}
        print(capture.get(field, ""))
        raise SystemExit(0)
raise SystemExit(1)
PY
  }

  resolve_capture_path() {
    local template="$1"
    python3 - "$template" "$WT" "$REVIEWER_NAME" "$TICK_RUN_ID" "$ITEM_ID" "$ROUND_LABEL" <<'PY'
from pathlib import Path
import sys

template, wt, reviewer, run_id, item, round_label = sys.argv[1:7]
value = (
    template
    .replace("{{REVIEWER}}", reviewer)
    .replace("{{RUN_ID}}", run_id)
    .replace("{{ITEM}}", item)
    .replace("{{ROUND}}", round_label)
)
path = Path(value)
if not path.is_absolute():
    path = Path(wt) / path
print(path)
PY
  }

  bounded_snippet() {
    local file="$1"
    if [ -f "$file" ]; then
      python3 - "$file" <<'PY'
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
text = " ".join(text.split())
print(text[:500])
PY
    fi
  }

  first_line() {
    python3 - "$1" <<'PY'
import sys

text = sys.argv[1]
print((text.splitlines() or [""])[0])
PY
  }

  one_line_snippet() {
    python3 - "$1" <<'PY'
import sys

text = " ".join(sys.argv[1].split())
print(text[:500])
PY
  }

  # Detached tick worktrees are deleted on EXIT. Keep the terminal skip
  # signal in the anchoring repo's git dir so selection can suppress a failed
  # round even when the committed marker push never reaches origin/main.
  capture_failure_state_file() {
    if [ -n "${ECHO_CAPTURE_FAILURE_STATE_FILE:-}" ]; then
      printf '%s\n' "$ECHO_CAPTURE_FAILURE_STATE_FILE"
      return 0
    fi

    local anchor="${ECHO_CLEAN_SNAPSHOT_REPO_ROOT:-$REPO_ROOT}"
    local git_dir
    git_dir="$(git -C "$anchor" rev-parse --git-common-dir 2>/dev/null || true)"
    if [ -n "$git_dir" ]; then
      case "$git_dir" in
        /*) ;;
        *) git_dir="$anchor/$git_dir" ;;
      esac
      printf '%s\n' "$git_dir/echo-review-queue/capture-failures.jsonl"
      return 0
    fi

    printf '%s\n' "$HOME/.echo/review-queue/capture-failures.jsonl"
  }

  CAPTURE_FAILURE_STATE_FILE="$(capture_failure_state_file)"
  export CAPTURE_FAILURE_STATE_FILE

  record_local_capture_failure() {
    local failure_class="$1"
    local diagnostic="$2"
    local iso_ts="$3"
    mkdir -p "$(dirname "$CAPTURE_FAILURE_STATE_FILE")"
    python3 - "$CAPTURE_FAILURE_STATE_FILE" "$REVIEWER_NAME" "$ITEM_ID" "$ROUND_NUM" "$SPEC_COMMIT_SHA" "$ARTIFACT_PATH" "$failure_class" "$CHILD_RC" "$iso_ts" "$diagnostic" <<'PY'
from __future__ import annotations

from pathlib import Path
import json
import sys

(
    state_path_raw,
    reviewer,
    item_id,
    round_num,
    spec_commit_sha,
    artifact_path,
    failure_class,
    child_rc,
    failed_at,
    diagnostic,
) = sys.argv[1:11]

state_path = Path(state_path_raw)
key = {
    "reviewer": reviewer,
    "item_id": item_id,
    "round": str(round_num),
    "spec_commit_sha": spec_commit_sha,
    "artifact_path": artifact_path,
}
record = {
    **key,
    "failed_at": failed_at,
    "failure_class": failure_class,
    "rc": child_rc,
    "diagnostic": diagnostic,
}

if state_path.exists():
    for line in state_path.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            existing = json.loads(line)
        except json.JSONDecodeError:
            continue
        if all(str(existing.get(k, "")) == v for k, v in key.items()):
            raise SystemExit(0)

with state_path.open("a", encoding="utf-8") as f:
    f.write(json.dumps(record, sort_keys=True) + "\n")
PY
  }

  record_capture_failure() {
    local failure_class="$1"
    local diagnostic="$2"
    diagnostic="$(one_line_snippet "$diagnostic")"
    local marker_path="$ROUND_DIR/$REVIEWER_NAME.capture-failed"
    local errors_file="$WT/raw/internal/queue-errors.md"
    local iso_ts
    iso_ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    mkdir -p "$ROUND_DIR" "$(dirname "$errors_file")"
    cat > "$marker_path" <<EOF
---
item_id: "$ITEM_ID"
round: $ROUND_NUM
reviewer: "$REVIEWER_NAME"
failed_at: "$iso_ts"
failure_class: "$failure_class"
rc: $CHILD_RC
---

$diagnostic
EOF
    printf '%s CAPTURE-FAIL: reviewer=%s failure=%s rc=%s spec=%s@%s marker=%s diagnostic=%s\n' \
      "$iso_ts" "$REVIEWER_NAME" "$failure_class" "$CHILD_RC" "$ARTIFACT_PATH" "$SPEC_COMMIT_SHA" "$marker_path" "$diagnostic" \
      >> "$errors_file"
    record_local_capture_failure "$failure_class" "$diagnostic" "$iso_ts" || return $?
    echo "[$iso_ts] recording capture failure reviewer=$REVIEWER_NAME failure=$failure_class marker=$marker_path"
    git add "$marker_path" "$errors_file" || return $?
    if ! git diff --cached --quiet; then
      git commit -m "capture-failed: $REVIEWER_NAME r$ROUND_NUM on $ITEM_ID" || return $?
      "$TOOL_DIR/push-with-retry.sh" "capture-failed: $REVIEWER_NAME r$ROUND_NUM on $ITEM_ID" || return $?
    fi
  }

  finish_capture_failure() {
    local exit_rc="$1"
    local failure_class="$2"
    local diagnostic="$3"
    local record_rc
    set +e
    record_capture_failure "$failure_class" "$diagnostic"
    record_rc=$?
    set -e
    if [ "$record_rc" -ne 0 ]; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] capture failure record/push failed rc=$record_rc; closing coord lifecycle anyway" >&2
    fi
    emit_tick_end "$CORRELATION_ID" "terminal_capture_failure"
    if [ "$record_rc" -ne 0 ]; then
      exit "$record_rc"
    fi
    exit "$exit_rc"
  }

  validate_request_binding() {
    local response_path="$1"
    PYTHONDONTWRITEBYTECODE=1 python3 - "$response_path" "$REVIEWER_NAME" "$ITEM_ID" "$ROUND_NUM" "$SPEC_COMMIT_SHA" <<'PY'
from pathlib import Path
import re
import sys
import yaml

path = Path(sys.argv[1])
expected_reviewer = sys.argv[2]
expected_item = sys.argv[3]
expected_round = sys.argv[4]
expected_sha = sys.argv[5]

# Use the same robust parse as the schema-validation path. A bare
# text.split("---", 2) truncates the frontmatter when a string VALUE contains
# a `---` token, then crashes yaml.safe_load with an unhandled traceback
# (observed on the 099 spec-review tick — whose subject IS `---` sidecar
# frontmatter). Any parse failure here must surface as a clean
# binding-mismatch diagnostic, never a traceback.
#
# The regex is inlined (keep in sync with _lib.FRONTMATTER_RE) rather than
# `import _lib`: _lib imports jsonschema at module level, and its darwin
# arch-retry re-execs `python3 -` with stdin already consumed — under a
# non-arm64 parent process that turns an ImportError into a silent exit-0,
# which here would mean the binding gate FAILS OPEN (a mismatched response
# would be published without any check running).
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
try:
    m = FRONTMATTER_RE.match(path.read_text(encoding="utf-8"))
    if not m:
        raise ValueError(f"{path}: no frontmatter block found")
    fm = yaml.safe_load(m.group(1)) or {}
    if not isinstance(fm, dict):
        raise ValueError(f"{path}: frontmatter is not a mapping")
except (ValueError, yaml.YAMLError) as exc:
    print(f"request binding mismatch: {exc}", file=sys.stderr)
    raise SystemExit(1)

checks = {
    "reviewer": expected_reviewer,
    "item_id": expected_item,
    "round": expected_round,
    "artifact_sha": expected_sha,
}
mismatches = []
for key, expected in checks.items():
    actual = fm.get(key)
    actual_s = "" if actual is None else str(actual)
    if actual_s != expected:
        mismatches.append(f"{key}={actual_s!r} expected {expected!r}")

if mismatches:
    print("request binding mismatch: " + "; ".join(mismatches), file=sys.stderr)
    raise SystemExit(1)
PY
  }

  append_wrapper_journal() {
    local response_path="$1"
    local head_sha="$2"
    local month
    local journal
    local local_ts
    month="$(TZ=America/Los_Angeles date +%Y-%m)"
    journal="$WT/raw/internal/dogfooding/mcp-interactions-journal-$month-$REVIEWER_NAME.md"
    local_ts="$(TZ=America/Los_Angeles date '+%Y-%m-%d %H:%M %Z')"
    mkdir -p "$(dirname "$journal")"
    if [ ! -f "$journal" ]; then
      cat > "$journal" <<EOF
# ECHO MCP interactions journal - $month - $REVIEWER_NAME shard

This is the $month per-actor shard for $REVIEWER_NAME. Entries land here when this actor invokes or reports ECHO MCP activity. Read the journal through tools/dogfooding/journal-cat.sh $month so this shard is merged with sibling actor shards and any frozen legacy shared file.

**Timezone convention:** all times in this journal are founder local time (PDT/PST, America/Los_Angeles) unless explicitly noted. Source data stores ISO 8601 UTC; entries here are converted on write.

## Quick-Fill Template

    ### YYYY-MM-DD HH:MM PDT - <one-line context>

    - **Trigger:** <why the tool was called>
    - **Query inputs:** <tool(args), one line or compact numbered list>
    - **Returned:** <N clusters/M atoms, N matches, N turns, warnings, top label/rank reasons>
    - **Sources:** <source_breakdown | source_resolved | per-match prefixes | exact paths>
    - **Verdict:** <right | partial | wrong> - <short reason>
    - **Note:** <what felt useful/off>
    - **Conjecture:** <optional>

## Interactions
EOF
    fi
    cat >> "$journal" <<EOF

### $local_ts - $REVIEWER_NAME r$ROUND_NUM review tick on $ITEM_ID

- **Trigger:** Wrapper-owned read-only reviewer tick selected \`$REQUEST_PATH\` and published \`$response_path\`.
- **Query inputs:** Coord calls emitted by \`_run_reviewer.sh\`: \`scheduler_health\`, \`scheduler_health_done\`, \`tick_start(correlation_id=$CORRELATION_ID)\`, \`tick_end(outcome=completed)\`. Child invocation used \`commit_policy=wrapper\`, \`capture.kind=stdout_json\`, and \`agent_sandbox=read-only\`.
- **Returned:** Parsed the final assistant-message event from \`$CAPTURE_STDOUT\`, validated the reviewer markdown, committed and pushed \`$response_path\` at \`$head_sha\`.
- **Sources:** request \`$REQUEST_PATH\`; artifact \`$ARTIFACT_PATH@$SPEC_COMMIT_SHA\`; response \`$response_path\`; raw diagnostics \`$CAPTURE_STDOUT\` / \`$CAPTURE_STDERR\`; binding \`tools/review-queue/reviewer-bindings.json\`.
- **Verdict:** right - wrapper-owned publication succeeded; the read-only child did not write the canonical response file.
- **Note:** Raw stdout/stderr are diagnostics only; the committed sidecar came from the parsed final assistant message and the wrapper-owned validation helper.
EOF
    git add "$journal"
    if ! git diff --cached --quiet; then
      git commit -m "journal: $REVIEWER_NAME r$ROUND_NUM review tick on $ITEM_ID"
      "$TOOL_DIR/push-with-retry.sh" "journal: $REVIEWER_NAME r$ROUND_NUM review tick on $ITEM_ID"
    fi
  }

  # ── 057b AC7 Phase 1 — scheduler health DONE ───────────────────────────
  # Bootstrap is complete (worktree created, env routed, prompt resolved,
  # CLI argv built, executable verified). Close scheduler health before
  # either the legacy child-owned path or the wrapper-owned publisher path.
  SCHEDULER_DONE_EMITTED=0
  emit_scheduler_done

  if [ "$COMMIT_POLICY" != "wrapper" ]; then
    {
      printf '[%s] dispatching:' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      printf ' %q' "${INVOKE_ARGV[@]}"
      printf ' < %q\n' "$STDIN_FROM"
    }
    if echo_effect codex-exec -- "${INVOKE_ARGV[@]}" < "$STDIN_FROM"; then
      rc=0
    else
      rc=$?
    fi
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick end rc=$rc"
    exit "$rc"
  fi

  WRAPPER_STATE_FILE="$(mktemp "${TMPDIR:-/tmp}/echo-rq-state.XXXXXX")"
  set +e
  env REVIEWER_NAME="$REVIEWER_NAME" \
    ECHO_COORD_REQUEST_PATH="${ECHO_COORD_REQUEST_PATH:-}" \
    ECHO_COORD_CORRELATION_ID="${ECHO_COORD_CORRELATION_ID:-}" \
    CAPTURE_FAILURE_STATE_FILE="$CAPTURE_FAILURE_STATE_FILE" \
    python3 - "$WRAPPER_STATE_FILE" <<'PY'
from pathlib import Path
import glob
import json
import os
import re
import sys
import yaml

out_path = Path(sys.argv[1])
reviewer = os.environ["REVIEWER_NAME"]
pinned = os.environ.get("ECHO_COORD_REQUEST_PATH") or ""
env_corr = os.environ.get("ECHO_COORD_CORRELATION_ID") or ""
capture_failure_state_file = os.environ.get("CAPTURE_FAILURE_STATE_FILE") or ""


# Keep in sync with _lib.FRONTMATTER_RE. Line-anchored: only delimiter
# LINES terminate the frontmatter, so a `---` token inside a string value
# (e.g. a focus_hints entry quoting frontmatter) parses correctly.
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def read_fm(path: Path):
    # Same robust mechanism as validate_request_binding/_lib.parse_frontmatter:
    # a naive text.split("---", 2) truncates the frontmatter when a string
    # VALUE contains a `---` token, the YAML parse raises, and the scan
    # loop's except-continue then skips the round silently — for every
    # wrapper reviewer, forever. The regex is inlined (not `import _lib`)
    # deliberately: _lib imports jsonschema at module level, and its
    # darwin arch-retry re-execs `python3 -` with stdin already consumed,
    # turning an ImportError into a silent exit-0 with no selection state
    # written — the same silent-failure class this parser fix removes.
    text = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError(f"{path}: no frontmatter block found")
    fm = yaml.safe_load(m.group(1)) or {}
    if not isinstance(fm, dict):
        raise ValueError(f"{path}: frontmatter must be a mapping")
    return fm


def write(status: str, **kwargs):
    payload = {"status": status, **kwargs}
    out_path.write_text(json.dumps(payload, sort_keys=True), encoding="utf-8")


def selected(req: Path, fm: dict):
    round_dir = req.parent
    round_value = str(fm.get("round", ""))
    round_label = f"r{round_value}"
    write(
        "selected",
        request_path=str(req),
        round_dir=str(round_dir),
        response_path=str(round_dir / f"{reviewer}.md"),
        marker_path=str(round_dir / f"{reviewer}.capture-failed"),
        item_id=str(fm.get("item_id", "")),
        round=str(round_value),
        round_label=round_label,
        spec_commit_sha=str(fm.get("spec_commit_sha", "")),
        artifact_path=str(fm.get("artifact_path", "")),
        correlation_id=str(fm.get("correlation_id") or env_corr),
    )


def local_capture_failure_recorded(fm: dict) -> bool:
    if not capture_failure_state_file:
        return False
    state_path = Path(capture_failure_state_file)
    if not state_path.is_file():
        return False
    key = {
        "reviewer": reviewer,
        "item_id": str(fm.get("item_id", "")),
        "round": str(fm.get("round", "")),
        "spec_commit_sha": str(fm.get("spec_commit_sha", "")),
        "artifact_path": str(fm.get("artifact_path", "")),
    }
    try:
        lines = state_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return False
    for line in lines:
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if all(str(record.get(k, "")) == v for k, v in key.items()):
            return True
    return False


def validate_req(req: Path, *, pinned_mode: bool):
    if not req.is_file():
        write("bind_failed", reason="request_not_found", correlation_id=env_corr)
        return
    fm = read_fm(req)
    corr = str(fm.get("correlation_id") or env_corr)
    if pinned_mode and env_corr and fm.get("correlation_id") != env_corr:
        write("bind_failed", reason="correlation_id_mismatch", correlation_id=corr)
        return
    requested = fm.get("requested_reviewers") or []
    if reviewer not in requested:
        write("bind_failed", reason="role_not_in_roster", correlation_id=corr)
        return
    round_dir = req.parent
    if (round_dir / "combined.md").exists():
        write("stale_combined", correlation_id=corr)
        return
    if (round_dir / f"{reviewer}.md").exists():
        write("duplicate_response", correlation_id=corr)
        return
    if (round_dir / f"{reviewer}.capture-failed").exists() or local_capture_failure_recorded(fm):
        write("capture_failed", correlation_id=corr)
        return
    selected(req, fm)


if pinned:
    validate_req(Path(pinned), pinned_mode=True)
else:
    for raw in sorted(glob.glob("backlog/reviews/*/r*/request.md")):
        req = Path(raw)
        try:
            fm = read_fm(req)
        except Exception:
            continue
        requested = fm.get("requested_reviewers") or []
        round_dir = req.parent
        if reviewer not in requested:
            continue
        if (round_dir / f"{reviewer}.md").exists():
            continue
        if (round_dir / "combined.md").exists():
            continue
        if (round_dir / f"{reviewer}.capture-failed").exists() or local_capture_failure_recorded(fm):
            continue
        selected(req, fm)
        break
    else:
        write("no_candidate")
PY
  select_rc=$?
  set -e
  if [ "$select_rc" -ne 0 ] || [ ! -s "$WRAPPER_STATE_FILE" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: wrapper selection failed" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "selection_failed" "wrapper request selection failed" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record selection_failed" >&2
    exit 1
  fi

  SELECTION_STATUS="$(state_get status)"
  CORRELATION_ID="$(state_get correlation_id)"
  case "$SELECTION_STATUS" in
    no_candidate)
      echo "tick: no $REVIEWER_NAME reviews to write" >&2
      exit 0
      ;;
    bind_failed)
      emit_tick_start "$CORRELATION_ID"
      emit_tick_end "$CORRELATION_ID" "bind_failed"
      echo "tick: pinned-request bind failed: $(state_get reason)" >&2
      exit 1
      ;;
    stale_combined)
      emit_tick_start "$CORRELATION_ID"
      emit_tick_end "$CORRELATION_ID" "stale_combined"
      echo "tick: combined.md already exists for selected $REVIEWER_NAME request" >&2
      exit 0
      ;;
    duplicate_response)
      emit_tick_start "$CORRELATION_ID"
      emit_tick_end "$CORRELATION_ID" "duplicate_response"
      echo "tick: $REVIEWER_NAME.md already exists for selected request" >&2
      exit 0
      ;;
    capture_failed)
      emit_tick_start "$CORRELATION_ID"
      emit_tick_end "$CORRELATION_ID" "terminal_capture_failure"
      echo "tick: prior $REVIEWER_NAME capture failure marker exists; skipping" >&2
      exit 0
      ;;
    selected) ;;
    *)
      echo "tick: unknown wrapper selection status: $SELECTION_STATUS" >&2
      exit 1
      ;;
  esac

  REQUEST_PATH="$(state_get request_path)"
  ROUND_DIR="$(state_get round_dir)"
  RESPONSE_PATH="$(state_get response_path)"
  ITEM_ID="$(state_get item_id)"
  ROUND_NUM="$(state_get round)"
  ROUND_LABEL="$(state_get round_label)"
  SPEC_COMMIT_SHA="$(state_get spec_commit_sha)"
  ARTIFACT_PATH="$(state_get artifact_path)"

  emit_tick_start "$CORRELATION_ID"

  if [ -z "$ITEM_ID" ] || [ -z "$ROUND_NUM" ] || [ -z "$SPEC_COMMIT_SHA" ] || [ -z "$ARTIFACT_PATH" ]; then
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "request_metadata_missing" "selected request missing item_id/round/spec_commit_sha/artifact_path" \
      "$ARTIFACT_PATH" "$SPEC_COMMIT_SHA" || true
    emit_tick_end "$CORRELATION_ID" "validation_failure"
    exit 1
  fi

  CAPTURE_KIND="$(binding_capture_get kind)"
  if [ "$CAPTURE_KIND" != "stdout_json" ]; then
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "capture_kind_unsupported" "wrapper commit_policy requires capture.kind=stdout_json, got ${CAPTURE_KIND:-<empty>}" \
      "$ARTIFACT_PATH" "$SPEC_COMMIT_SHA" || true
    emit_tick_end "$CORRELATION_ID" "validation_failure"
    exit 1
  fi

  CAPTURE_STDOUT="$(resolve_capture_path "$(binding_capture_get stdout_path)")"
  CAPTURE_STDERR="$(resolve_capture_path "$(binding_capture_get stderr_path)")"
  CAPTURE_RC_PATH="$(resolve_capture_path "$(binding_capture_get rc_path)")"
  CAPTURE_FINAL="$(resolve_capture_path "$(binding_capture_get final_message_path)")"
  mkdir -p "$(dirname "$CAPTURE_STDOUT")" "$(dirname "$CAPTURE_STDERR")" "$(dirname "$CAPTURE_RC_PATH")" "$(dirname "$CAPTURE_FINAL")"

  PACKET_DIR="$WT/raw/internal/review-queue/$TICK_RUN_ID"
  mkdir -p "$PACKET_DIR"
  ARTIFACT_SNAPSHOT="$PACKET_DIR/artifact.md"
  PACKET_PATH="$PACKET_DIR/review-packet.md"
  if ! git show "$SPEC_COMMIT_SHA:$ARTIFACT_PATH" > "$ARTIFACT_SNAPSHOT"; then
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "spec_sha_unreachable" "git show $SPEC_COMMIT_SHA:$ARTIFACT_PATH failed" \
      "$ARTIFACT_PATH" "$SPEC_COMMIT_SHA" || true
    emit_tick_end "$CORRELATION_ID" "validation_failure"
    exit 1
  fi

  python3 - "$REQUEST_PATH" "$ARTIFACT_SNAPSHOT" "$PACKET_PATH" "$REVIEWER_NAME" <<'PY'
from pathlib import Path
import sys

request_path = Path(sys.argv[1])
artifact_path = Path(sys.argv[2])
packet_path = Path(sys.argv[3])
reviewer = sys.argv[4]
packet_path.write_text(
    "\n".join(
        [
            "# Wrapper-Owned Review Packet",
            "",
            f"Reviewer: {reviewer}",
            f"Request path: {request_path}",
            "",
            "## Request",
            "",
            request_path.read_text(encoding="utf-8"),
            "",
            "## Artifact At Requested SHA",
            "",
            artifact_path.read_text(encoding="utf-8"),
            "",
        ]
    ),
    encoding="utf-8",
)
PY
  export ECHO_REVIEW_PACKET_PATH="$PACKET_PATH"
  export ECHO_REVIEW_QUEUE_SELECTED_REQUEST="$REQUEST_PATH"

  {
    printf '[%s] dispatching wrapper-owned read-only child:' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf ' %q' "${INVOKE_ARGV[@]}"
    printf ' < %q > %q 2> %q\n' "$STDIN_FROM" "$CAPTURE_STDOUT" "$CAPTURE_STDERR"
  }
  if echo_effect codex-exec -- "${INVOKE_ARGV[@]}" < "$STDIN_FROM" > "$CAPTURE_STDOUT" 2> "$CAPTURE_STDERR"; then
    CHILD_RC=0
  else
    CHILD_RC=$?
  fi
  printf '%s\n' "$CHILD_RC" > "$CAPTURE_RC_PATH"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] child end rc=$CHILD_RC"

  if [ "$CHILD_RC" -ne 0 ]; then
    diag="$(bounded_snippet "$CAPTURE_STDERR")"
    finish_capture_failure "$CHILD_RC" "rc_nonzero" "${diag:-child exited non-zero}"
  fi
  if [ ! -s "$CAPTURE_STDOUT" ]; then
    diag="$(bounded_snippet "$CAPTURE_STDERR")"
    finish_capture_failure 1 "empty_stdout" "${diag:-child stdout was empty}"
  fi

  if python3 - "$CAPTURE_STDOUT" "$CAPTURE_FINAL" 2>"$PACKET_DIR/parse-final-message.stderr" <<'PY'
from __future__ import annotations

from pathlib import Path
import json
import sys
from typing import Any


def text_from_content(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts: list[str] = []
        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                if isinstance(item.get("text"), str):
                    parts.append(item["text"])
                elif isinstance(item.get("content"), str):
                    parts.append(item["content"])
        joined = "".join(parts).strip()
        return joined or None
    return None


def assistant_text(obj: Any) -> str | None:
    if not isinstance(obj, dict):
        return None
    typ = str(obj.get("type", ""))
    role = str(obj.get("role", ""))
    if role == "assistant" or "assistant" in typ or typ in {"agent_message", "message"}:
        for key in ("message", "text", "content", "final_message", "output"):
            text = text_from_content(obj.get(key))
            if text:
                return text
    for key in ("item", "message", "data", "event"):
        nested = obj.get(key)
        found = assistant_text(nested)
        if found:
            return found
    return None


stdout_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])
candidates: list[str] = []
json_errors = 0
for line in stdout_path.read_text(encoding="utf-8", errors="replace").splitlines():
    if not line.strip():
        continue
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        json_errors += 1
        continue
    text = assistant_text(obj)
    if text and text.strip():
        candidates.append(text.strip())
if not candidates:
    raise SystemExit(f"no assistant message found in JSON stdout (json_errors={json_errors})")
out_path.write_text(candidates[-1] + "\n", encoding="utf-8")
PY
  then
    parse_rc=0
  else
    parse_rc=$?
  fi
  parse_diag="$(cat "$PACKET_DIR/parse-final-message.stderr" 2>/dev/null || true)"
  if [ "$parse_rc" -ne 0 ] || [ ! -s "$CAPTURE_FINAL" ]; then
    finish_capture_failure 1 "schema_invalid" "${parse_diag:-no final assistant message parsed from stdout_json}"
  fi

  validate_err_file="$PACKET_DIR/validate-response.stderr"
  if PYTHONDONTWRITEBYTECODE=1 python3 "$TOOL_DIR/validate_response_yaml.py" "$CAPTURE_FINAL" \
    > /dev/null 2>"$validate_err_file"; then
    validate_rc=0
  else
    validate_rc=$?
  fi
  VALIDATE_STDERR="$(cat "$validate_err_file" 2>/dev/null || true)"
  if [ "$validate_rc" -ne 0 ]; then
    validation_line="$(first_line "$VALIDATE_STDERR")"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] captured final message failed validation rc=$validate_rc diagnostic=${validation_line:-<empty>}"
    finish_capture_failure 1 "schema_invalid" "${validation_line:-reviewer schema validation failed}"
  fi

  binding_err_file="$PACKET_DIR/request-binding.stderr"
  if validate_request_binding "$CAPTURE_FINAL" 2>"$binding_err_file"; then
    binding_rc=0
  else
    binding_rc=$?
  fi
  if [ "$binding_rc" -ne 0 ]; then
    binding_line="$(first_line "$(cat "$binding_err_file" 2>/dev/null || true)")"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] captured final message failed request binding rc=$binding_rc diagnostic=${binding_line:-<empty>}"
    finish_capture_failure 1 "request_binding_mismatch" "${binding_line:-reviewer response does not match selected request}"
  fi

  if [ -f "$ROUND_DIR/combined.md" ]; then
    emit_tick_end "$CORRELATION_ID" "stale_combined"
    echo "tick: combined.md appeared before $REVIEWER_NAME response link; exiting stale" >&2
    exit 0
  fi

  TMP_RESPONSE="$RESPONSE_PATH.$(uuidgen | tr '[:upper:]' '[:lower:]').tmp"
  cp "$CAPTURE_FINAL" "$TMP_RESPONSE"
  set +e
  python3 - "$TMP_RESPONSE" "$RESPONSE_PATH" <<'PY'
from pathlib import Path
import os
import sys

tmp = Path(sys.argv[1])
final = Path(sys.argv[2])
try:
    os.link(tmp, final)
    tmp.unlink()
except FileExistsError:
    tmp.unlink(missing_ok=True)
    raise SystemExit(3)
PY
  link_rc=$?
  set -e
  if [ "$link_rc" -eq 3 ]; then
    emit_tick_end "$CORRELATION_ID" "duplicate_response"
    echo "tick: $REVIEWER_NAME response already exists locally; duplicate no-op" >&2
    exit 0
  elif [ "$link_rc" -ne 0 ]; then
    emit_tick_end "$CORRELATION_ID" "validation_failure"
    exit "$link_rc"
  fi

  git fetch origin main
  upstream_path="backlog/reviews/$ITEM_ID/$ROUND_LABEL/$REVIEWER_NAME.md"
  if git cat-file -e "origin/main:$upstream_path" 2>/dev/null; then
    emit_tick_end "$CORRELATION_ID" "upstream_duplicate"
    echo "tick: $upstream_path already exists on origin; duplicate no-op" >&2
    exit 0
  fi

  set +e
  "$TOOL_DIR/commit-reviewer-response.sh" "$RESPONSE_PATH" "$REVIEWER_NAME" "$ROUND_NUM" "$ITEM_ID"
  publish_rc=$?
  set -e
  if [ "$publish_rc" -ne 0 ]; then
    emit_tick_end "$CORRELATION_ID" "push_failure"
    exit "$publish_rc"
  fi

  HEAD_SHA="$(git rev-parse HEAD)"
  emit_tick_end "$CORRELATION_ID" "completed"
  append_wrapper_journal "$upstream_path" "$HEAD_SHA"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] wrapper-owned tick complete response=$upstream_path head=$HEAD_SHA"
  exit 0
} >> "$LOG_FILE" 2>&1
