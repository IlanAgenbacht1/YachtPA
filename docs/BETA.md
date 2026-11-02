# Getting YachtPA onto phones

You have an Android phone and no Mac; your testers have iPhones. Nothing below needs a Mac or an iPhone: Expo's cloud service (EAS) builds the app.

## What's ready

| | |
|---|---|
| iOS and Android bundles compile | Checked with `expo export` |
| iOS permissions and background mode | Checked with `expo prebuild`: `UIBackgroundModes: location`, "Always" prompt text, no-encryption flag set (skips the export-compliance question) |
| Tracking with the phone locked | Built (`src/location/background.ts`). **Not yet run on a real phone.** |
| Reminders | Document expiry, "Still underway?", missed days. Local, no server. |
| Sea service record | Profile → Sea service record (PDF). |
| Qualifications | RYA Yachtmaster Coastal and Offshore progress from the official requirements. |
| Past sea time | Log → + Add a past voyage. |
| Data export | Profile → Export all my data (JSON via the share sheet). The safety net until cloud backup exists. |
| Data on the phone | Saved on the phone; survives restarts. |

## Step 1: test it yourself on Android (free)

1. Make a free Expo account at expo.dev.
2. From `mobile/`:

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest build --platform android --profile preview
```

3. Open the link it prints on your phone and install the APK (allow installs from your browser when Android asks).
4. Start a voyage, allow location **All the time**, lock the phone, go for a drive or a sail, stop, check the miles.

Expo Go also works for a quick look at the screens, but it cannot track with the phone locked. The APK can.

## Step 2: send it to the iPhones ($99/yr)

1. Join the Apple Developer Program at developer.apple.com (needs an Apple ID; any device can do the sign-up in a browser).
2. Change `ios.bundleIdentifier` in `mobile/app.json` if `com.yachtpa.app` is taken. It is permanent once the app exists in App Store Connect.
3. From `mobile/`:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

EAS asks for your Apple login, creates the certificates, builds in the cloud and uploads to TestFlight.

4. In App Store Connect → TestFlight, add your friends by email (internal testers need to be added to your team; external testers need a short Beta App Review, usually a day).
5. They install the TestFlight app, accept the invite, install YachtPA.

Notes for the boat:
- They need internet once to install. After that the app works offline.
- TestFlight builds expire after 90 days. Ship a new build before then.
- Ask them to export their data (Profile → Export all my data) every so often. It is a beta.

## What to ask testers

- Did a voyage log the right miles with the phone in a pocket?
- Battery used over a long passage (Settings → Battery on iPhone).
- Any voyage that says "No movement detected" when they were moving.
- Anything confusing in the daily log.
- Do the qualification numbers match their own logbook?
- Is the PDF something they would hand to a captain?
