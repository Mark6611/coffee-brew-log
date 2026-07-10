# Coffee Brew Log → App Store submission pack

Everything to paste into App Store Connect for the 1.0 public release. Listing name is
**BrewLog by Mark** (Apple ID 6786772685 — "Coffee Brew Log" was taken); home-screen name stays
**Coffee Brew Log**. Mirrors the Buffy/Chawan submissions.

---

## 1. App Information (ASC → App Information)

- **Primary category:** Food & Drink
- **Secondary category:** Lifestyle *(optional — helps discovery)*
- **Content rights:** does NOT contain third-party content → "No". *(Acaia is named functionally to
  label a hardware connection, not as displayed third-party content.)*
- **Age rating:** 4+ — no objectionable content. 2026 questionnaire: answer "None" to every content
  category → results in 4+.
- **Privacy Policy URL:** `https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app/privacy`
  ✅ (page built this session; also linked in-app under Settings → About).

## 2. Version 1.0 metadata (ASC → the 1.0 version)

**Subtitle** (≤30 chars):
```
Your espresso & pour-over log
```

**Promotional text** (≤170 chars, editable anytime without review):
```
Log a shot in seconds, dial in by roast level, and let your Acaia scale fill in the weight and time. Private by default — no ads, no account required.
```

**Description:**
```
Coffee Brew Log is a fast, private log for people who care how their coffee tastes — espresso and
pour-over, tracked without the clutter.

LOG IN SECONDS
• One-tap “brew again” repeats any past brew, so your daily cup is two taps
• Espresso and pour-over, each with the fields that actually matter
• Attach a photo of the bag label or the cup

DIAL IN BY ROAST
• Roast-aware grind guidance and a next-shot suggestion after each espresso
• Target brew-time windows so you know which way to move the grinder
• Mark a bag “dialed” and every new shot starts from your settled recipe

WEIGH WITHOUT TOUCHING YOUR PHONE
• Connect an Acaia scale over Bluetooth to read live weight and shot time
• The yield and time fill themselves in as you brew, then auto-stop when the flow settles

KNOW YOUR BEANS
• Freshness, remaining grams, and cost per cup for every bag
• Ratings, tasting notes, and brew ratios computed for you

PRIVATE BY DESIGN
• Your data lives on your device. No account needed to use the app.
• Optional sign-in syncs your log across your own devices through your private account
• No ads, no analytics, no tracking

Coffee Brew Log is built for one person: you.
```

**Keywords** (≤100 chars, comma-separated, no spaces):
```
coffee,espresso,pourover,brew,log,dialin,grind,ratio,acaia,scale,barista,beans,tracker,recipe
```

**Support URL:** `https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app`
**Marketing URL:** *(optional — leave blank)*

**What's New in This Version** (1.0):
```
First public release of Coffee Brew Log.
```

## 3. App Privacy ("nutrition label" — ASC → App Privacy)

Brew Log DOES collect data when a user signs in (unlike Buffy). Declare honestly, matching Chawan:

- **Contact Info → Email Address** — collected, **Linked to identity**, purpose **App Functionality**
  (magic-link sign-in / account identity). NOT used for tracking.
- **User Content → Other User Content** — the bags, brews, tasting notes, and **photos** a signed-in
  user syncs. Collected, **Linked to identity**, purpose **App Functionality**. NOT tracking.
  *(Note: Brew Log photos DO leave the device when synced — Chawan's did not. Declare User Content.)*
- **Identifiers → User ID** — the account id. Collected, **Linked to identity**, App Functionality.
- **Tracking:** NO. No data is used to track across apps/sites; no ad/analytics SDKs.

If the user never signs in, nothing is collected — but ASC labels describe the app's capability, so
the above is the correct disclosure.

## 4. App Review notes (ASC → Version → Notes for Review)

```
Coffee Brew Log is a personal coffee brewing log. It requires NO account and works fully offline —
you can review the core experience immediately: add a bag, log an espresso or pour-over, rate it,
and see it in History and Stats.

Optional, and the app is fully functional without them:
• Sign in — optional, only for syncing across your own devices. It uses a one-time code emailed to
  you (magic-link); there is no password. A reviewer can skip sign-in entirely.
• Acaia scale — an optional Bluetooth connection that fills in weight and shot time while brewing.
  A physical Acaia scale is required to see live data, so a reviewer without one will see the
  “Connect” state; this does not affect any core feature. Screen recording available on request.

No ads, no analytics, no tracking. Privacy policy:
https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app/privacy
```

## 5. Screenshots

Universal app (iPhone + iPad), so ASC requires both:
- **6.9" iPhone** (1320 × 2868) — required set, 1–10 images of the app in use (not splash/login).
- **13" iPad** (2064 × 2752) — required because the app supports iPad.
Captured this session with seeded sample data; see `appstore-screenshots/` and
`appstore-screenshots-ipad13/`.

## 6. Build

- Signed App Store build with the **camera + photo-library usage strings** (added this session —
  build 3 would crash when picking a photo). Submit **build 4+**.
- Export compliance: `ITSAppUsesNonExemptEncryption = false` ✅

## Status snapshot
| Requirement | Status |
|---|---|
| Photo permission strings (camera/library) | ✅ added this session |
| Sign-out wipes local copy | ✅ added this session |
| In-app data deletion (local + server) | ✅ Settings → Danger zone |
| Privacy policy (URL + in-app link) | ✅ built (deploys with web push) |
| Export compliance | ✅ `ITSAppUsesNonExemptEncryption = false` |
| Age rating (4+) | ⬜ complete questionnaire |
| App Privacy label | ⬜ enter per §3 |
| Category / subtitle / description / keywords / support URL | ⬜ paste from above |
| Screenshots (6.9" + iPad 13") | ⬜ capture + upload |
| Review notes | ⬜ paste from §4 |
| Signed build 4 attached | ⬜ build + attach |
