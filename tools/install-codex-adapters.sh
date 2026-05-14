#!/usr/bin/env bash
# tools/install-codex-adapters.sh — deploy ECHO's codex skill adapters to ~/.codex/skills/
#
# The canonical adapters live at $REPO_ROOT/adapters/codex/skills/<name>/SKILL.md
# (materialized by tools/sync-skills.sh from canonical skills/<name>.md). This
# script wires them into codex's session-start discovery root at
# ~/.codex/skills/<name>/.
#
# Modes:
#   --symlink   (default) symlink each ~/.codex/skills/<name> → $REPO_ROOT/adapters/codex/skills/<name>.
#               Dev-friendly: edits to canonical → sync → adapter → codex sees new content with no re-install.
#   --copy      copy adapter contents into ~/.codex/skills/<name>/ as a snapshot.
#               Use when codex builds on this platform do not resolve symlinks at discovery time.
#               Snapshots — must be re-run after every tools/sync-skills.sh to refresh.
#   --dry-run   print the operations that WOULD run; make no filesystem changes.
#
# Safety:
#   - REFUSES to overwrite anything that isn't an ECHO-managed entity (probed via target kind + sentinel).
#   - Per-skill atomic-mkdir lock at $HOME/.codex/.echo-locks/<name> with a three-factor stale-lock
#     gate (age, pid liveness, no live install process for the same skill) so a crashed install can
#     be recovered without stealing a slow-but-live install's lock.
#   - --copy mode stages OUTSIDE the live codex skill discovery root, then atomic-mv's into place,
#     so a SIGKILL'd / power-lost staging directory cannot be seen by next-codex-startup as a skill.
#   - Stale-staging cleanup runs in pre-flight (-mindepth 1 → never deletes the staging root itself).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CODEX_REPO_DIR="$REPO_ROOT/adapters/codex/skills"

usage() {
  cat <<EOF
Usage: tools/install-codex-adapters.sh [--symlink|--copy] [--dry-run] [-h|--help]

  --symlink   (default) symlink each ~/.codex/skills/<name> at the repo adapter dir.
  --copy      copy snapshot into ~/.codex/skills/<name>/ (re-run after every sync to refresh).
  --dry-run   print planned operations without executing.
  -h, --help  show this message and exit.
EOF
}

MODE="symlink"
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --symlink) MODE="symlink"; shift ;;
    --copy) MODE="copy"; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -z "${HOME:-}" ]; then
  echo "ERROR: HOME is not set" >&2
  exit 1
fi

if [ ! -d "$CODEX_REPO_DIR" ]; then
  echo "ERROR: $CODEX_REPO_DIR does not exist — run tools/sync-skills.sh first" >&2
  exit 1
fi

CODEX_HOME="$HOME/.codex"
CODEX_SKILLS="$CODEX_HOME/skills"
STAGING_ROOT="$CODEX_HOME/.echo-staging"
LOCKS_ROOT="$CODEX_HOME/.echo-locks"

# Resolve a path to its real, absolute form (follows symlinks). Used to
# compare a symlink's target against the repo adapter's canonical path.
realpath_p() {
  python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$1"
}

# Pre-flight: writable HOME and codex install roots. In dry-run, plan only.
if [ "$DRY_RUN" = "0" ]; then
  if ! mkdir -p "$CODEX_HOME" 2>/dev/null; then
    echo "ERROR: HOME=$HOME is not writable (cannot create $CODEX_HOME)" >&2
    exit 1
  fi
  if ! mkdir -p "$CODEX_SKILLS" 2>/dev/null; then
    echo "ERROR: cannot create $CODEX_SKILLS (HOME=$HOME)" >&2
    exit 1
  fi
  mkdir -p "$STAGING_ROOT" "$LOCKS_ROOT"
  # Stale-staging cleanup. -mindepth 1 is mandatory — without it `find` would
  # match the staging root once it ages past 60min, delete it, and the next
  # install's mkdir would fail because the parent was removed.
  find "$STAGING_ROOT" -mindepth 1 -maxdepth 1 -type d -mmin +60 -exec rm -rf {} + 2>/dev/null || true
else
  echo "DRY-RUN: mkdir -p $CODEX_HOME $CODEX_SKILLS $STAGING_ROOT $LOCKS_ROOT"
  echo "DRY-RUN: find $STAGING_ROOT -mindepth 1 -maxdepth 1 -type d -mmin +60 -exec rm -rf {} +"
fi

