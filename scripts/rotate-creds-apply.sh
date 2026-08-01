#!/bin/bash
#
# rotate-creds-apply.sh — local propagation step of a credential rotation.
#
# WHAT
#   After you have put NEW credential values into this repo's .env / .env.local
#   YOURSELF (this script never generates, reads back to you, or prints secret
#   values), it:
#     1. rewrites the EnvironmentVariables block of the launchd backup job
#        ~/Library/LaunchAgents/com.coffee-brew-log.export.plist from the current
#        .env + .env.local (.env.local wins on conflict). Only keys the plist
#        ALREADY has are touched — BACKUP_DIR and anything not in the env files
#        are left as-is, and no new keys are added.
#     2. reloads the job: launchctl bootout + bootstrap gui/$UID
#     3. prints a NAME + length-only confirmation table. Secret values are never
#        echoed, logged, or written anywhere except the plist itself.
#     4. prints the remaining manual dashboard steps (Vercel / Supabase / Resend /
#        LINE), which no script on this machine can do (no vercel CLI).
#
# WHY
#   The launchd plist duplicates SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_URL for
#   the twice-weekly export job. A rotation that only updates .env.local silently
#   breaks that job. Full rotation order + consumers map:
#   ~/Documents/Claude/credential-rotation-checklist.md
#
# HOW TO RUN
#   cd /Users/kornkrankeeratitejakarn/Desktop/CODE && bash scripts/rotate-creds-apply.sh --dry-run
#   cd /Users/kornkrankeeratitejakarn/Desktop/CODE && bash scripts/rotate-creds-apply.sh
#
#   --dry-run   show what WOULD change (names + lengths only); writes nothing and
#               does not touch launchd. Always run this first.
#
# On a live run the previous plist is copied to <plist>.bak.<timestamp> before any
# write, so a bad rotation is recoverable with a single cp.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.coffee-brew-log.export.plist"
LABEL="com.coffee-brew-log.export"

DRY_RUN=0
case "${1:-}" in
	--dry-run) DRY_RUN=1 ;;
	"") ;;
	*) echo "usage: $0 [--dry-run]" >&2; exit 2 ;;
esac

[ -f "$PLIST" ] || { echo "ERROR: launchd plist not found: $PLIST" >&2; exit 1; }
if [ ! -f "$REPO/.env" ] && [ ! -f "$REPO/.env.local" ]; then
	echo "ERROR: neither .env nor .env.local exists in $REPO" >&2
	exit 1
fi

if [ "$DRY_RUN" -eq 0 ]; then
	BACKUP="$PLIST.bak.$(date +%Y%m%d-%H%M%S)"
	cp "$PLIST" "$BACKUP"
	echo "Plist backed up to: $BACKUP"
fi

# All value handling happens inside python; only names and lengths ever reach stdout.
DRY_RUN="$DRY_RUN" PLIST="$PLIST" REPO="$REPO" python3 - <<'PYEOF'
import os, plistlib, sys

dry = os.environ["DRY_RUN"] == "1"
plist_path = os.environ["PLIST"]
repo = os.environ["REPO"]

def load_env(path, into):
    """Parse simple NAME=value lines; strips one layer of quotes. Values stay in memory only."""
    if not os.path.isfile(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            if k.startswith("export "):
                k = k[len("export "):].strip()
            if not k or not k.replace("_", "").isalnum():
                continue
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
                v = v[1:-1]
            into[k] = v

env = {}
load_env(os.path.join(repo, ".env"), env)        # base
load_env(os.path.join(repo, ".env.local"), env)  # local overrides win

with open(plist_path, "rb") as f:
    plist = plistlib.load(f)
ev = plist.get("EnvironmentVariables")
if not isinstance(ev, dict):
    sys.exit("ERROR: plist has no EnvironmentVariables dict")

rows, changed = [], 0
for key in sorted(ev):
    old = ev[key]
    if key in env:
        new = env[key]
        if new != old:
            status = "WOULD UPDATE" if dry else "UPDATED"
            if not dry:
                ev[key] = new
            changed += 1
        else:
            status = "unchanged (identical value)"
        rows.append((key, len(old), len(new), status))
    else:
        rows.append((key, len(old), "-", "kept (not in env files)"))

if not dry and changed:
    with open(plist_path, "wb") as f:
        plistlib.dump(plist, f)

w = max(len(r[0]) for r in rows + [("KEY", 0, 0, "")])
print(f"\n{'KEY'.ljust(w)}  {'OLD len':>7}  {'NEW len':>7}  STATUS")
for k, ol, nl, st in rows:
    print(f"{k.ljust(w)}  {str(ol):>7}  {str(nl):>7}  {st}")
verb = "would be updated" if dry else "updated"
print(f"\n{changed} key(s) {verb} in {plist_path}")
PYEOF

if [ "$DRY_RUN" -eq 1 ]; then
	echo
	echo "DRY RUN: nothing was written and launchd was not touched."
else
	plutil -lint "$PLIST" >/dev/null
	launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
	launchctl bootstrap "gui/$(id -u)" "$PLIST"
	if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
		echo "launchd job $LABEL reloaded OK"
	else
		echo "ERROR: $LABEL did not come back after bootstrap." >&2
		echo "Restore with: cp \"$BACKUP\" \"$PLIST\" && launchctl bootstrap gui/$(id -u) \"$PLIST\"" >&2
		exit 1
	fi
fi

cat <<'STEPS'

Remaining MANUAL dashboard steps (no vercel CLI on this machine):
  1. Vercel > coffee project > Settings > Environment Variables:
     confirm SUPABASE_SERVICE_ROLE_KEY is NOT present; if any VITE_ value was
     rotated, update it and REDEPLOY (VITE_ vars are baked at build time).
  2. Supabase > Brew Log > Settings > API Keys: revoke the OLD secret key —
     but only AFTER the export job verifies (next line).
     Verify: launchctl kickstart gui/$UID/com.coffee-brew-log.export
     then:   tail -5 ~/coffee-brew-log/backups/export.log
  3. Resend > API Keys: revoke the old SMTP key once Supabase Auth SMTP has the
     new one and a magic-link email has been received.
  4. LINE Developers console: Reissue both ChatBot channel access tokens
     (reissue revokes the old ones immediately).

Full order + consumers map: ~/Documents/Claude/credential-rotation-checklist.md
STEPS
