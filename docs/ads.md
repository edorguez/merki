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
| Home in-feed | Banner 320x50 | `app/(tabs)/index.tsx` (`AdBanner`) |
| History in-feed | Banner 320x50 | `app/(tabs)/history.tsx` (`AdBanner`) |
| Profile | Banner 320x50 | `app/(tabs)/profile.tsx` (`AdBanner`) |
| After checkout | Interstitial | `app/(cart)/[id].tsx` (`useInterstitialAd`) |
| Cart detail | Banner 320x50 | `app/(cart)/[id].tsx` (`AdBanner`) |
| Every 10 scans | Interstitial | `app/(cart)/scan.tsx` (`useInterstitialAd`) |

Unity Ads has **no native ad format**. All banner slots use the **standard
320x50 banner**: our Unity placements are configured as Banner format, so a
300x250 MREC request either fails or gets filled with a stretched 320x50 creative
(which is what produced a big empty white card in the feeds).

**No ad, no card.** Banners render bare — no card, border, or padding — centered
in the available width. The native banner emits `onAdLoaded` / `onAdError`;
`AdBanner` keeps the slot collapsed (`height: 0`, `opacity: 0`) — while the
native view stays mounted so Unity can load into it — until `onAdLoaded` fires.
If loading fails after the native retries, nothing is rendered — never an empty
slot. Collapsing uses height/opacity only, never `position`, because
re-positioning detaches the native view on Android and destroys the loaded
banner.

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
- Banners load a fresh creative on every focus (Unity cannot reuse a banner once
  it leaves the window). Requests are debounced to one per 5s per placement, so
  switching tabs faster than that shows a `banner: debounced` log and the ad
  appears when the window elapses.
- Verified on Android dev build (test mode) on 2026-11-24: banner appears on
  home/history/profile/cart after each tab switch, interstitial loads on the cart
  screen and shows after checkout / every 10 scans.

## Debugging ads

All native ad events are logged:

- Android: `adb logcat | grep UnityAds`
- iOS: filter the Xcode console / `Console.app` on `[UnityAds]`

Logs cover initialization, banner attach/detach/load/show/click/error (with error
codes), debounce decisions, and interstitial load/show/click/fail. A silent white
box now always leaves a trace.

Failure modes fixed in this pass, worth remembering when touching the module:

1. **Readiness race.** Ad views must not mount before the SDK finishes
   initializing. `initialize()` now resolves only on the real init callback, and
   `AdBanner` / `useInterstitialAd` wait for it via `useAdsReady()`. A failed
   init is no longer cached forever: the root layout retries whenever the app
   returns to the foreground, and `useAdsReady` subscribers re-render when a
   later attempt succeeds.
2. **Android dp vs px.** `UnityBannerSize` is in dp; `FrameLayout.LayoutParams`
   expects pixels. Passing dp straight through renders the banner at
   `1/density` of its size — an empty white card.
3. **Wrong format.** Do not request an MREC (300x250) against these placements;
   they are Banner-format only. Use the standard 320x50 banner.
4. **Never toggle `position` to hide the banner.** React Native keeps
   absolutely-positioned children at the end of the parent's child list, so
   flipping a wrapper between `absolute` and `relative` re-inserts the view into
   the Android hierarchy. The detach runs `UnityBannerView.onDetachedFromWindow`,
   which destroys the already-loaded banner — the slot then renders empty
   (confirmed in logcat: `banner: loaded` → `BannerView.destroy()` 1 ms later).
   Collapse the slot with `height`/`opacity` instead. Both native views also
   re-arm the load on re-attach (`onAttachedToWindow` / `didMoveToWindow`) so a
   re-inserted view recovers instead of staying blank.
5. **One banner per placement, fresh load per visit.** All banner slots share
   `BP_Banner_Android` / `BP_Banner_IOS`, and Unity keeps a single banner per
   placement. `AdBanner` mounts the native view **only while the screen is
   focused**, and the native module's `BannerCache` owns the request pipeline:
   it destroys the banner when the screen detaches and loads a fresh one on the
   next attach. Reusing the same creative across screens is **not possible** in
   Unity Ads 4.21 — `BannerView` (Android) and `UADSBannerView` (iOS) expose only
   `load`/`destroy`, with no show/resume, and the SDK ends the impression when
   the view leaves the window (`Finished showing ad` in logcat on detach).
   Reparenting a shown banner therefore renders blank. Requests are debounced to
   at most one per 5s per placement (a guard against navigation loops, not
   Unity's ~30s auto-refresh interval, which does not apply to explicit loads of
   a fresh banner). A failed load is not terminal — after the fast retries the
   cache keeps re-requesting on a 60s idle cadence.

Both the Android and iOS banner APIs in Unity Ads 4.21 are marked deprecated
(`UADSBannerView` → `UADSBannerAd`, `UADSBannerViewDelegate` →
`UADSBannerAdDelegate`). They still work; migrate before bumping the SDK major
version.

## TODO — before / at launch

- [x] **Provider migration**: dependency, config plugin, IDs, web stub, aliases,
      docs and privacy copy now use Unity Ads.
- [x] **Unity Ads apps + placements created** (Game IDs above, 4 placements).
- [x] **app-ads.txt updated + deployed** (`web/public/app-ads.txt` → deploy web;
      verified live at `https://somosmerki.app/app-ads.txt`, HTTP 200 on
      2026-11-23).
- [ ] **SKAdNetworkItems** included in the next iOS build (already in `app.json`).
- [ ] **Unity Payments / W-8BEN** completed in the dashboard.
- [ ] **Build + submit** Android (AAB) and iOS with the current native module
      (banner lifecycle + request cache).
- [ ] **Test on iOS device** (dev build + production) — Android dev build
      verified 2026-11-24.
- [ ] **Verify production delivery**: Unity dashboard should show both apps as
      verified; watch impressions/fill for at least a week after release.
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
