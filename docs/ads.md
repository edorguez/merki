# Ads & Monetization Status

> Living checklist. Track the AdMob integration state here so nothing is
> forgotten between now and launch.

## Status

**The app is NOT yet deployed on Android or iOS.** Ads are wired into the code
(`mobile/lib/ads.ts`, ad components, premium gating), but no ad is live until
the app is rebuilt with the native module and published.

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
"used for tracking" (this resolved App Store Guideline 5.1.2). The premium UI is
hidden entirely on iOS because there is no In-App Purchase (Guideline 3.1.1 /
2.1(b)); premium is sold only via web/Android.

## AdMob Account

- Publisher ID: `ca-app-pub-1019164072675452`
- Payment: US EFT → Bank of America (minimum $100). See the "Before release"
  checklist below.

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

- [ ] **Rebuild the native app** (`npx expo prebuild` + rebuild) so the SDK and real App IDs take effect.
- [ ] **Test ads with the real IDs** on a device (fill, no crashes, premium users see none).
- [ ] **Google Play Console → Data safety form**: declare "Advertising or marketing" + ad/device IDs; confirm Google Ads ID policy.
- [ ] **App Store Connect → App Privacy**: declare "Identifiers — Device ID" for third-party advertising, **without** "used for tracking".
- [ ] **GDPR consent**: implement UMP via the bundled `AdsConsent` module (EEA/UK users).
- [x] **iOS no tracking / no ATT**: `expo-tracking-transparency` and `NSUserTrackingUsageDescription` were removed. Without ATT the IDFA is unavailable, so iOS ads are **non-personalized** and App Privacy must **not** mark Device ID as used for tracking (fixes Guideline 5.1.2).
- [x] **iOS premium UI hidden entirely**: the premium card and the whole `(premium)` stack (`plans`, `pago-movil`, `payment-pending`) are hidden/blocked on iOS (`app/(tabs)/profile.tsx`, `app/(premium)/_layout.tsx`) to comply with Guidelines 3.1.1 / 2.1(b) (no In-App Purchase). Premium is sold only via web/Android.
- [ ] **Privacy policy URL**: `https://somosmerki.app/privacy` exists in the web app; confirm it is live and reference it in both store listings. Link it in-app (e.g., Profile/Settings).
- [ ] **Publish** on Play Store + App Store, then flip the status at the top of this file to "wired & live".

## Not a secret

AdMob App IDs and ad-unit IDs are **public by design** — they're embedded in the
app binary. Only AdMob account credentials, API/OAuth tokens, and bank/payment
details must be kept secret.
