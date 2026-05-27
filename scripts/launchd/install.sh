#!/usr/bin/env bash
# Install ECHO daemon as a macOS LaunchAgent through the packaged echoctl
# lifecycle command. The resulting plist runs node against dist/daemon/index.js;
# it does not depend on the source repo or set WorkingDirectory.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLI="$ROOT/dist/cli/index.js"

if [ ! -f "$CLI" ]; then
  echo "error: $CLI not found; run npm run build:cli first" >&2
  exit 1
fi

exec node "$CLI" daemon install "$@"
