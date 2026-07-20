# Coffee Brew Log → App Store submission pack

Everything to paste into App Store Connect for the 1.0 public release. Listing name is
**BrewLog by Mark** (Apple ID 6786772685 — "Coffee Brew Log" was taken); home-screen name stays
**Coffee Brew Log**. Mirrors the Buffy/Chawan submissions.

---

## 1. App Information (ASC → App Information)

- **Primary category:** Food & Drink
- **Secondary category:** Lifestyle _(optional — helps discovery)_
- **Content rights:** does NOT contain third-party content → "No". _(Acaia is named functionally to
  label a hardware connection, not as displayed third-party content.)_
- **Age rating:** 4+ — no objectionable content. 2026 questionnaire: answer "None" to every content
  category → results in 4+.
- **Privacy Policy URL:** `https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app/privacy-policy.html`
  ✅ (page built this session; also linked in-app under Settings → About).

## 2. Version 1.0 metadata (ASC → the 1.0 version)

**Subtitle** (≤30 chars):

```
Your espresso & pour-over log
```

**Promotional text** (≤170 chars, editable anytime without review):

```
Log a shot in seconds and dial in by roast level with a compass that tells you the one move to make next. Private by default — no ads, no account, ever.
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

KNOW YOUR BEANS
• Freshness, remaining grams, and cost per cup for every bag
• Ratings, tasting notes, and brew ratios computed for you

PRIVATE BY DESIGN
• Your data lives on your device. No account, no sign-in, ever.
• iCloud keeps your own devices in step — through your private iCloud only
• No ads, no analytics, no tracking

Coffee Brew Log is built for one person: you.
```

**Keywords** (≤100 chars, comma-separated, no spaces):

```
coffee,espresso,pourover,brew,log,dialin,grind,ratio,barista,beans,tracker,recipe,journal
```

**Support URL:** `https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app`
**Marketing URL:** _(optional — leave blank)_

**What's New in This Version** (1.0):

```
First public release of Coffee Brew Log.
```

## 3. App Privacy ("nutrition label" — ASC → App Privacy)

**CHANGED for the 1.0 resubmission (build 5+): declare "Data Not Collected", like Buffy.**
The iOS binary has NO accounts, NO sign-in, and NO server of ours: data is on-device (IndexedDB in
the app's WebView) and syncs only through the user's own private iCloud (CloudKit) — which Apple's
definitions treat as not "collected" (the developer never has access). No analytics/ads/tracking.

To change: App Privacy → Edit Data Types → deselect Email / User Content / User ID → answer
"No, we do not collect data from this app" → Publish. (The previous label declared Email + User
Content + User ID for the magic-link sign-in that build 4 had — build 5 removed it.)

## 4. App Review notes (ASC → Version → Notes for Review)

```
Coffee Brew Log is a personal coffee brewing log. There is NO account and NO sign-in anywhere in
the app — it works fully offline, immediately: add a bag, log an espresso or pour-over, rate it,
and see it in History and Stats. No demo account is applicable.

Data is stored on the device. If the reviewer's device is signed into iCloud, the app can sync the
user's own data between their devices through their private iCloud (CloudKit) — no developer server
is involved.

No ads, no analytics, no tracking, no login. Privacy policy:
https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app/privacy-policy.html
```

## 5. Screenshots

Universal app (iPhone + iPad), so ASC requires both:

- **6.9" iPhone** (1320 × 2868) — required set, 1–10 images of the app in use (not splash/login).
- **13" iPad** (2064 × 2752) — required because the app supports iPad.
  Captured this session with seeded sample data; see `appstore-screenshots/` and
  `appstore-screenshots-ipad13/`.

## 6. Build

- Submit **build 5+**: signed archive carrying the iCloud/CloudKit entitlements (deploy-ios.sh
  verifies them inside the IPA before upload), camera + photo-library usage strings, no login.
- Export compliance: `ITSAppUsesNonExemptEncryption = false` ✅

## Status snapshot — filled via ASC API (scripts/asc-\*.mjs), 2026-07-04

| Requirement                                               | Status                                                    |
| --------------------------------------------------------- | --------------------------------------------------------- |
| Description / keywords / subtitle / promo / support URL   | ✅ via API                                                |
| Privacy Policy URL (`/privacy-policy.html`)               | ✅ via API + live                                         |
| Category (Food & Drink / Lifestyle)                       | ✅ via API                                                |
| Age rating → **4+** (FOUR_PLUS)                           | ✅ via API                                                |
| Review notes + contact (no demo account)                  | ✅ via API                                                |
| Copyright + content-rights (no third-party)               | ✅ via API                                                |
| Signed **build 4** attached                               | ✅ via API                                                |
| Screenshots — 5× iPhone 6.9" + 5× iPad 12.9"              | ✅ via API                                                |
| Export compliance (`ITSAppUsesNonExemptEncryption=false`) | ✅ auto                                                   |
| **Free pricing** ($0.00, all 175 regions)                 | ✅ web UI                                                 |
| **App Privacy data usages** (§3)                          | ✅ web UI (published)                                     |
| **Submit for review**                                     | ✅ **WAITING_FOR_REVIEW** (build 4, submitted 2026-07-10) |

**REJECTED 2026-07-16 → RESUBMITTED same day (build 5).** Sole citation: 2.3.8 Accurate
Metadata — listing "BrewLog by KK" vs device "Coffee Brew Log". Fixes in the resubmission:

- Listing renamed **"Coffee Brew Log by KK"** (ASC API; device name unchanged — prefix match).
- Build 5: local-first + iCloud (CloudKit), **no login/no Supabase on iOS** — which also made
  the App Privacy label **"Data Not Collected"** (re-published) and removed any demo-account
  surface. Signed with the manual "BrewLog App Store" profile carrying the iCloud entitlement.
  **REJECTED AGAIN (build 5): 2.1 App Completeness — demo video of the Acaia hardware pairing
  required. RESOLVED by REMOVING the scale feature from iOS (build 6): bluetooth-le plugin
  uninstalled, no CoreBluetooth, no Bluetooth permission string, UI + listing copy + privacy
  scrubbed; review notes state the removal. RESUBMITTED → "Waiting for Review" (1.0 build 6).
  Scale returns in 1.1 with a demo video (codec + tests preserved; driver restorable from fe2a811).**
  Remaining after approval: device-test iCloud sync from TestFlight build 6.
