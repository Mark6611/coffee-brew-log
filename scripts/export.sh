#!/bin/bash
# Wrapper for scripts/export.mjs that sources nvm and runs node with the
# .env + .env.local files loaded. Used by the weekly launchd job and by
# the `npm run export` script.

set -euo pipefail

# cd to the project root (parent of scripts/), so this works whether invoked
# from the main checkout, a worktree, or by launchd.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Source nvm so the right node is on PATH (launchd doesn't inherit a shell env).
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
	# shellcheck disable=SC1091
	. "$NVM_DIR/nvm.sh"
fi

node --env-file=.env --env-file=.env.local scripts/export.mjs
