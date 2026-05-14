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
