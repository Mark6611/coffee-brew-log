// Check this branch against origin/main BEFORE pushing (or before a long verify).
//
// A parallel Claude session works on this repo from other worktrees and moves
// main underneath this one. Across past sessions that produced 77 fetch/rebase
// calls with a ~10% conflict rate — and the expensive failure mode was never the
// rebase itself, it was discovering the divergence at PUSH time, after having
// already run a full verify + screenshot pass against a stale tree.
//
// This reports the divergence, and names which of the incoming files this branch
// also touches (that overlap is exactly where conflicts land).
//
// Run: node scripts/sync-check.mjs [--rebase]
//   (no flag) report only. Exit 1 if behind, so it can gate a push.
//   --rebase  perform the rebase when the tree is clean, then re-report.

import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DO_REBASE = process.argv.includes('--rebase');
const sh = (c) => execSync(c, { cwd: REPO, encoding: 'utf8' }).trim();
const shSafe = (c) => {
	try {
		return sh(c);
	} catch {
		return '';
	}
};

// Always say which repo — sibling projects live on this machine and the shell
// resets cwd between calls, so "which repo am I in" has been a real hazard.
console.log(`repo:   ${sh('git rev-parse --show-toplevel')}`);
console.log(`branch: ${sh('git rev-parse --abbrev-ref HEAD')}`);

const dirty = sh('git status --porcelain');
if (dirty) console.log(`tree:   DIRTY (${dirty.split('\n').length} files)`);
else console.log('tree:   clean');

try {
	sh('git fetch origin --quiet');
} catch {
	console.error('\nCould not reach origin — cannot tell whether this branch is stale.');
	process.exit(1);
}

const behind = Number(sh('git rev-list --count HEAD..origin/main'));
const ahead = Number(sh('git rev-list --count origin/main..HEAD'));
console.log(`ahead:  ${ahead}   behind: ${behind}\n`);

if (behind === 0) {
	console.log('In sync with origin/main — safe to push.');
	process.exit(0);
}

console.log(`origin/main has ${behind} commit(s) not in this branch:`);
for (const l of shSafe('git log --oneline HEAD..origin/main').split('\n').filter(Boolean))
	console.log(`  ${l}`);

// The overlap is the useful part: files changed on BOTH sides are where a
// rebase will actually stop.
const theirs = new Set(
	shSafe('git diff --name-only HEAD...origin/main').split('\n').filter(Boolean)
);
const mine = new Set(shSafe('git diff --name-only origin/main...HEAD').split('\n').filter(Boolean));
const overlap = [...mine].filter((f) => theirs.has(f));
console.log(
	`\nfiles changed — theirs: ${theirs.size}, mine: ${mine.size}, OVERLAPPING: ${overlap.length}`
);
for (const f of overlap.slice(0, 15)) console.log(`  ! ${f}`);
if (overlap.length > 15) console.log(`  … and ${overlap.length - 15} more`);

if (!DO_REBASE) {
	console.log('\nRebase before pushing:  node scripts/sync-check.mjs --rebase');
	console.log('(then RE-RUN npm run verify — the combined tree is not what you tested)');
	process.exit(1);
}

if (dirty) {
	console.error('\nRefusing to rebase with a dirty tree — commit or stash first.');
	process.exit(1);
}

console.log('\nRebasing onto origin/main…');
try {
	execSync('git rebase origin/main', { cwd: REPO, stdio: 'inherit' });
} catch {
	console.error(
		'\nRebase stopped on conflicts. Resolve them, `git add` the files, then ' +
			'`git rebase --continue`. In this repo the conflicts have consistently been ' +
			'keep-BOTH-sides (their refactor + your change), not either/or.'
	);
	process.exit(1);
}
console.log(
	`\nRebased. ahead: ${sh('git rev-list --count origin/main..HEAD')}, behind: ${sh('git rev-list --count HEAD..origin/main')}`
);
console.log('RE-RUN npm run verify before pushing — the combined tree is not what you tested.');
