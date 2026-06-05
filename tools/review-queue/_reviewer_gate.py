#!/usr/bin/env python3
"""Validate REVIEWER_NAME and resolve reviewer invocation bindings.

The runtime child-invocation source is reviewer-bindings.json. The older
reviewers.json roster is still used to validate reviewer identity/mode and to
preserve legacy diagnostic probes, but the wrapper and installer build argv
from the binding file, not from reviewers.json invoke_command shell strings.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reviewers import Reviewer, load_reviewers  # noqa: E402


TOOL_DIR = Path(__file__).resolve().parent
DEFAULT_BINDINGS_CONFIG = TOOL_DIR / "reviewer-bindings.json"
HEADLESS_BINDING_MODES = {"headless-cli", "host-subagent"}
PROTECTED_WRAPPER_REVIEWERS = {"codex", "codex-ops"}
PROTECTED_CODEX_ARGV_TEMPLATE = (
    "codex",
    "exec",
    "-C",
    "<WT>",
    "--sandbox",
    "read-only",
    "--json",
    "-",
)
VALID_PRINT_FIELDS = (
    "slash_command",
    "invoke_command",
    "stdin_from",
    "argv_nul",
    "agent_sandbox",
    "commit_policy",
)


class GateError(ValueError):
    pass


def _binding_config_path() -> Path:
    raw = os.environ.get("ECHO_REVIEWER_BINDINGS_CONFIG")
    return Path(raw) if raw else DEFAULT_BINDINGS_CONFIG


def _load_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise GateError(f"reviewer-bindings.json not found at {path}") from exc
    except json.JSONDecodeError as exc:
        raise GateError(f"reviewer-bindings.json: invalid JSON: {exc}") from exc
    if not isinstance(raw, dict):
        raise GateError("reviewer-bindings.json: top-level object is required")
    return raw


def _argv_sandbox_values(argv: list[str], reviewer: str) -> list[str]:
    values: list[str] = []
    idx = 0
    while idx < len(argv):
        arg = argv[idx]
        if arg == "--sandbox":
            if idx + 1 >= len(argv):
                raise GateError(f"reviewer-bindings.json: {reviewer!r} argv has --sandbox without a value")
            values.append(argv[idx + 1])
            idx += 2
            continue
        if arg.startswith("--sandbox="):
            value = arg.split("=", 1)[1]
            if not value:
                raise GateError(f"reviewer-bindings.json: {reviewer!r} argv has --sandbox= without a value")
            values.append(value)
        idx += 1
    return values


def _enforce_protected_metadata(binding: dict[str, Any], reviewer: str, *, source: str) -> None:
    agent_sandbox = binding.get("agent_sandbox")
    commit_policy = binding.get("commit_policy")

    if agent_sandbox != "read-only":
        raise GateError(f"{source}: {reviewer!r} must use agent_sandbox='read-only'")
    if commit_policy != "wrapper":
        raise GateError(f"{source}: {reviewer!r} must use commit_policy='wrapper'")


def _enforce_runtime_contract(binding: dict[str, Any], reviewer: str) -> None:
    argv_raw = binding.get("argv")
    argv = [str(arg) for arg in argv_raw] if isinstance(argv_raw, list) else []
    agent_sandbox = binding.get("agent_sandbox")

    if reviewer in PROTECTED_WRAPPER_REVIEWERS:
        _enforce_protected_metadata(binding, reviewer, source="reviewer-bindings.json")
        return

    sandbox_values = _argv_sandbox_values(argv, reviewer) if argv else []
    effective_sandbox = sandbox_values[-1] if sandbox_values else None
    if effective_sandbox is not None and effective_sandbox != agent_sandbox:
        raise GateError(
            f"reviewer-bindings.json: {reviewer!r} effective argv --sandbox {effective_sandbox!r} "
            f"disagrees with agent_sandbox {agent_sandbox!r}"
        )


def _validate_binding(
    raw: dict[str, Any],
    reviewer: str,
    *,
    enforce_runtime: bool = True,
) -> dict[str, Any]:
    if raw.get("kind") != "reviewer":
        raise GateError("reviewer-bindings.json: kind must be 'reviewer'")
    bindings = raw.get("bindings")
    if not isinstance(bindings, list):
        raise GateError("reviewer-bindings.json: top-level bindings array is required")

    found: dict[str, Any] | None = None
    seen: set[str] = set()
    for i, entry in enumerate(bindings):
        if not isinstance(entry, dict):
            raise GateError(f"reviewer-bindings.json[{i}]: entry must be an object")
        slug = entry.get("reviewer")
        if not isinstance(slug, str) or not slug:
            raise GateError(f"reviewer-bindings.json[{i}]: reviewer must be a string")
        if slug in seen:
            raise GateError(f"reviewer-bindings.json: duplicate reviewer {slug!r}")
        seen.add(slug)
        if slug == reviewer:
            found = entry

    if found is None:
        raise GateError(f"{reviewer} not found in reviewer-bindings.json")

    mode = found.get("mode")
    if mode not in (*HEADLESS_BINDING_MODES, "ide-manual"):
        raise GateError(f"reviewer-bindings.json: {reviewer!r} has invalid mode {mode!r}")
    for key in ("agent_sandbox", "commit_policy"):
        if not isinstance(found.get(key), str) or not found.get(key):
            raise GateError(f"reviewer-bindings.json: {reviewer!r} missing {key}")

    if mode in HEADLESS_BINDING_MODES:
        argv = found.get("argv")
        stdin_from = found.get("stdin_from")
        cwd = found.get("cwd")
        if (
            not isinstance(argv, list)
            or not argv
            or not all(isinstance(arg, str) and arg for arg in argv)
        ):
            raise GateError(f"reviewer-bindings.json: {reviewer!r} argv must be a non-empty string array")
        if not isinstance(stdin_from, str) or not stdin_from:
            raise GateError(f"reviewer-bindings.json: {reviewer!r} stdin_from must be a string")
        if not isinstance(cwd, str) or not cwd:
            raise GateError(f"reviewer-bindings.json: {reviewer!r} cwd must be a string")
    else:
        for key in ("argv", "stdin_from", "cwd"):
            if key in found:
                raise GateError(f"reviewer-bindings.json: {reviewer!r} ide-manual entry must not set {key}")

    if enforce_runtime:
        _enforce_runtime_contract(found, reviewer)
    return found


def _canonical_binding(reviewer: str) -> dict[str, Any]:
    binding = _validate_binding(
        _load_json(DEFAULT_BINDINGS_CONFIG),
        reviewer,
        enforce_runtime=False,
    )
    if reviewer in PROTECTED_WRAPPER_REVIEWERS:
        _enforce_protected_metadata(
            binding,
            reviewer,
            source="canonical reviewer-bindings.json",
        )
    return binding


def _legacy_binding_from_reviewer(reviewer: Reviewer) -> dict[str, Any]:
    """Bridge old fixture overrides that still route via ECHO_REVIEWERS_CONFIG.

    Production codex/codex-ops runtime uses reviewer-bindings.json even when a
    legacy roster override is present. This bridge remains only for non-087b
    reviewers and old synthetic fixtures that are not part of the read-only
    child migration.
    """
    if reviewer.mode != "headless" or not reviewer.invoke_command:
        return {
            "reviewer": reviewer.name,
            "mode": "ide-manual",
            "agent_sandbox": "workspace-write",
            "commit_policy": "child",
        }

    try:
        parts = shlex.split(reviewer.invoke_command)
    except ValueError as exc:
        raise GateError(f"legacy invoke_command parse failed for {reviewer.name}: {exc}") from exc

    if "<" in parts:
        redir = parts.index("<")
        argv = parts[:redir]
    else:
        argv = parts
    if not argv:
        raise GateError(f"legacy invoke_command parse failed for {reviewer.name}: empty argv")

    return {
        "reviewer": reviewer.name,
        "mode": "headless-cli",
        "argv": argv,
        "stdin_from": f".claude/commands/{reviewer.slash_command}.md",
        "cwd": "{{WT}}",
        "agent_sandbox": "danger-full-access",
        "commit_policy": "child",
    }


def _load_binding(reviewer: Reviewer) -> dict[str, Any]:
    if (
        os.environ.get("ECHO_REVIEWERS_CONFIG")
        and not os.environ.get("ECHO_REVIEWER_BINDINGS_CONFIG")
        and reviewer.name not in PROTECTED_WRAPPER_REVIEWERS
    ):
        return _legacy_binding_from_reviewer(reviewer)
    return _validate_binding(_load_json(_binding_config_path()), reviewer.name)


def _substitute(value: str, *, reviewer: str, wt: str | None) -> str:
    out = value.replace("{{REVIEWER}}", reviewer)
    if "{{WT}}" in out:
        if wt is None:
            raise GateError("binding references {{WT}} but no $WT was provided")
        out = out.replace("{{WT}}", wt)
    return out


def _resolve_stdin_from(binding: dict[str, Any], reviewer: str, wt: str | None) -> str:
    raw = binding.get("stdin_from")
    if not isinstance(raw, str) or not raw:
        raise GateError(f"IDE-mode reviewer {reviewer} has no stdin_from")
    resolved = _substitute(raw, reviewer=reviewer, wt=wt)
    if not Path(resolved).is_absolute():
        if wt is None:
            raise GateError("stdin_from is relative but no $WT was provided")
        resolved = str(Path(wt) / resolved)
    return resolved


def _format_argv(argv: list[str]) -> str:
    return shlex.join(argv)


def _is_codex_executable_token(value: str) -> bool:
    return value == "codex"


def _assert_protected_codex_argv_template(
    argv: list[str],
    reviewer: str,
    *,
    source: str,
    wt: str | None,
) -> None:
    template = _format_argv(list(PROTECTED_CODEX_ARGV_TEMPLATE))

    def fail(reason: str) -> None:
        raise GateError(
            f"{source}: {reviewer!r} protected argv must match gate-owned read-only template "
            f"{template}: {reason}; got {_format_argv(argv)}"
        )

    if wt is None:
        fail("$WT is required for the -C <WT> slot")
    if len(argv) != len(PROTECTED_CODEX_ARGV_TEMPLATE):
        fail(f"expected {len(PROTECTED_CODEX_ARGV_TEMPLATE)} tokens")
    # Shape guard only: PATH resolution and binary authenticity are host-trust concerns.
    if not _is_codex_executable_token(argv[0]):
        fail("argv[0] must be exactly 'codex'")

    expected_by_position = {
        1: "exec",
        2: "-C",
        3: wt,
        4: "--sandbox",
        5: "read-only",
        6: "--json",
        7: "-",
    }
    for index, expected in expected_by_position.items():
        if argv[index] != expected:
            fail(f"argv[{index}] must be {expected!r}")


def _enforce_protected_argv_allowlist(
    *,
    reviewer: str,
    wt: str | None,
    resolved_argv: list[str],
) -> None:
    if reviewer not in PROTECTED_WRAPPER_REVIEWERS:
        return

    canonical = _canonical_binding(reviewer)
    canonical_raw = canonical.get("argv")
    if not isinstance(canonical_raw, list) or not canonical_raw:
        raise GateError(
            f"canonical reviewer-bindings.json: {reviewer!r} argv must be a non-empty string array"
        )
    canonical_argv = [_substitute(str(arg), reviewer=reviewer, wt=wt) for arg in canonical_raw]
    _assert_protected_codex_argv_template(
        canonical_argv,
        reviewer,
        source="canonical reviewer-bindings.json",
        wt=wt,
    )
    _assert_protected_codex_argv_template(
        resolved_argv,
        reviewer,
        source="resolved reviewer-bindings.json",
        wt=wt,
    )


def _resolve_argv(binding: dict[str, Any], reviewer: str, wt: str | None) -> list[str]:
    raw = binding.get("argv")
    if not isinstance(raw, list) or not raw:
        raise GateError(f"IDE-mode reviewer {reviewer} has no argv")
    argv = [_substitute(str(arg), reviewer=reviewer, wt=wt) for arg in raw]
    if not argv[0]:
        raise GateError(f"reviewer-bindings.json: {reviewer!r} argv[0] is empty")
    _enforce_protected_argv_allowlist(
        reviewer=reviewer,
        wt=wt,
        resolved_argv=argv,
    )
    return argv


def _shell_compat_command(binding: dict[str, Any], reviewer: str, wt: str | None) -> str:
    argv = _resolve_argv(binding, reviewer, wt)
    # Legacy probes passed PROMPT directly to --print invoke_command. Runtime
    # scripts do not use this mode, but keeping the diagnostic output stable
    # avoids forcing old tests through a real vendor CLI during this migration.
    stdin_from = os.environ.get("PROMPT") or _resolve_stdin_from(binding, reviewer, wt)
    return " ".join(shlex.quote(arg) for arg in argv) + " < " + shlex.quote(stdin_from)


def _require_mode_matches(reviewer: Reviewer, required: str) -> None:
    if reviewer.mode != required:
        raise GateError(f"{reviewer.name} has mode={reviewer.mode}, not {required}")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--require-mode",
        default="headless",
        help="Required reviewers.json mode (default: headless)",
    )
    ap.add_argument(
        "--print",
        dest="print_field",
        default="slash_command",
        choices=VALID_PRINT_FIELDS,
        help="Which field to resolve and print on success.",
    )
    args = ap.parse_args(argv[1:])

    name = os.environ.get("REVIEWER_NAME")
    if not name:
        sys.stderr.write("REVIEWER_NAME env var required\n")
        sys.stderr.flush()
        return 1

    try:
        reviewer = next((r for r in load_reviewers() if r.name == name), None)
    except ValueError as exc:
        sys.stderr.write(f"{exc}\n")
        sys.stderr.flush()
        return 1
    if reviewer is None:
        sys.stderr.write(f"{name} not found in reviewers.json\n")
        sys.stderr.flush()
        return 1

    if args.print_field == "slash_command":
        try:
            _require_mode_matches(reviewer, args.require_mode)
        except GateError as exc:
            sys.stderr.write(f"{exc}\n")
            sys.stderr.flush()
            return 1
        print(reviewer.slash_command)
        return 0

    if args.print_field == "invoke_command" and reviewer.mode != "headless":
        sys.stderr.write(f"IDE-mode reviewer {name} has no invoke_command\n")
        sys.stderr.flush()
        return 1

    try:
        _require_mode_matches(reviewer, args.require_mode)
        binding = _load_binding(reviewer)
        wt = os.environ.get("WT")

        if args.print_field == "stdin_from":
            print(_resolve_stdin_from(binding, name, wt))
            return 0
        if args.print_field == "argv_nul":
            resolved = _resolve_argv(binding, name, wt)
            sys.stdout.buffer.write(("\0".join(resolved) + "\0").encode("utf-8"))
            sys.stdout.flush()
            return 0
        if args.print_field == "agent_sandbox":
            print(binding["agent_sandbox"])
            return 0
        if args.print_field == "commit_policy":
            print(binding["commit_policy"])
            return 0
        if args.print_field == "invoke_command":
            print(_shell_compat_command(binding, name, wt))
            return 0
    except GateError as exc:
        sys.stderr.write(f"{exc}\n")
        sys.stderr.flush()
        return 1

    sys.stderr.write(f"unsupported print field: {args.print_field}\n")
    sys.stderr.flush()
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
