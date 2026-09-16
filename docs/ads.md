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
- [ ] **App Store Connect → App Privacy**: declare "Identifiers — Advertising ID / Device ID" for third-party advertising.
- [ ] **GDPR consent**: implement UMP via the bundled `AdsConsent` module (EEA/UK users).
- [x] **iOS ATT**: `expo-tracking-transparency` installed + `NSUserTrackingUsageDescription` in `app.json`; the permission is requested on app start before `MobileAds().initialize()` (`mobile/app/_layout.tsx`), with `delayAppMeasurementInit: true` on the AdMob plugin.
- [x] **iOS premium purchase hidden**: `pago-móvil` is unreachable on iOS (`app/(tabs)/profile.tsx`, `app/(premium)/plans.tsx`) to comply with App Store Guideline 3.1.1 (external payment for a digital good). Re-enable only via In-App Purchase.
- [ ] **Privacy policy URL**: `https://somosmerki.app/privacy` exists in the web app; confirm it is live and reference it in both store listings. Link it in-app (e.g., Profile/Settings).
- [ ] **Publish** on Play Store + App Store, then flip the status at the top of this file to "wired & live".

## Not a secret

AdMob App IDs and ad-unit IDs are **public by design** — they're embedded in the
app binary. Only AdMob account credentials, API/OAuth tokens, and bank/payment
details must be kept secret.
