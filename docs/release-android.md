# Release Android — Merki

Runbook to build and publish the Android app. The Android build is produced by **EAS Build**
as an **App Bundle (`.aab`)** and uploaded **manually** to the **Google Play Console**.

## Prerequisites

| Item | Value |
|---|---|
| Google Play Developer account | active |
| Package name | `com.merki.app` |
| App in Play Console | created (first release must be created manually) |
| Play App Signing | enabled by Google Play |
| Build | `mobile/eas.json` → `build.production.android.buildType: "app-bundle"` |

## Versioning

Versioning is **automatic**; you do not need to edit versions by hand.

- `mobile/eas.json` sets `cli.appVersionSource: "remote"` and `build.production.autoIncrement: true`.
- Every production build gets a **new `versionCode`** automatically (managed on EAS servers).
- `expo.version` in `mobile/app.json` is the **marketing version** (e.g. `1.0.0`) and stays the same until you change it.

## Icons

Adaptive icon assets (all 1024×1024):

| File | Purpose |
|---|---|
| `mobile/assets/system/android-icon-foreground.png` | mascot on a transparent background (centered, inside the safe zone) |
| `mobile/assets/system/android-icon-background.png` | solid background layer |
| `mobile/assets/system/android-icon-monochrome.png` | themed (monochrome) icon |
| `mobile/assets/system/icon.png` | legacy/source icon |

Configured in `mobile/app.json` under `expo.android.adaptiveIcon` (background `#FFFFFF`).

## Commands (Makefile)

```bash
# Production App Bundle (.aab) via EAS — the usual command
make mobile-aab

# Optional: local, shareable release APK (for manual install/testing)
make mobile-apk
```

Equivalent without `make`:

```bash
cd mobile
npx eas build --platform android --profile production
```

> On macOS, if `make` fails with `You have not agreed to the Xcode license agreements`,
> run once: `sudo xcodebuild -license accept`.

## Download the `.aab`

1. Open the build page printed by the command (or list builds):
   ```bash
   cd mobile
   npx eas build:list --platform android --limit 5
   ```
2. Copy the **Application Archive URL** of the latest `finished` build, or open the build page on
   [expo.dev](https://expo.dev/accounts/edorguez/projects/merki/builds) and use the **Download** button.
3. You get an **`.aab`** file (e.g. `build-<id>.aab`).

## Upload to Google Play Console (manual)

Current track: **Closed / Internal testing**.

1. Go to [play.google.com/console](https://play.google.com/console) → select the **Merki** app.
2. **Test and release** → **Closed testing** (or **Internal testing**).
3. **Create new release**.
4. Upload the `.aab` under **App bundles** (drag and drop, or browse).
   - The first time, accept **Play App Signing** when prompted.
5. Fill in:
   - **Release name** (auto-filled from the version, e.g. `1.0.0 (7)`).
   - **Release notes** (per language).
6. **Save** → **Review release** → **Start rollout to Closed testing**.
7. Add testers: create/select a **tester list**, add emails, and share the **opt-in URL**.
   Testers install via the opt-in link (not the public Play Store listing).

## Play Console checklist

- [ ] **Data safety**: declare *App activity / Device or other IDs* and "Advertising or marketing" (AdMob). Confirm the Google Ads ID policy.
- [ ] **Content rating** questionnaire: declare that the app **contains ads**.
- [ ] **Target audience and content**: set the age groups.
- [ ] **Privacy policy URL**: `https://somosmerki.app/privacy`.
- [ ] **Store listing**: app icon 512×512, feature graphic 1024×500, phone screenshots, short/full description.
- [ ] **App access**: provide a **demo account** (email + password) or instructions, because login is required.
- [ ] **Ads**: declare that the app contains ads.
- [ ] **Government apps / financial features**: answer as applicable.

## Troubleshooting

| Error | Cause / fix |
|---|---|
| `Version code X has already been used` | That `versionCode` was already uploaded. Build a new one with `make mobile-aab` (it auto-increments). |
| `App bundle was not signed` / signing error | Ensure **Play App Signing** is enabled and the build is a production EAS build (credentials managed by EAS). |
| `Target API level` requirement | Update `expo-build-properties` (currently `compileSdkVersion: 36`) and rebuild. |
| `.aab` not accepted as the first upload | The very first release must be created manually in the Play Console. |
| `make: You have not agreed to the Xcode license agreements` | Run once: `sudo xcodebuild -license accept`. |
| Real ads shown while testing | Add your device in `AdMob → your app → Test devices` to receive test ads. |
