# Coffee Brew Log

Personal coffee brew log for espresso and pour-over — a local-first SvelteKit PWA with cloud sync, an iOS app shell, and one-tap publishing to a companion blog.

- **Local-first:** every brew is stored on-device in IndexedDB (Dexie), so the app works fully offline.
- **Sync (web):** signed-in devices sync through Supabase (magic-link auth, last-write-wins).
- **iOS:** the same codebase ships as a native app via Capacitor (App Store submission in review). The iOS build is local-first with iCloud (CloudKit) sync — no login, no Supabase on device.
- **Blog:** selected brews publish to [Brew Sheet](https://github.com/Mark6611/html-brew), a static Astro blog that reads from the shared Supabase backend.

## Where the main code lives

**`src/` is the app.** Everything else at the root is packaging (iOS shell, deploy config, App Store tooling).

```text
src/
├── routes/              Pages (SvelteKit file-based routing)
│   ├── +page.svelte       Home / today view
│   ├── brews/             Brew list, detail, and "log a new brew" form
│   ├── bags/              Coffee-bag inventory (list, detail, new)
│   ├── stats/             Brewing stats and trends
│   ├── settings/          Settings, export, account
│   └── auth/              Magic-link sign-in + callback
└── lib/
    ├── db/              ⭐ Data layer — START HERE
    │   ├── repository.ts   The ONLY database entry point. Components never
    │   │                   touch Dexie/Supabase directly; they call this.
    │   ├── database.ts     Dexie (IndexedDB) schema
    │   └── types.ts        Brew, Bag, and related record types
    ├── brews/           Brew domain logic (ratio/extraction math, dial-in
    │                    suggestions, grind handling, repeat-brew prefill)
    ├── bags/            Bag domain logic (remaining weight, roast levels)
    ├── stats/           Stats aggregation for the trends page
    ├── scale/           BLE smart-scale protocol + live shot tracking
    ├── origin/          Coffee-origin lookup/normalization
    ├── photo/           Client-side photo resizing
    ├── blog/            Publish-to-blog config
    ├── components/      Reusable UI components (cards, pickers, badges…)
    ├── auth.svelte.ts   Supabase auth state
    └── native.ts        Capacitor/native-shell integration
```

Supporting directories:

| Path | What it is |
|---|---|
| `ios/` | Capacitor-generated Xcode project (the iOS app shell) |
| `supabase/` | SQL migrations for the sync backend |
| `scripts/` | Tooling: App Store Connect automation (`asc-*.mjs`), CSV/JSON export, icon + screenshot generation |
| `static/` | PWA manifest, icons, service-worker assets |
| `docs/`, `*.md` | [DEPLOYMENT.md](DEPLOYMENT.md), [APP-STORE-SUBMISSION.md](APP-STORE-SUBMISSION.md), [UAT-NATIVE.md](UAT-NATIVE.md), milestones |

## Data model conventions

- `grindSetting` is a **string**, not a number — grinders use different scales.
- `brewedAt` is stored as an **ISO string**, not a `Date`.
- Computed values (brew ratio, extraction) are derived at read time, never stored.
- All DB access goes through `src/lib/db/repository.ts` — keep that boundary.

More conventions in [CLAUDE.md](CLAUDE.md).

## Develop

```sh
npm install
cp .env.example .env   # Supabase URL + anon key (sync is optional in dev)
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | Type-check (svelte-check) |
| `npm run lint` / `format` | Prettier + ESLint |
| `npm run build` | Production web build (deployed on Vercel) |
| `npm run ios` | Capacitor build → sync → open Xcode |
| `npm run export` | Local CSV/JSON backup of the database |

## Sibling projects

- [html-brew](https://github.com/Mark6611/html-brew) — Brew Sheet, the public blog this app publishes to.
- [chawan](https://github.com/Mark6611/chawan) — the matcha-session sibling of this app.
