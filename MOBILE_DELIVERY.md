# Mobile delivery — Skadoosh

How the skaddosh app gets from a branch to a device. Four independent pipelines,
one per branch-and-platform combination.

| Branch | Platform | Workflow | Destination |
| --- | --- | --- | --- |
| `dev` | Android | `mobile-android-dev.yml` | **Firebase App Distribution** (testers' *App Tester* app) |
| `dev` | iOS | `mobile-ios-dev.yml` | Firebase App Distribution — **configured, manual-only** (see [iOS on dev](#ios-on-dev)) |
| `main` | Android | `mobile-android-release.yml` | **Google Play Console** |
| `main` | iOS | `mobile-ios-release.yml` | **App Store Connect** |

Android and iOS are **separate workflow files** on purpose. A failing iOS build
cannot block an Android release, and vice versa — they share no job, no runner,
and no concurrency group.

> **"App Tester" here means Firebase App Distribution.** Its Android tester app
> is published as *App Tester*, and it serves both platforms from one console.
> If you meant a different service, the only thing to change is the
> `firebase_app_distribution` call in the `android_dev` / `ios_dev` lanes of
> `apps/mobile/fastlane/Fastfile` — the build steps around it stay as they are.

---

## What runs when

### `dev` → testers

Pushing to `dev` with changes under `apps/mobile/` runs `mobile-android-dev.yml`:

1. **Type-check** — fails fast before anything expensive.
2. **Prebuild** — `expo prebuild --platform android` generates the native project.
3. **Build** — fastlane `android_dev` assembles a signed **release APK**
   (App Distribution takes an APK, not an AAB).
4. **Distribute** — the APK goes to Firebase App Distribution with the commit
   message as release notes; testers in `FIREBASE_TESTER_GROUPS` are notified.
5. The APK is also kept as a workflow artifact for 30 days.

### `main` → stores

Pushing to `main` with changes under `apps/mobile/` runs both release workflows
independently:

- **Android** builds a signed **AAB** and uploads it to Play Console.
- **iOS** builds a signed **App Store IPA** and uploads it to App Store Connect.

Both land as **drafts, not live releases**. Play uses `releaseStatus: draft`;
iOS lands in TestFlight, promotable to an App Store release from there. Someone
still presses the final button in each console — nothing auto-publishes to the
public.

To roll out automatically instead, set the `GOOGLE_PLAY_RELEASE_STATUS`
repository variable to `completed`.

### iOS on dev

`mobile-ios-dev.yml` is fully configured — the fastlane `ios_dev` lane, the
Ad Hoc signing steps, and the App Distribution upload are all in place — but it
runs only via **Run workflow** (`workflow_dispatch`), because dev pushes are
specified to distribute Android only.

To make it automatic, uncomment the `push:` trigger at the top of the file:

```yaml
# push:
#   branches: [dev]
#   paths:
#     - "apps/mobile/**"
#     - ".github/workflows/mobile-ios-dev.yml"
```

Nothing else needs to change.

---

## GitHub Environments

Secrets are read from two **environments**, so tester credentials and store
credentials never sit in the same place:

| Environment | Used by | Holds |
| --- | --- | --- |
| `development` | both `*-dev` workflows | Firebase + internal signing |
| `production` | both `*-release` workflows | Play Console, App Store Connect, release signing |

Create them under **Settings → Environments**. Adding a required reviewer to
`production` turns every store upload into an approval gate — recommended.

### `development` secrets

| Secret | What it is |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON for a service account with the **Firebase App Distribution Admin** role |
| `FIREBASE_ANDROID_APP_ID` | Firebase app ID, e.g. `1:1234567890:android:abc123` |
| `FIREBASE_IOS_APP_ID` | Firebase app ID, e.g. `1:1234567890:ios:abc123` (iOS lane only) |
| `ANDROID_INTERNAL_KEYSTORE_BASE64` | base64 of the debug/internal keystore |
| `ANDROID_INTERNAL_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_INTERNAL_KEY_ALIAS` | Key alias |
| `ANDROID_INTERNAL_KEY_PASSWORD` | Key password |
| `IOS_ADHOC_CERTIFICATE_P12_BASE64` | base64 of the Ad Hoc distribution `.p12` (iOS lane only) |
| `IOS_ADHOC_CERTIFICATE_PASSWORD` | Password used when exporting that `.p12` |
| `IOS_ADHOC_PROVISIONING_PROFILE_BASE64` | base64 of the Ad Hoc `.mobileprovision` |
| `KEYCHAIN_PASSWORD` | Any string; unlocks fastlane's temporary CI keychain |

### `production` secrets

| Secret | What it is |
| --- | --- |
| `ANDROID_RELEASE_KEYSTORE_BASE64` | base64 of the **upload keystore** registered with Play |
| `ANDROID_RELEASE_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_RELEASE_KEY_ALIAS` | Key alias |
| `ANDROID_RELEASE_KEY_PASSWORD` | Key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Full JSON for a Play Console service account with *Release manager* rights |
| `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64` | base64 of the Apple Distribution `.p12` |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Password used when exporting that `.p12` |
| `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64` | base64 of the App Store `.mobileprovision` |
| `APPSTORE_CONNECT_API_KEY_BASE64` | base64 of the App Store Connect `.p8` key |
| `APPSTORE_CONNECT_API_KEY_ID` | Key ID from App Store Connect |
| `APPSTORE_CONNECT_API_ISSUER_ID` | Issuer ID from App Store Connect |
| `KEYCHAIN_PASSWORD` | Any string; unlocks fastlane's temporary CI keychain |

### Repository variables

Non-secret, under **Settings → Variables**. Every one has a working default, so
none is required to get a first build out.

| Variable | Default | Purpose |
| --- | --- | --- |
| `FIREBASE_TESTER_GROUPS` | *(none)* | Comma-separated Firebase tester groups, e.g. `qa,internal`. Unset means no group is auto-notified |
| `DEV_API_URL` | `http://localhost:5000` | API the dev build points at |
| `PROD_API_URL` | `https://api.skaddosh.com` | API the release build points at |
| `GOOGLE_PLAY_TRACK` | `production` | Play track: `internal`, `alpha`, `beta`, `production` |
| `GOOGLE_PLAY_RELEASE_STATUS` | `draft` | `draft` or `completed` |
| `ANDROID_PACKAGE_NAME` | `com.osascloud.skadoosh` | Android application ID |
| `IOS_BUNDLE_IDENTIFIER` | `app.skaddosh.mobile` | iOS bundle ID |
| `IOS_ADHOC_PROFILE_NAME` | *(none)* | Exact name of the Ad Hoc provisioning profile |
| `IOS_APPSTORE_PROFILE_NAME` | *(none)* | Exact name of the App Store provisioning profile |
| `APPLE_TEAM_ID` | *(none)* | Apple Developer team ID |

---

## Producing the secret values

**Anything binary must be base64 with no line wrapping.**

```bash
# macOS
base64 -i upload-keystore.jks | tr -d '\n' | pbcopy

# Linux
base64 -w 0 upload-keystore.jks
```

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks")) | Set-Clipboard
```

JSON secrets (`FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`)
are pasted **as raw JSON**, not base64 — the workflows write them straight to a
file.

### Firebase App Distribution

1. Firebase console → add an Android app with package `com.osascloud.skadoosh`
   (and an iOS app with bundle ID `app.skaddosh.mobile` if you enable the iOS lane).
2. Copy each **App ID** into `FIREBASE_ANDROID_APP_ID` / `FIREBASE_IOS_APP_ID`.
3. **Project settings → Service accounts → Generate new private key**, then grant
   that account the *Firebase App Distribution Admin* role in Google Cloud IAM.
4. Paste the JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. **App Distribution → Testers & groups** — create a group and put its *alias*
   in the `FIREBASE_TESTER_GROUPS` variable.

Testers install the **App Tester** app on Android, or accept the iOS invite
(their device UDID must be in the Ad Hoc profile).

### Android signing

Two separate keystores. The internal one is throwaway; the release one is
**unrecoverable** — losing it means you can never update the Play listing again.

```bash
keytool -genkeypair -v -keystore upload-keystore.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

### Play Console

**Setup → API access** → link a Google Cloud project → create a service account →
grant it *Release manager* → download the JSON. The app must already have one
manually-uploaded build; the API cannot create a listing from nothing.

### App Store Connect

**Users and Access → Integrations → App Store Connect API** → generate a key with
*App Manager* access. The `.p8` downloads **once**. Note the Key ID and Issuer ID.

---

## Build numbers

Every uploaded binary needs a distinct `android.versionCode` / `ios.buildNumber`,
or the store rejects it. CI uses the **GitHub Actions run number**, which only
ever increases.

Because `apps/mobile/app.config.ts` is code rather than static JSON, CI passes
the value through the environment and the config reads it — nothing is written to
disk and nothing needs reverting:

```ts
const buildNumber = Number(
  process.env.MOBILE_BUILD_NUMBER ?? process.env.GITHUB_RUN_NUMBER ?? 1,
);
```

The workflows set `MOBILE_BUILD_NUMBER: ${{ github.run_number }}` on the prebuild
step. The **marketing version** (`version`, currently `0.1.0`) is *not* touched —
bump that by hand when you want a new user-visible version.

---

## Running by hand

Every workflow has `workflow_dispatch` — **Actions → pick the workflow → Run
workflow**. The two dev workflows also accept custom `release_notes` to show
testers.

Locally, from `apps/mobile/`:

```bash
bundle install
bundle exec fastlane android android_dev      # needs the env vars above
bundle exec fastlane ios ios_dev
```

This is a pnpm workspace, so CI installs from the **repository root**
(`pnpm install --frozen-lockfile --ignore-scripts`) and then runs fastlane inside
`apps/mobile`. The lockfile cache key is the root `pnpm-lock.yaml`.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Could not find scheme skaddosh` | `expo prebuild` names the Xcode project after the app name. If the app is renamed, set the `IOS_SCHEME` variable — no code change needed |
| Play rejects the upload: version code already used | Two runs produced the same run number (e.g. a re-run of an old workflow). Re-run the latest, or bump manually |
| `The bundle version must be higher than the previously uploaded version` | Same cause, App Store side |
| App Distribution succeeds but nobody is notified | `FIREBASE_TESTER_GROUPS` is unset or names a group that doesn't exist |
| iOS build fails with a provisioning error | The profile name in `IOS_*_PROFILE_NAME` must match Apple's name **exactly**, and the profile must include the signing certificate |
| `bundler: command not found: fastlane` | `Gemfile`/`Gemfile.lock` out of sync — run `bundle install` in `apps/mobile/` and commit the lockfile |

## Files involved

```
.github/workflows/
  mobile-android-dev.yml       dev  -> App Distribution
  mobile-ios-dev.yml           manual -> App Distribution
  mobile-android-release.yml   main -> Play Console
  mobile-ios-release.yml       main -> App Store Connect

apps/mobile/
  Gemfile                      fastlane + plugins
  fastlane/Fastfile            all six lanes
  fastlane/Appfile             app identifiers
  fastlane/Pluginfile          firebase_app_distribution plugin
  app.config.ts                build number read from MOBILE_BUILD_NUMBER
```
