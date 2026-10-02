# Ads & Monetization Status

> Living checklist. Track the AdMob integration state here so nothing is
> forgotten between now and launch.

## Status

**The app is deployed.** iOS is live (build #10) and Android is awaiting Google
Play approval. Ads are wired into the code with real App IDs and ad-unit IDs
(`mobile/lib/ads.ts`, `mobile/app.json`, ad components, premium gating). Ads are
**not yet serving** because the AdMob account is still pending approval and the
app must be verified via `app-ads.txt` (now published at the site root — see
below). No mobile rebuild is needed for ad serving; both tasks are AdMob-console
side.

**Plan model:** Free users see ads; premium users see **no ads**. See
`PROJECT_SPEC.md` §7.5 (Plans & Monetization).

**Premium gating is expiry-aware.** `GET /api/v1/auth/me` returns the *effective*
premium status via `User.IsActivePremium()` (flag **and** `premiumUntil` still in
the future), and the client's `useIsPremium()` hook re-checks `premiumUntil`
locally. Ads render only when `isPremium === false && isResolved === true`
(`isResolved` is false while premium status loads, so premium users never get a
flash of ads). Interstitial ads additionally bail out inside `show()` so a
stale loaded ad can never be presented after a user becomes premium.

**iOS:** ads are shown but **non-personalized**. There is no App Tracking
Transparency prompt and no `NSUserTrackingUsageDescription`; without ATT the
IDFA is unavailable, so the App Privacy label must **not** mark Device ID as
"used for tracking" (this resolved App Store Guideline 5.1.2). The iOS app also
**does not apply the premium entitlement at all** (`useIsPremium()` returns
false on iOS), so ads always render on iOS and no externally purchased content
is accessed (Guideline 3.1.1 / 3.1.3(b)). Premium is Android/web only; purchase
and entitlement logic are untouched on those platforms.

## AdMob Account

- Publisher ID: `ca-app-pub-1019164072675452`
- Google/AdMob account: `edro998@gmail.com`. Apple Developer account:
  `admin@somosmerki.com` (different accounts, same `somosmerki.app` domain).
- Payment: US EFT → Bank of America (minimum $100). See the "Before release"
  checklist below.

## app-ads.txt

AdMob verifies app ownership by crawling `app-ads.txt` at the root of the
developer website listed on the store listing (`https://somosmerki.app`, set as
the marketing URL). This is **domain-based, not account-based**, so the separate
Apple Developer account does not block verification.

- File: `web/public/app-ads.txt` → served at `https://somosmerki.app/app-ads.txt`
  (Caddy `try_files` serves the real file before the SPA fallback).
- Content: `google.com, pub-1019164072675452, DIRECT, f08c47fec0942fa0`
- After deploy, click **"Comprobar actualizaciones"** on each app in AdMob.

## App IDs (in `mobile/app.json` → `react-native-google-mobile-ads` plugin)

| Platform | App ID |
|----------|--------|
| Android  | `ca-app-pub-1019164072675452~9310060521` |
| iOS      | `ca-app-pub-1019164072675452~1291969706` |

## Ad Unit IDs (defaults in `mobile/lib/ads.ts`, overridable via `EXPO_PUBLIC_ADMOB_*` env vars)

| Format | Android | iOS |
|--------|---------|-----|
| Banner  | `ca-app-pub-1019164072675452/8264572161` | `ca-app-pub-1019164072675452/7861247486` |
| Interstitial | `ca-app-pub-1019164072675452/3283708227` | `ca-app-pub-1019164072675452/8152891524` |
| Native advanced | `ca-app-pub-1019164072675452/5422786408` | `ca-app-pub-1019164072675452/5235084148` |

Env vars: `EXPO_PUBLIC_ADMOB_{BANNER,INTERSTITIAL,NATIVE}_ID_{ANDROID,IOS}`.
Real values are also set in `mobile/.env` (gitignored). `.env.example` documents
the var names only.

## Ad placements (premium-gated — render only when `user.isPremium === false`)

| Placement | Format | Location |
|-----------|--------|----------|
| Home in-feed | Native advanced | `app/(tabs)/index.tsx` (`AdNative`) |
| History in-feed | Native advanced | `app/(tabs)/history.tsx` (`AdNative`) |
| Profile | Banner | `app/(tabs)/profile.tsx` (`AdBanner`) |
| After checkout | Interstitial | `app/(cart)/[id].tsx` (`useInterstitialAd`) |
| Cart detail | Banner | `app/(cart)/[id].tsx` (`AdBanner`) |
| Every 10 scans | Interstitial | `app/(cart)/scan.tsx` (`useInterstitialAd`) |

## TODO — before / at launch

- [x] **Native app built with the SDK + real IDs**: iOS build #10 (live) and Android build #3 (awaiting Play approval) both embed the SDK and real App IDs.
- [x] **app-ads.txt published**: `web/public/app-ads.txt` → `https://somosmerki.app/app-ads.txt`, then "Comprobar actualizaciones" in AdMob.
- [ ] **AdMob account approval** (AdMob console, 2/4): pending review — blocks all ad serving. Wait, then link each app to its store listing.
- [ ] **Test ads with the real IDs** on a device (fill, no crashes, premium users see none).
- [ ] **Google Play Console → Data safety form**: declare "Advertising or marketing" + ad/device IDs; confirm Google Ads ID policy.
- [ ] **App Store Connect → App Privacy**: declare "Identifiers — Device ID" for third-party advertising, **without** "used for tracking".
- [ ] **GDPR consent**: implement UMP via the bundled `AdsConsent` module (EEA/UK users).
- [x] **iOS no tracking / no ATT**: `expo-tracking-transparency` and `NSUserTrackingUsageDescription` were removed. Without ATT the IDFA is unavailable, so iOS ads are **non-personalized** and App Privacy must **not** mark Device ID as used for tracking (fixes Guideline 5.1.2).
- [x] **iOS no premium / no IAP**: the premium entitlement is not applied on iOS (`useIsPremium()` returns false on iOS), the premium UI is hidden (`app/(tabs)/profile.tsx`, `app/(premium)/_layout.tsx`), and the iOS app sells no digital content. This keeps the app compliant with Guidelines 3.1.1 / 3.1.3(b) / 2.1(b) without In-App Purchase. Premium is Android/web only.
- [ ] **Privacy policy URL**: `https://somosmerki.app/privacy` exists in the web app; confirm it is live and reference it in both store listings. Link it in-app (e.g., Profile/Settings).
- [x] **iOS published** (build #10). Android built (versionCode 3) and submitted — awaiting Google Play approval.
- [ ] **Go live**: once the AdMob account is approved and impressions are confirmed, flip the status at the top of this file to "wired & live".

## Not a secret

AdMob App IDs and ad-unit IDs are **public by design** — they're embedded in the
app binary. Only AdMob account credentials, API/OAuth tokens, and bank/payment
details must be kept secret.
