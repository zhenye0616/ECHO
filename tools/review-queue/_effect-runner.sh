#!/usr/bin/env bash
# Shared effect boundary for review-queue runners.
#
# Source this file, then call:
#   echo_effect <kind> -- <argv...>
#
# ECHO_EFFECT_MODE:
#   live    (default) execute argv unchanged
#   dry-run print the effect and do not execute
#   test    do not execute
#
# Non-live status contract:
#   push -> ECHO_EFFECT_NONLIVE_RC (97)
#   every other kind -> 0

ECHO_EFFECT_NONLIVE_RC="${ECHO_EFFECT_NONLIVE_RC:-97}"
export ECHO_EFFECT_NONLIVE_RC

echo_effect() {
  local kind="${1:-}"
  if [ -z "$kind" ]; then
    echo "echo_effect: kind required" >&2
    return 2
  fi
  shift || true
  if [ "${1:-}" != "--" ]; then
    echo "echo_effect: expected -- before argv" >&2
    return 2
  fi
  shift
  if [ "$#" -eq 0 ]; then
    echo "echo_effect: argv required" >&2
    return 2
  fi

  case "$kind" in
    spawn-agent|codex-exec|push|launchd|review-tick) ;;
    *)
      echo "echo_effect: unknown kind: $kind" >&2
      return 2
      ;;
  esac

  local mode="${ECHO_EFFECT_MODE:-live}"
  case "$mode" in
    live)
      "$@"
      return $?
      ;;
    dry-run)
      printf '[effect:dry-run] %s' "$kind" >&2
      local arg
      for arg in "$@"; do
        printf ' %q' "$arg" >&2
      done
      printf '\n' >&2
      if [ "$kind" = "push" ]; then
        return "$ECHO_EFFECT_NONLIVE_RC"
      fi
      return 0
      ;;
    test)
      if [ "$kind" = "push" ]; then
        return "$ECHO_EFFECT_NONLIVE_RC"
      fi
      return 0
      ;;
    *)
      echo "echo_effect: invalid ECHO_EFFECT_MODE: $mode" >&2
      return 2
      ;;
  esac
}
