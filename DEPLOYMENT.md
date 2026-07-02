# Deployment — Coffee Brew Log

Two shells, two pipelines:

| Shell | Trigger | Pipeline |
|---|---|---|
| **Web PWA** | every push to `main` | Vercel auto-deploy (unchanged, zero-touch) |
| **iOS (TestFlight)** | native-relevant changes only | `bash scripts/deploy-ios.sh` (one command) |

Cadence policy (decided 2026-07-02): native builds ship when the shell, plugins,
or BLE work change — web-only features reach the phone through the PWA anyway.
Distribution: TestFlight internal now; public App Store is a later phase.

Bundle `com.mark.brewlog` · Team `ZCS5Y23P62` · ASC API key `DUPV266J6S`
(`~/.appstoreconnect/private_keys/AuthKey_DUPV266J6S.p8`, issuer
`b0021702-5324-4cc1-9ddd-66a5a1535fe6`). Pipeline forensically mirrored from
Buffy's 7 shipped builds on this same Mac/team.

---

## One-time setup (before build 1)

1. ~~Apple Developer account + Xcode + ASC API key~~ — done (Buffy).
2. ~~Bundle ID registration~~ — auto-handled: the first `deploy-ios.sh` export
   runs `-allowProvisioningUpdates` with the API key, which registers
   `com.mark.brewlog` and mints the App Store profile on the portal.
3. **Create the app record on App Store Connect** (website-only — the public
   API cannot create apps, verified 2026-07):
   [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps →
   `+` → New App → platform iOS, bundle `com.mark.brewlog`, SKU e.g.
   `brewlog-001`, name **"Coffee Brew Log"** (if taken: **"BrewLog by Mark"**
   — the home-screen name stays "Coffee Brew Log" via CFBundleDisplayName
   regardless; for internal TestFlight the listing name is cosmetic).
   - Order note: run `deploy-ios.sh` once first (its export registers the App ID
     even though the upload step will fail without the app record), or register
     the bundle ID in the portal UI — the New App form needs the ID to exist.
4. **TestFlight internal group**: App → TestFlight → Internal Testing → add
   yourself. Installs land in the TestFlight app on the phone (same as Buffy).

## Per release (after one-time setup)

```bash
bash scripts/deploy-ios.sh
```

Bumps the build number → SW-free web build → `cap sync` → archive → export
(signed via API key) → prints entitlements for eyeballing → uploads. ~10 min
including ASC processing; the build auto-clears export compliance
(`ITSAppUsesNonExemptEncryption=false` is in Info.plist) and appears in
TestFlight with no Beta App Review (internal testers only). Commit the version
bump the script makes.

## Signing model & the tripwire

Current flow: **unsigned archive, sign at export, automatic style** — proven by
Buffy builds 1–6 and safe here because this app has **zero entitlements**.

**Tripwire — switch to manual signing when any entitlement is added** (App
Groups, iCloud, HealthKit, BLE *background* modes; plain foreground BLE needs
only an Info.plist string, no entitlement): sign-at-export silently strips
entitlements (Buffy's builds 2–6 shipped broken because of this). The manual
flow per Buffy build 7: Apple Distribution cert + App Store profile (both
API-creatable), `CODE_SIGN_STYLE=Manual` in Release config, ExportOptions
`signingStyle=manual` + `provisioningProfiles` map, and archive WITHOUT
`CODE_SIGNING_ALLOWED=NO`. Always verify with
`codesign -d --entitlements :- Payload/App.app` before upload (the script
prints this on every run).

Other inherited gotchas: profiles snapshot capabilities at creation — after
enabling a capability, regenerate the App Store profile; cached profiles live
in `~/Library/Developer/Xcode/UserData/Provisioning Profiles/` (clear to force
refresh). altool on Xcode 26 has rare silent-failure reports — if a build never
appears in ASC after ~20 min, check the ASC email or re-upload; fallback is
ExportOptions `destination: upload` (skips altool entirely).

## Later phase — public App Store

Same pipeline; add before submission: App Review metadata (description,
keywords, support URL), privacy nutrition labels (declare Supabase-synced user
content: email for auth, brew data), screenshots (6.9" + 6.5" sets), age
rating, and a marketing/privacy-policy URL. First submission goes through App
Review (1–2 days typical). The listing name chosen at app-record creation can
be changed then.

## Rotation coupling

The Supabase service-role key rotation (still pending) does NOT touch this
pipeline. But if the ASC API key `DUPV266J6S` is ever revoked, update
`scripts/deploy-ios.sh` (KEY_ID/ISSUER_ID) and drop the new `.p8` into
`~/.appstoreconnect/private_keys/`.
