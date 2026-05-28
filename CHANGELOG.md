# Changelog

All notable customer-facing changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-05-27

### Added

- Packaged `echoctl` as an npm tarball with a built CLI, packaged daemon entrypoint, SQL migrations, and launchd install boundary so the daemon runs without the source repo.
- Added isolated onboarding flows for `echoctl init`, including adapter-safe flags, non-TTY answer-file support, and `init --force` for repeatable setup.
- Added `echoctl doctor` checks that work outside the source repo and report customer installation health without leaking development-only assumptions.
- Shipped customer skills and roles for using ECHO through MCP and the coordination layer, with default role TOMLs scoped to packaged capabilities.
- Added `echoctl project add|list|remove` and persisted project allowlist state for git-capture workflows.

### Fixed

- Fixed packaged doctor probes to pass isolation flags, avoiding false degraded states when run from arbitrary working directories.
- Fixed the customer tarball surface so source-only development skills are excluded while install/runtime assets remain reachable.
