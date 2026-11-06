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

## Layout (phones, iPad, and the iPhone Duo)

- Every page is a `mx-auto max-w-2xl` column (672px): it fills any viewport up
  to 672px and centres above it (iPad, desktop).
- **The iPhone Duo fills in every pose, via `html[data-foldable]`.** Measured by
  sibling Buffy on the iOS 27.2 Duo simulator: closed = outer display 466×678pt;
  open = inner display **951×669pt LANDSCAPE with the hinge down the middle**
  (669×951 is the open-and-turned pose, unmeasured). By width alone 951pt centres
  the column like an iPad. CSS cannot tell the two apart — WKWebView on 27.2 has
  no viewport-segments media features and no `navigator.devicePosture` — so
  `ios/App/App/HingePlugin.swift` (UIHingeInteraction, iOS 27.1+) reports the
  hinge, `src/lib/hinge.ts` sets `data-foldable` on `<html>`, and `layout.css`
  lets the column fill under it (unlayered — Tailwind's utilities layer beats any
  layered override). The attribute means "has a hinge", NOT "is open", and is
  never cleared: status and resize land a beat apart while folding.
- Safe areas: left and right are handled SEPARATELY — the Duo's status column
  takes **84pt on the right** (+34pt bottom) on both displays, sometimes 82pt at
  the top instead on the outer one. `body` pads every side by its inset; anything
  `position: fixed` (the FABs, ConfirmSheet) sits outside that padding and must
  add its own. Any new edge-anchored overlay needs the same.
- The input focus-zoom floor's band stops at 600px, so the Duo's inner poses get
  it only through `data-foldable` — keep both rules in step (layout.css).
- Never cache `innerWidth` or branch on orientation: folding resizes the window
  continuously, and CSS must just reflow.
- Gate: `npm run build && npm run verify:duo` (needs a build; the native
  `npm run ios:sync` build works too — it only drops the service worker). It sets
  `data-foldable` itself (so the native timing is pinned only by
  `src/lib/hinge.test.ts` and an on-device run), rewrites `env()` in the served
  CSS **and JS** to the measured insets (Chromium reports them all as 0), and
  stands a 14px root in for xSmall Dynamic Type (Chromium's 1rem is always 16px).

## iOS 27 SDK: the scene lifecycle is mandatory

- An app built with the iOS 27 SDK without a `UIApplicationSceneManifest` is
  killed by UIKit ~6s after launch on iOS 27 (SIGTRAP in
  `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`). Linked-on-SDK
  gate: the same binary runs on iOS 26, so it only shows up the first time you
  build with Xcode 27. Adopted with Capacitor 8.5+ (`migrateToUIScene`, which no
  CLI command exposes — it was run from `@capacitor/cli/dist/tasks`).
- **The window comes from `Main.storyboard`, not from code.** The manifest names
  the storyboard, so UIKit builds the window — rooted at `ViewController`, where
  the app-local plugins (CloudSync, Hinge) are registered — before
  `scene(_:willConnectTo:)` runs. Never adopt Capacitor's template body there: it
  builds a second window with a plain `CAPBridgeViewController()`, which silently
  drops both plugins.
- Build for the simulator with `-destination 'generic/platform=iOS Simulator'`:
  `xcodebuild` lists no iOS 27.x simulator as a destination. Sign it ad-hoc
  (`CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=
PROVISIONING_PROFILE_SPECIFIER=`), NOT `CODE_SIGNING_ALLOWED=NO`: an unsigned
  build has no iCloud entitlement, and on iOS 27.2 CloudKit then throws inside its
  own `dispatch_once` at launch, which libdispatch makes fatal — past the `@try`
  in `CloudSyncSafeContainer`. Signed builds (TestFlight, App Store) carry the
  entitlement and are unaffected. The Duo needs the
  device-specific `iOS-27-2-iPhone19-4` runtime; if 27.x runtimes vanish from
  `simctl list runtimes`, `xcrun simctl runtime scan-and-mount` re-registers them.

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
