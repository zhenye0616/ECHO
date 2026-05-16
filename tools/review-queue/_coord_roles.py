"""_coord_roles.py — CI/static-check sibling of src/coord/roles.ts (057a AC2).

Mirrors the validation rules enforced by the TypeScript daemon loader. Used by
pre-commit-style review-queue checks and ad-hoc operator scripts. NOT loaded by
the daemon at runtime — the TS loader is the authoritative runtime validator
(per 057a r1 codex F4 MED: bad-config = daemon-startup failure, not
per-request error).

Drift between the TS and Python validators is acceptable risk for V1 (per
057a spec body) — the TS loader is authoritative. CI should run both to catch
divergence early.

Spec: backlog/complete/2026-05-13-043-per-round-reviewer-roster (AC2 pattern
reference). This file follows the _reviewers.py shape: read JSON, walk a
schema-shaped validation, throw with a clear message on first error.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

# COORD_ROLES_CONFIG is resolved lazily so tests that set
# ECHO_COORD_ROLES_PATH after import still pick it up.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402

_SLUG_RE = re.compile(r"^[a-z][a-z0-9-]*$")


class CoordEvent(NamedTuple):
    default_deadline_sec: int
    max_deadline_sec: int
    expects: str


class CoordRole(NamedTuple):
    name: str
    headless: bool
    invoke_command: tuple[str, ...] | None
    events: dict[str, CoordEvent]


# Default path lives next to reviewers.json so `_lib` doesn't need a new constant.
_DEFAULT_PATH = Path(__file__).resolve().parent / "coord-roles.json"


def _resolve_path(config_path: Path | None) -> Path:
    if config_path is not None:
        return config_path
    # Honor the same env var the TS loader uses.
    env = _lib.os.environ.get("ECHO_COORD_ROLES_PATH") if hasattr(_lib, "os") else None
    if env:
        return Path(env)
    # Fall back to the conventional path.
    return _DEFAULT_PATH


def load_coord_roles(config_path: Path | None = None) -> tuple[CoordRole, ...]:
    """Read + validate coord-roles.json. Raises ValueError on any violation.

    Mirrors src/coord/roles.ts.loadCoordRoles validation rules:
      - Top-level shape: { roles: [...] }, non-empty.
      - Each role: name (slug), headless (bool), events (object), and
        invoke_command (argv) REQUIRED iff headless=true.
      - Each event: default_deadline_sec (int > 0), max_deadline_sec
        (int > 0 AND > default_deadline_sec), expects (non-empty string).
      - Slug uniqueness across roles.
    """
    import os  # local import — _lib doesn't re-export os

    path = _resolve_path(config_path)
    if config_path is None:
        env_path = os.environ.get("ECHO_COORD_ROLES_PATH")
        if env_path:
            path = Path(env_path)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as e:
        raise ValueError(f"coord-roles.json: file not found at {path}") from e
    except json.JSONDecodeError as e:
        raise ValueError(f"coord-roles.json: invalid JSON: {e}") from e
    if not isinstance(raw, dict) or "roles" not in raw or not isinstance(raw["roles"], list):
        raise ValueError("coord-roles.json: top-level 'roles' array is required")
    if not raw["roles"]:
        raise ValueError("coord-roles.json: 'roles' array must be non-empty")

    roles: list[CoordRole] = []
    seen: set[str] = set()
    for i, r in enumerate(raw["roles"]):
        if not isinstance(r, dict):
            raise ValueError(f"coord-roles.json[{i}]: entry must be an object")
        name = r.get("name")
        if not isinstance(name, str) or not _SLUG_RE.match(name):
            raise ValueError(
                f"coord-roles.json[{i}]: invalid name {name!r} — must match {_SLUG_RE.pattern}"
            )
        if name in seen:
            raise ValueError(f"coord-roles.json: duplicate role name {name!r}")
        seen.add(name)

        if "headless" not in r or not isinstance(r["headless"], bool):
            raise ValueError(f"coord-roles.json[{name}]: 'headless' must be a bool")
        headless: bool = r["headless"]

        invoke_command_raw = r.get("invoke_command")
        if headless:
            if not isinstance(invoke_command_raw, list) or not invoke_command_raw:
                raise ValueError(
                    f"coord-roles.json[{name}]: headless=true requires non-empty invoke_command array"
                )
            for j, arg in enumerate(invoke_command_raw):
                if not isinstance(arg, str) or not arg:
                    raise ValueError(
                        f"coord-roles.json[{name}].invoke_command[{j}]: must be a non-empty string"
                    )
            invoke_command: tuple[str, ...] | None = tuple(invoke_command_raw)
        else:
            if invoke_command_raw is not None:
                # IDE-mode roles MAY omit invoke_command per spec; accepting
                # one that's set is fine, but reject obviously bad shapes.
                if not isinstance(invoke_command_raw, list):
                    raise ValueError(
                        f"coord-roles.json[{name}].invoke_command must be an array if present"
                    )
            invoke_command = (
                tuple(invoke_command_raw) if isinstance(invoke_command_raw, list) else None
            )

        events_raw = r.get("events")
        if not isinstance(events_raw, dict) or not events_raw:
            raise ValueError(f"coord-roles.json[{name}]: 'events' must be a non-empty object")
        events: dict[str, CoordEvent] = {}
        for event_type, ev_raw in events_raw.items():
            if not isinstance(event_type, str) or not event_type:
                raise ValueError(
                    f"coord-roles.json[{name}].events: event_type key must be a non-empty string"
                )
            if not isinstance(ev_raw, dict):
                raise ValueError(
                    f"coord-roles.json[{name}].events[{event_type}]: value must be an object"
                )
            default_deadline = ev_raw.get("default_deadline_sec")
            max_deadline = ev_raw.get("max_deadline_sec")
            expects = ev_raw.get("expects")
            for field, val in (
                ("default_deadline_sec", default_deadline),
                ("max_deadline_sec", max_deadline),
            ):
                # bool is a subclass of int in Python — guard against True/False.
                if not isinstance(val, int) or isinstance(val, bool) or val <= 0:
                    raise ValueError(
                        f"coord-roles.json[{name}].events[{event_type}].{field}: "
                        f"must be a positive integer, got {val!r}"
                    )
            if not isinstance(expects, str) or not expects:
                raise ValueError(
                    f"coord-roles.json[{name}].events[{event_type}].expects: "
                    f"must be a non-empty string"
                )
            if max_deadline <= default_deadline:
                raise ValueError(
                    f"coord-roles.json[{name}].events[{event_type}]: "
                    f"max_deadline_sec ({max_deadline}) must be > "
                    f"default_deadline_sec ({default_deadline})"
                )
            events[event_type] = CoordEvent(
                default_deadline_sec=default_deadline,
                max_deadline_sec=max_deadline,
                expects=expects,
            )

        roles.append(
            CoordRole(name=name, headless=headless, invoke_command=invoke_command, events=events)
        )

    return tuple(roles)


if __name__ == "__main__":
    # CLI mode: validate the canonical config and print a one-line summary,
    # or exit non-zero with a diagnostic. Useful in CI / pre-commit.
    try:
        loaded = load_coord_roles()
    except ValueError as e:
        print(f"coord-roles.json INVALID: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"coord-roles.json OK: {len(loaded)} roles loaded")
