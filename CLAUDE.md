# Project conventions

## Architecture

- All database access goes through `src/lib/db/repository.ts`.
- Components never import the Dexie `db` instance directly.
- Reason: phase 2 swaps the implementation to Supabase. The repository interface stays. Preserve this boundary.

## Data model

- `grindSetting` is a string, not a number (grinders use different scales).
- `brewedAt` is stored as an ISO string, not a `Date` object.
- Computed values (e.g. brew ratio) are derived at read time, never stored.

## Scope discipline

- Phase 1 is solo, local-only (IndexedDB via Dexie). No auth, no backend.
- Phase 2 adds Supabase, magic-link auth, invited authors, and a blog.
- Do not add phase 2 features into phase 1 code "to save time later."

## Sibling projects on this machine (avoid wrong-repo operations)

- `~/Desktop/CODE` — THIS repo: the coffee brew-log PWA (SvelteKit).
- `~/Desktop/buffy` — Buffy workout tracker (SvelteKit + Capacitor iOS → TestFlight).
  Has its own CLAUDE.md and ship pipeline (`scripts/ship.sh` / the ship-buffy skill).
- `~/Desktop/html-brew` — Brew Sheet, the Astro blog companion to this app.
- `~/Desktop/chawan` — matcha brew-log PWA (sibling of this app).
  Before ANY git commit/push: state which repo you are in. The Bash tool resets cwd
  between calls — never assume the previous call's directory.

## Deliverables

When generating an artifact (export, report, dashboard), always print its absolute
path and open/reveal it — never leave outputs to be hunted for.
