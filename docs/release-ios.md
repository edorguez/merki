# Release iOS — Merki

Runbook to build and publish the iOS app (Expo / EAS Build + EAS Submit).

## Prerequisites

| Item | Value |
|---|---|
| Apple Developer Program | active (Team ID `27UFX6DKU6`) |
| Bundle ID | `com.merki.app` |
| AscAppId (numeric Apple ID of the app) | `6812844038` |
| ASC API Key (Admin) | `mobile/credentials/ios/AuthKey_5945L6ABG6.p8` (Key ID `5945L6ABG6`) |
| Issuer ID | `3fdf78d6-1ec1-4ba0-a528-113944f15ca8` |
| Signing credentials | managed by EAS (Distribution Certificate + Provisioning Profile) |
| Submit | configured in `mobile/eas.json` → `submit.production.ios` |

> The `.p8` is **never** committed (`mobile/.gitignore` ignores `credentials/` and `*.p8`).

## Icons

- **iOS**: `mobile/assets/system/icon.png` must be **1024×1024, no alpha channel**, and full-bleed (solid background). Apple rejects icons with transparency.
  - Verify: `sips -g hasAlpha mobile/assets/system/icon.png` → must say `hasAlpha: no`.
  - If it has alpha, flatten it onto a solid background before building.
- **Android (adaptive)**: `android-icon-foreground.png` (mascot on transparent), `android-icon-background.png` (solid background) and `android-icon-monochrome.png`.

## Commands (Makefile)

```bash
# Build iOS only (production)
make mobile-ios

# Build + submit to TestFlight (the usual per change)
make mobile-ios-release

# Optional: bump the marketing version before the build
make mobile-ios VERSION=1.0.1
make mobile-ios-release VERSION=1.0.1
```

- The **build number** auto-increments (managed by EAS, `appVersionSource: remote`).
- The **marketing version** (`expo.version`) stays the same unless you pass `VERSION=`.
- `submit` uses the ASC API Key configured in `eas.json` (no Apple ID or 2FA prompt).

Equivalent without `make`:

```bash
cd mobile
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production --latest
```

## Step-by-step release flow

1. Commit your changes (icons, config, etc.).
2. `make mobile-ios-release`.
3. Wait for the build (~8–15 min) and the submit to App Store Connect.
4. Apple processes the binary (10–15 min) → it appears in **TestFlight**.
5. In **App Store Connect → version → Build → Add Build**: select the new build.
6. Complete the metadata (see checklist) and **Add for Review → Submit**.

## App Store Connect checklist

- [ ] **App Privacy**: declare `Identifiers → Device ID`, `Contact Info → Email`, `User Content`. Mark **"Used for tracking purposes"** on the advertising data (required because of `NSUserTrackingUsageDescription`).
- [ ] **Copyright**: `2026 Merki`.
- [ ] **Keywords** (Spanish Mexico): e.g. `precios, supermercado, carrito, bolívares, dólar, BCV, presupuesto, compras`.
- [ ] **Screenshots**: 6.9" and 6.5" (iPhone).
- [ ] **Privacy Policy URL**: `https://somosmerki.app/privacy`.
- [ ] **Age Rating**: declare that the app **contains ads**.
- [ ] **Pricing**: Free.
- [ ] **App Review Information**: `Sign-in required` + a **real demo account** (User name / Password) + notes (OCR needs the camera, guest mode available, Premium not purchasable on iOS).
- [ ] **Build**: select the new build.

## Review status

Where to check:

- **App Store Connect** → **My Apps → Merki** → **App Store** tab: the version status badge.
- **Resolution Center**: messages/requests/rejection reasons from Apple.
- **Email**: Apple notifies the Admin account (`admin@somosmerki.app`).
- **TestFlight**: build processing status (separate from review).
- **API** (read-only): `appStoreVersions` / `reviewSubmissions` for the app.

| State | Meaning |
|---|---|
| **Waiting for Review** | In Apple's queue |
| **In Review** | A reviewer is testing the app |
| **Pending Developer Release** | Approved, waiting for you to release (manual release) |
| **Processing for App Store / Ready for Sale** | Approved and published |
| **Rejected / Metadata Rejected** | Fix and resubmit |
| **Developer Rejected** | You withdrew it |

Notes:

- Typical review time is **24–48 h**.
- **Do not modify the version or submit another build** while it is "In Review" (it can reset the review).
- If **Rejected**: read the **Resolution Center**, fix code and/or metadata, upload a new build if needed, then reply or resubmit.

## ASC API Key workflow (no Apple ID / no 2FA)

If `eas build` fails with `Authentication with Apple Developer Portal failed! iTunes service key is empty` (federated account, or a non-email Apple ID), authenticate Apple with the ASC API Key instead:

```bash
cd mobile
EXPO_ASC_API_KEY_PATH="$PWD/credentials/ios/AuthKey_5945L6ABG6.p8" \
EXPO_ASC_KEY_ID="5945L6ABG6" \
EXPO_ASC_ISSUER_ID="3fdf78d6-1ec1-4ba0-a528-113944f15ca8" \
EXPO_APPLE_TEAM_ID="27UFX6DKU6" \
EXPO_APPLE_TEAM_TYPE="INDIVIDUAL" \
npx eas build --platform ios --profile production
```

- When asked *"Do you want to log in to your Apple account?"*, answer **no**.
- This lets EAS create/manage the Distribution Certificate and Provisioning Profile via the API Key.
- `eas submit` already uses this key through `submit.production.ios` in `eas.json`.

To find the Apple **Team ID**: `developer.apple.com` → **Account** → **Membership details**. Team Type is `INDIVIDUAL`, `COMPANY_OR_ORGANIZATION`, or `IN_HOUSE`.

## TestFlight

1. App Store Connect → **TestFlight** → **Internal Testing** → create a group.
2. Add **internal testers** (they must exist in **Users and Access**).
3. Assign the build to the group.
4. Install **TestFlight** on the iPhone and install Merki.
5. Before opening the app: `AdMob → your app → Test devices` → add the device (the build is production → real ads).

> **External** testers require Beta App Review; **internal** testers do not.

## Troubleshooting

| Error | Cause / fix |
|---|---|
| `Authentication with Apple Developer Portal failed! iTunes service key is empty` | Cannot log in with Apple ID (federated account or numeric Apple ID). Use the ASC API Key with `EXPO_ASC_*` + `EXPO_APPLE_TEAM_ID`/`EXPO_APPLE_TEAM_TYPE` on `eas build`. |
| `Something went wrong when submitting...` with the binary already uploaded | That build was already uploaded (`binary already uploaded`). **Do not resubmit the same build**; create a new one with `make mobile-ios-release`. |
| `Invalid App Store Icon ... can't contain an alpha channel` | Flatten `icon.png` (no transparency) and rebuild. |
| `NSUserTrackingUsageDescription` blocks review | Mark the advertising data as **tracking** in App Privacy. |
| `make: You have not agreed to the Xcode license agreements` | Run once: `sudo xcodebuild -license accept`. |
