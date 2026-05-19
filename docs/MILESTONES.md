# Coffee Brew Log — Milestones

A versioned record of what's been built and the architectural choices behind each piece. Update at the end of any significant session.

---

## V1 — Phase 1 (solo, IndexedDB only)

| Version | Shipped |
|---|---|
| **v1.0** | SvelteKit + TS + Tailwind v4 + Dexie + Zod scaffold; PWA via `@vite-pwa/sveltekit`; deployed to Vercel. |
| **v1.1** | Brew entry form + list, equipment-aware grind labels (Lagom Casa / Fellow Ode 2), Acaia-style m:ss time inputs, quick-pick ratio buttons. |
| **v1.2** | Static adapter, PWA manifest + service-worker registration, `vercel.json`. |
| **v1.3** | Decimal ratings (4.5 / 5). |
| **v1.4** | Visual redesign in 5 chunks: cream/copper tokens, Newsreader + Geist + Geist Mono fonts, dark-mode toggle, `<BrewCard>` / `<MethodPicker>` / `<Chip>` components, restructured home + list + form, bean app icon, empty state with bean medallion. |
| **v1.5** | Bag inventory — `Bag` schema, Dexie v3, `/bags` routes (list / new / edit), `<BagPicker>` autocomplete with inline-create + sessionStorage persistence, `<ProcessBadge>`, brew-to-bag linking, freshness eyebrow, day-grouped brew list, filter pills, search, FAB, `weekStats` helper. |
| **v1.6** | `/bags/[id]` detail (consumption bar, key facts, archive), archive functionality, active/archived toggle on list. |
| **v1.7** | `/brews/[id]` detail (hero ratio block, variables card, rating card, bag preview, duplicate + delete footer), `/brews/[id]/edit` with mode chrome + dirty tracking + Reset bar, `/stats` page (sparkbar, method split, ratio histogram, time-of-day heatmap, pull-quote engine), `<StarRow>` + `<BalanceScale>` components. |
| **v1.8** | Interactive star rating (tap half / full), half-star min, per-field dirty markers on edit. |
| **v1.9** | `/settings` page, JSON export + import (Zod-validated, bulk upsert). |
| **v1.10** | PNG icons (180 / 192 / 512) via `scripts/generate-icons.mjs`, apple-touch-icon, wipe-all-data with double confirm. |

## V2 — Phase 2 (Supabase + auth + sync)

| Stage | Shipped |
|---|---|
| **1. Backend** | Supabase project "Brew Log", `bags` + `brews` Postgres tables with quoted camelCase columns, RLS policies (per-user SELECT / INSERT / UPDATE / DELETE), magic-link auth, site URL + redirect URL configured. |
| **2. Auth client** | `@supabase/supabase-js` installed, `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` env vars, `src/lib/supabase.ts` client, `src/lib/auth.svelte.ts` runes-based auth state, `/auth` route with OTP code flow (6–10 digit), `/auth/callback`, Settings → Account section, **Resend SMTP** wired as custom email provider. |
| **3. Sync** | `src/lib/sync.ts` with push helpers (per-write upsert), `fullSync()` (push everything + pull everything, merge into local without clearing, log to console), `brewlog:synced` custom event for page refresh, repository wired to push on every write, Postgres `numeric`-string → JS-number coercion before Zod parse, Home links on `/brews` + `/bags`, **Sync now** button in Settings with status + last-sync timestamp. |
| **4. First-login migration** | Implicit — `fullSync` pushes local rows on first auth, then pulls. Pre-existing local data gets `userId` stamped and lands in Supabase. |

---

## Architecture decisions worth not re-discovering

- **Sync model**: offline-first. Local IndexedDB is the primary read source. Writes go local first, then push to Supabase (fire-and-forget). `fullSync` only merges server data in — never clears local (the data-loss bug previously seen). Trade-off: deletes on device A while device B is offline won't reflect on device B until A's delete-on-server call lands during a window B is online.
- **No tombstones for deletes.** If cross-device delete propagation becomes a problem, add a `deletedAt` column and tombstone rows.
- **Postgres columns are quoted camelCase** (not snake_case) — eliminates client-side field-name mapping. Trade-off: hand-written SQL queries need quotes around identifiers.
- **`numeric` columns return as strings** from postgrest — `src/lib/sync.ts` coerces them via `normalizeFromServer` before Zod parse. Numeric keys are explicitly enumerated in `BAG_NUMERIC_KEYS` / `BREW_NUMERIC_KEYS`. Add new numeric fields to these sets when extending schemas.
- **Supabase JS client** maintains auth state globally. `auth.svelte.ts` exposes `auth.user` as a reactive read.
- **Per CLAUDE.md**: computed values stay derived. `bagConsumption` (remaining grams) is derived, not stored. The bag-design spec's `remainingGrams` field was rejected for this reason.

---

## Open scope

Not yet started but called out in CLAUDE.md or the bag-design spec:

- **Multi-device sync verification** — sign in on a second device with the same email, confirm data appears live.
- **Real-time sync via Supabase subscriptions** — instead of "manual refresh / on-auth-only," listen for server-side changes and update local cache live.
- **Invited authors** — other people contribute brew entries to a shared log.
- **Public blog** — the "blog" item from CLAUDE.md.
- **Tombstone-based delete propagation** — only needed if multi-device cross-deletes become a problem in practice.

---

## Key files

```
src/lib/supabase.ts                    Client init from env vars
src/lib/auth.svelte.ts                 Reactive auth state, signOut
src/lib/sync.ts                        Push helpers, fullSync, auth listener,
                                       Postgres-numeric coercion
src/lib/db/repository.ts               All DB access — wires sync.push* on writes
src/lib/db/types.ts                    Zod schemas (Brew, Bag, Process)
src/lib/db/database.ts                 Dexie v3 schema
src/routes/auth/+page.svelte           Sign-in form (email → OTP)
src/routes/auth/callback/+page.svelte  Magic-link redirect handler
src/routes/settings/+page.svelte       Account, sync indicator, export/import, wipe
```
