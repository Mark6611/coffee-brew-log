#!/bin/bash
# Wrapper for scripts/export.mjs that sources nvm and runs node.
# If .env / .env.local exist (repo manual run), they're loaded via --env-file.
# If they don't (launchd-driven runtime under ~/coffee-brew-log/), the script
# reads env vars from the plist's EnvironmentVariables block.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Source nvm so the right node is on PATH (launchd doesn't inherit a shell env).
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
	# shellcheck disable=SC1091
	. "$NVM_DIR/nvm.sh"
fi

NODE_ARGS=""
[ -f .env ] && NODE_ARGS="$NODE_ARGS --env-file=.env"
[ -f .env.local ] && NODE_ARGS="$NODE_ARGS --env-file=.env.local"

# shellcheck disable=SC2086
node $NODE_ARGS scripts/export.mjs
