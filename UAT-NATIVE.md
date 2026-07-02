# UAT — Coffee Brew Log native shell (iOS)

Build 1 · bundle `com.mark.brewlog` · Team `ZCS5Y23P62` · Capacitor 8 (SPM)

Per the Buffy lesson, **build 1 is pipeline validation**: a bare webview shell with
launch polish, no native features. It exists to prove archive → TestFlight →
install before any BLE work starts.

---

## Verified in the simulator / at build time (no action needed)

- Native shell compiles clean against Xcode 26.5 (zero warnings, SPM deps resolve).
- Native bundle contains **no service worker** (`BUILD_TARGET=capacitor` disables
  the PWA plugin); the web/Vercel build still ships one.
- App icon + light/dark splash generated from `static/icon.svg` into the asset
  catalog (`assets/` holds the 1024px sources; regenerate with
  `npx capacitor-assets generate --ios --splashBackgroundColor '#F4EFE6' --splashBackgroundColorDark '#16120e'`).
- Signing pre-wired: `DEVELOPMENT_TEAM = ZCS5Y23P62`, automatic style — Xcode
  should show no signing errors on first open.
- svelte-check + 60 unit tests green; web PWA build unaffected.

## Needs your on-device confirmation

1. **Install path (once):** `npm run ios` → Xcode opens → select your iPhone →
   Run. (Direct cable run needs Developer Mode on the phone: Settings → Privacy
   & Security → Developer Mode. TestFlight later needs an App Store Connect app
   record for `com.mark.brewlog` — listing name must be globally unique;
   home-screen name stays "Coffee Brew Log" either way.)
2. **Launch feel:** cold-launch should show the splash (icon on paper), fade
   ~200ms into the app. No white flash, no black gap, no hang on the splash.
3. **Safe areas:** content and the floating theme button sit below the Dynamic
   Island; nothing hides behind the home indicator.
4. **Status bar:** readable in dark theme; cycle the theme toggle — status-bar
   text should flip with it.
5. **Supabase over `capacitor://` — the unproven part** (Buffy was offline, no
   lesson to inherit): Settings → Account → sign in → the OTP email code flow →
   Sync now → data appears. If sign-in or sync fails ONLY in the native app,
   screenshot the error — likely origin/CORS, fixable.
6. **Keyboard:** focus the grind/notes inputs — no page zoom-jump on focus.
7. **Export button (Settings):** blob downloads behave differently in a webview —
   try it once; if it does nothing, that's expected and goes on the fix list.

## Full test in ~5 minutes

Run → watch launch (2) → scroll home (3) → cycle theme twice (4) → sign in +
Sync now (5) → open /brews/new, tap grind field (6) → Settings → Export (7).

## Open questions for you

- Keep direct-cable installs, or set up the TestFlight record for
  `com.mark.brewlog` now? (Archive/export config is already in
  `ios/ExportOptions.plist`; signed archive required — unsigned archives strip
  entitlements per the Buffy provisioning lesson. No entitlements yet, but the
  habit matters once BLE background modes arrive.)
- Ready to schedule the Acaia BLE round (design + `@capacitor-community/bluetooth-le`)
  once build 1 passes on your phone?
