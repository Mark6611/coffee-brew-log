# Coffee Brew Log — Handoff

Living document. Update at the end of each significant session.

Latest commit captured: **`7f36403`** (Settings: Sync now button + last-sync indicator)

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

## V2 — Phase 2 (Supabase + auth + sync, in progress)

| Stage | Shipped |
|---|---|
| **1. Backend** | Supabase project "Brew Log", `bags` + `brews` Postgres tables with quoted camelCase columns, RLS policies (per-user SELECT / INSERT / UPDATE / DELETE), magic-link auth, site URL + redirect URL configured. |
| **2. Auth client** | `@supabase/supabase-js` installed, `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` env vars, `src/lib/supabase.ts` client, `src/lib/auth.svelte.ts` runes-based auth state, `/auth` route with OTP code flow (6–10 digit), `/auth/callback`, Settings → Account section, **Resend SMTP** wired as custom email provider. |
| **3. Sync** | `src/lib/sync.ts` with push helpers (per-write upsert), `fullSync()` (push everything + pull everything, merge into local without clearing, log to console), `brewlog:synced` custom event for page refresh, repository wired to push on every write, Postgres `numeric`-string → JS-number coercion before Zod parse, Home links on `/brews` + `/bags`, **Sync now** button in Settings with status + last-sync timestamp. |
| **4. First-login migration** | Implicit — `fullSync` pushes local rows on first auth, then pulls. Pre-existing local data gets `userId` stamped and lands in Supabase. |
| **5. Multi-device verification** | **Pending** — sign in on a second device / browser, confirm data appears. |

---

## Architecture decisions worth not re-discovering

- **Sync model**: offline-first. Local IndexedDB is the primary read source. Writes go local first, then push to Supabase (fire-and-forget). `fullSync` only merges server data in — never clears local (the data-loss bug previously seen). Trade-off: deletes on device A while device B is offline won't reflect on device B until A's `delete*OnServer` call lands during a window B is online.
- **No tombstones for deletes.** If cross-device delete propagation becomes a problem, add a `deletedAt` column and tombstone rows.
- **Postgres columns are quoted camelCase** (not snake_case) — eliminates client-side field-name mapping. Trade-off: hand-written SQL queries need quotes around identifiers.
- **`numeric` columns return as strings** from Postgres / postgrest — `src/lib/sync.ts` coerces them via `normalizeFromServer` before Zod parse. Numeric keys are explicitly enumerated in `BAG_NUMERIC_KEYS` / `BREW_NUMERIC_KEYS`. Add new numeric fields to these sets when extending schemas.
- **Supabase JS client** maintains auth state globally. `auth.svelte.ts` exposes `auth.user` as a reactive read.
- **Per CLAUDE.md**: computed values stay derived. `bagConsumption` (remaining grams) is derived, not stored. The bag-design spec's `remainingGrams` field was rejected for this reason.

## What's open

### Verification

- The numeric-string → number coercion fix landed in `85be12b` and `7f36403`. **Confirm on next session** by hard-refreshing the app and watching the `[sync]` console line — should say `pulled: N bags + N brews` with N matching the rows in Supabase Table Editor.
- **Multi-device sync** — sign in on phone PWA with same email used on laptop, confirm data appears.

### Security TODO

- **Rotate the Resend API key**. The current key was accidentally screenshot-shared earlier (`re_PgbrS3q6_…`). Steps:
  1. Resend dashboard → API Keys → delete that key.
  2. Create a replacement (same name + sending permission).
  3. Paste new key into Supabase → Authentication → Email → SMTP Password.
  4. Save.

### Phase 2 not yet started

- **Invited authors** (other people contribute brew entries).
- **Public blog** (the "blog" item from CLAUDE.md).
- **Real-time sync** via Supabase subscriptions — instead of "manual refresh / on-auth-only", listen for server-side changes and update local cache live.

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

## Prompt for the next session

Paste this into your first message of a fresh session:

```
Picking up the Coffee Brew Log project. Previous session ended mid-Phase 2 (Supabase + sync).

Where we left off:
- V1 (local PWA) — fully shipped, v1.0 through v1.10. Solo IndexedDB, deployed to Vercel.
- V2 / Phase 2 — Supabase + auth (magic-link OTP) + Resend SMTP + initial sync layer all built and partially verified. Sign-in works. Push to Supabase confirmed (data visible in Table Editor). Pull was returning 0 due to a Postgres numeric-string vs JS-number type mismatch — fixed in commits 85be12b and 7f36403 but not yet verified on the deployed app.

First thing to do this session:
1. Open https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app on laptop, hard-refresh.
2. Sign in if needed (Settings → Account → Sign in, or directly /auth).
3. Open DevTools → Console.
4. Confirm the [sync] log line shows non-zero "pulled: N bags + N brews".
5. Navigate to /bags — bags should appear.

If verified, candidate next moves:
(A) Multi-device sync verification — sign in on the phone PWA with the same email, log a brew, refresh laptop, confirm it appears.
(B) Rotate the Resend API key (security hygiene — old key was screenshot-shared).
(C) Real-time sync via Supabase subscriptions — instead of "manual refresh / on-auth-only", listen for server-side changes and update local cache live.
(D) Phase 2 "invited authors" or "public blog" features (per CLAUDE.md).
(E) Anything else the user wants.

CLAUDE.md and memory files will load automatically; respect the conventions there (repository boundary, derived values, no Phase 2 features into Phase 1 — though we're now in Phase 2). Don't add Co-Authored-By: Claude trailers to commits.

Latest commit on main: 7f36403.
```

Read `docs/HANDOFF.md` (this file) for the full V1 + V2 recap and architecture notes.