# Enumerate in-scope skills from the repo adapter directory.
SKILLS=()
for d in "$CODEX_REPO_DIR"/*/; do
  [ -d "$d" ] || continue
  [ -f "${d}SKILL.md" ] || continue
  SKILLS+=( "$(basename "$d")" )
done

if [ "${#SKILLS[@]}" -eq 0 ]; then
  echo "WARNING: no codex adapters found under $CODEX_REPO_DIR — nothing to install" >&2
  exit 0
fi

ACQUIRED_LOCKS=()
ACQUIRED_STAGES=()

cleanup_owned() {
  local p
  for p in "${ACQUIRED_STAGES[@]+"${ACQUIRED_STAGES[@]}"}"; do
    rm -rf "$p" 2>/dev/null || true
  done
  for p in "${ACQUIRED_LOCKS[@]+"${ACQUIRED_LOCKS[@]}"}"; do
    rm -rf "$p" 2>/dev/null || true
  done
}
trap cleanup_owned EXIT

# Three-factor stale-lock gate. A lock is recovered ONLY if:
#   1. age > 600s (readable timestamp), OR lock-dir mtime > 600s (fallback)
#   2. pid liveness: kill -0 returns non-zero (NOT alive)
#   3. no other install process for the same skill name in argv
# If $LOCK/pid is missing/non-integer, fall through to age-only check with a
# loud warning ("conservative path" — unknown liveness).
acquire_lock() {
  local name="$1"
  local lock="$LOCKS_ROOT/$name"

  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY-RUN: acquire lock $lock"
    return 0
  fi

  while ! mkdir "$lock" 2>/dev/null; do
    local now ts age age_ok mtime pid pid_alive=0
    now=$(date -u +%s)

    ts=""
    if [ -f "$lock/timestamp" ]; then
      ts="$(cat "$lock/timestamp" 2>/dev/null || true)"
    fi
    if [[ "$ts" =~ ^[0-9]+$ ]]; then
      age=$(( now - ts ))
    else
      # mtime fallback
      mtime=$(stat -f %m "$lock" 2>/dev/null || stat -c %Y "$lock" 2>/dev/null || echo 0)
      age=$(( now - mtime ))
      if [ -f "$lock/timestamp" ]; then
        echo "WARNING: lock $lock has corrupted/non-integer timestamp; falling back to mtime check" >&2
      else
        echo "WARNING: lock $lock has missing timestamp; falling back to mtime check" >&2
      fi
    fi

    if [ "$age" -le 600 ]; then
      echo "ERROR: another install in progress for $name (lock $lock; age=${age}s; <600s threshold)" >&2
      return 1
    fi
    age_ok=1

    pid=""
    if [ -f "$lock/pid" ]; then
      pid="$(cat "$lock/pid" 2>/dev/null || true)"
    fi
    if [[ "$pid" =~ ^[0-9]+$ ]]; then
      if kill -0 "$pid" 2>/dev/null; then
        pid_alive=1
      fi
    else
      echo "WARNING: lock $lock has missing/non-integer pid; falling back to age-only check (manual recovery may be needed if this lock is in fact still live)" >&2
    fi

    if [ "$pid_alive" = "1" ]; then
      echo "ERROR: another install in progress for $name (lock $lock; pid=$pid is alive; refusing to steal)" >&2
      return 1
    fi

    # Factor 3: belt-and-braces — refuse if any other install process for this skill exists.
    local other_pids
    other_pids="$(pgrep -f "install-codex-adapters.sh" 2>/dev/null | grep -v "^${$}\$" || true)"
    if [ -n "$other_pids" ]; then
      local found_match=0
      local p
      for p in $other_pids; do
        # Inspect the matched process's args to ensure it actually mentions this skill.
        if ps -o args= -p "$p" 2>/dev/null | grep -q -- "$name"; then
          found_match=1
          break
        fi
      done
      if [ "$found_match" = "1" ]; then
        echo "ERROR: another install-codex-adapters.sh process appears to be running for $name; refusing to steal lock $lock" >&2
        return 1
      fi
    fi

    echo "WARNING: removing stale lock $lock (age=${age}s, pid=${pid:-unknown}, age_ok=${age_ok}, no live install process detected)" >&2
    rm -rf "$lock"
    # loop re-tries mkdir
  done

  echo $$ > "$lock/pid"
  date -u +%s > "$lock/timestamp"
  ACQUIRED_LOCKS+=( "$lock" )
  return 0
}

release_lock() {
  local lock="$LOCKS_ROOT/$1"
  rm -rf "$lock" 2>/dev/null || true
  # remove from ACQUIRED_LOCKS so cleanup_owned doesn't double-rm
  local new=() p
  for p in "${ACQUIRED_LOCKS[@]+"${ACQUIRED_LOCKS[@]}"}"; do
    [ "$p" != "$lock" ] && new+=( "$p" )
  done
  ACQUIRED_LOCKS=( "${new[@]+"${new[@]}"}" )
}

probe_target() {
  local name="$1" target="$CODEX_SKILLS/$name" adapter="$CODEX_REPO_DIR/$name"
  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    echo "absent"
    return 0
  fi
  if [ -L "$target" ]; then
    local link_real adapter_real
    link_real="$(realpath_p "$target" 2>/dev/null || true)"
    adapter_real="$(realpath_p "$adapter" 2>/dev/null || true)"
    if [ -n "$link_real" ] && [ "$link_real" = "$adapter_real" ]; then
      echo "managed-symlink"
    else
      echo "non-managed-symlink"
    fi
    return 0
  fi
  if [ -d "$target" ]; then
    if [ -f "$target/.echo-managed" ]; then
      echo "managed-copy"
    else
      echo "non-managed-directory"
    fi
    return 0
  fi
  if [ -f "$target" ]; then
    echo "regular-file"
    return 0
  fi
  echo "unknown"
}

install_one() {
  local name="$1"
  local target="$CODEX_SKILLS/$name"
  local adapter="$CODEX_REPO_DIR/$name"
  local kind
  kind=$(probe_target "$name")

  case "$kind" in
    absent)
      ;;
    managed-symlink)
      if [ "$MODE" = "symlink" ]; then
        if [ "$DRY_RUN" = "1" ]; then
          echo "DRY-RUN: $name already an ECHO-managed symlink (no-op)"
        else
          echo "OK: $name already installed as ECHO-managed symlink (no-op)"
        fi
        return 0
      fi
      if [ "$DRY_RUN" = "1" ]; then
        echo "DRY-RUN: rm $target  # mode-switch symlink → copy"
      else
        rm -f "$target"
      fi
      ;;
    managed-copy)
      if [ "$DRY_RUN" = "1" ]; then
        echo "DRY-RUN: rm -rf $target  # will replace managed copy"
      else
        rm -rf "$target"
      fi
      ;;
    non-managed-symlink)
      local link_target
      link_target=$(readlink "$target" 2>/dev/null || echo "?")
      echo "ERROR: $target is a non-managed symlink (target=$link_target); refusing to overwrite. Move or remove it manually if you want ECHO to manage this skill." >&2
      return 1
      ;;
    non-managed-directory)
      echo "ERROR: $target is a non-managed directory (no .echo-managed sentinel); refusing to overwrite. Move or remove it manually if you want ECHO to manage this skill." >&2
      return 1
      ;;
    regular-file)
      echo "ERROR: $target is a regular file; refusing to overwrite. Move or remove it manually if you want ECHO to manage this skill." >&2
      return 1
      ;;
    *)
      echo "ERROR: $target has unexpected kind=$kind; refusing to overwrite" >&2
      return 1
      ;;
  esac

  if [ "$MODE" = "symlink" ]; then
    if [ "$DRY_RUN" = "1" ]; then
      echo "DRY-RUN: ln -s $adapter $target"
    else
      ln -s "$adapter" "$target"
      echo "OK: installed $name (symlink → $adapter)"
    fi
    return 0
  fi

  # --copy mode: stage outside CODEX_SKILLS, atomic mv into place.
  local stage="$STAGING_ROOT/${name}-$$"
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY-RUN: stage adapter at $stage (sentinel first, then cp -R), mv → $target"
    return 0
  fi

  # Cleanup if a previous run left a same-PID staging dir (unlikely).
  rm -rf "$stage" 2>/dev/null || true
  mkdir "$stage"
  ACQUIRED_STAGES+=( "$stage" )

  # Sentinel FIRST — adapter contains only SKILL.md (per V1 scope), so a later
  # cp -R will not overwrite the sentinel. Writing sentinel first means even a
  # mid-cp crash leaves the marker present in the staging dir.
  local content_sha head_sha
  content_sha=$(shasum -a 256 "$adapter/SKILL.md" | awk '{print $1}')
  head_sha=$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")
  {
    echo "synced_from_commit=$head_sha"
    echo "synced_content_sha256=$content_sha"
    echo "synced_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "source=$adapter"
  } > "$stage/.echo-managed"

  cp -R "$adapter/." "$stage/"

  mv "$stage" "$target"
  # remove from ACQUIRED_STAGES — we no longer own this path
  local new=() p
  for p in "${ACQUIRED_STAGES[@]+"${ACQUIRED_STAGES[@]}"}"; do
    [ "$p" != "$stage" ] && new+=( "$p" )
  done
  ACQUIRED_STAGES=( "${new[@]+"${new[@]}"}" )

  echo "OK: installed $name (copy snapshot at $target)"
}

EXIT_CODE=0

for name in "${SKILLS[@]}"; do
  if ! acquire_lock "$name"; then
    EXIT_CODE=1
    continue
  fi
  if ! install_one "$name"; then
    EXIT_CODE=1
  fi
  release_lock "$name"
done

exit "$EXIT_CODE"
