# Ads & Monetization Status

> Living checklist. Tracks the **Unity Ads** integration (free tier) so nothing
> is forgotten between releases.

## Status

**The app is deployed** (iOS + Android live). Ads are wired into the code with
real Unity Ads identifiers and gated by the premium entitlement. The native SDK
is a **local Expo module** at `mobile/modules/unity-ads` (Android Kotlin + iOS
Swift), consumed through `mobile/lib/unityAds.ts`.

Ads start serving in the next production build. The ad SDK was migrated to Unity
Ads; no identifiers from the previous provider remain in the repo.

**Plan model:** Free users see ads; premium users see **no ads**. See
`PROJECT_SPEC.md` §7.5 (Plans & Monetization).

**Premium gating is expiry-aware.** `GET /api/v1/auth/me` returns the *effective*
premium status via `User.IsActivePremium()` (flag **and** `premiumUntil` still in
the future), and the client's `useIsPremium()` hook re-checks `premiumUntil`
locally. Ads render only when `isPremium === false && isResolved === true`
(`isResolved` is false while premium status loads, so premium users never get a
flash of ads). The interstitial hook also bails out inside `show()` so a stale
loaded ad can never be presented after a user becomes premium.

**iOS:** ads are **non-personalized**. There is no App Tracking Transparency
prompt and no `NSUserTrackingUsageDescription`; without ATT the IDFA is
unavailable, so the App Privacy label must **not** mark Device ID as "used for
tracking" (Guideline 5.1.2). The iOS app also **does not apply the premium
entitlement at all** (`useIsPremium()` returns false on iOS), so ads always
render on iOS and no externally purchased content is accessed (Guideline 3.1.1 /
3.1.3(b)). Premium is Android/web only.

## Unity Ads account

- Product: **Unity Ads** (Monetization), not ironSource LevelPlay.
- Organization: `adminmvtqid7c` · Organization core ID `4674276041554`
- Country of residence: Venezuela (matches the payout/KYC documents).
- Developer website: `https://somosmerki.app` (used for `app-ads.txt` crawling).
- Payouts: complete the **Payments** section (W-8BEN + wire to Banesco Panamá or
  the US bank account) before the first payout cycle.

## Game IDs (in `mobile/lib/ads.ts`, overridable via env vars)

| Platform | Game ID |
|----------|---------|
| Android  | `800417099` |
| iOS      | `800417100` |

Env overrides: `EXPO_PUBLIC_UNITY_GAME_ID_{ANDROID,IOS}`.

## Placements (Unity dashboard — all Active)

| Placement | ID | App | Format |
|-----------|----|-----|--------|
| Banner Android | `BP_Banner_Android` | Merki Android | Banner |
| Interstitial Android | `BP_Interstitial_Android` | Merki Android | Interstitial |
| Banner iOS | `BP_Banner_IOS` | Merki iOS | Banner |
| Interstitial iOS | `BP_Interstitial_IOS` | Merki iOS | Interstitial |

Env overrides: `EXPO_PUBLIC_UNITY_{BANNER,INTERSTITIAL}_PLACEMENT_{ANDROID,IOS}`.

## Ad placements (premium-gated — render only when `user.isPremium === false`)

| Placement | Format | Location |
|-----------|--------|----------|
| Home in-feed | MREC 300x250 (banner placement) | `app/(tabs)/index.tsx` (`AdMrec`) |
| History in-feed | MREC 300x250 (banner placement) | `app/(tabs)/history.tsx` (`AdMrec`) |
| Profile | Banner 320x50 | `app/(tabs)/profile.tsx` (`AdBanner`) |
| After checkout | Interstitial | `app/(cart)/[id].tsx` (`useInterstitialAd`) |
| Cart detail | Banner 320x50 | `app/(cart)/[id].tsx` (`AdBanner`) |
| Every 10 scans | Interstitial | `app/(cart)/scan.tsx` (`useInterstitialAd`) |

Unity Ads has **no native ad format**; the two feed slots use MREC
(`adSize="mrec"` → `UnityBannerSize.iabStandard` / 300x250).

## app-ads.txt

Unity crawls `app-ads.txt` at the root of the developer website listed on the
store listings and in the Unity organization settings.

- File: `web/public/app-ads.txt` → served at `https://somosmerki.app/app-ads.txt`
  (Caddy `try_files` serves the real file before the SPA fallback).
- Content: the **full Unity-provided list** (all `RESELLER` entries plus
  `unity.com, 159982081, DIRECT, 96cabb5fbdde37a7`).
- After deploying, Unity re-checks automatically (24–48 h). **Review monthly**
  and re-sync when Unity adds entries.

## SKAdNetwork

`mobile/app.json` → `expo.ios.infoPlist.SKAdNetworkItems` contains the full list
from the Unity dashboard (~78 identifiers). It is injected into `Info.plist` at
EAS prebuild. **Review monthly** as Unity requests.

## Testing

- Dev builds (`__DEV__`) initialize the SDK with `testMode = true`.
- Production builds serve real ads — never click your own live ads.
- The native module exposes `loadInterstitial` / `showInterstitial`; banners load
  automatically when mounted.

## TODO — before / at launch

- [x] **Provider migration**: dependency, config plugin, IDs, web stub, aliases,
      docs and privacy copy now use Unity Ads.
- [x] **Unity Ads apps + placements created** (Game IDs above, 4 placements).
- [ ] **app-ads.txt updated + deployed** (`web/public/app-ads.txt` → deploy web).
- [ ] **SKAdNetworkItems** included in the next iOS build (already in `app.json`).
- [ ] **Unity Payments / W-8BEN** completed in the dashboard.
- [ ] **Build + submit** Android (AAB) and iOS with the new native module.
- [ ] **Test**: banner on profile/cart, MREC on home/history, interstitial after
      checkout and every 10 scans; premium users see none.
- [ ] **Google Play Console → Data safety**: declare "Advertising or marketing" +
      ad/device IDs (partner: Unity Ads).
- [ ] **App Store Connect → App Privacy**: Device ID for third-party advertising,
      **without** "used for tracking".
- [ ] **Privacy policy URL**: `https://somosmerki.app/privacy` live and linked in
      both store listings (and in-app).

## Not a secret

Game IDs and placement IDs are **public by design** — they are embedded in the
app binary. Only Unity account credentials, API/OAuth tokens, and bank/payment
details must be kept secret.
