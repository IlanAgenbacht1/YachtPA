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
| Data export | Profile → Export all my data (JSON via the share sheet). |
| Cloud backup | Profile → Cloud backup. Optional; needs Step 0. Sign in with an emailed code; backs up automatically; restore from the welcome screen on a new phone. |
| Log draft | Dictate with the keyboard mic, then "Tidy into duties". On the phone, offline. |
| Data on the phone | Saved on the phone; survives restarts. |

## Step 0: cloud backup and metrics (done)

Set up on 2026-11-24: Supabase project `YachtPA` (Frankfurt), both SQL files applied, sign-in by email link (free projects can only send Supabase's default email, which contains a link, not a code: testers tap "Sign in" in the email on their phone and YachtPA opens signed in), 6-digit code kept as a fallback for when a custom email sender is added. `mobile/.env` is committed. The steps below are kept for reference.

### How it was set up

Without this the app works fully offline and testers use Profile → Export all my data. With it, they sign in with an emailed code and their record backs up by itself and can be restored on a new phone.

1. Create a free project at supabase.com.
2. SQL Editor → paste and run [`supabase/migrations/20261102000000_backup.sql`](../supabase/migrations/20261102000000_backup.sql). It creates the tables, row-level security (each user sees only their own rows) and the delete-account function.
3. Authentication → Emails → Templates: in **Magic Link**, and to be safe also **Confirm signup**, put the code in the email, e.g. `Your YachtPA code is {{ .Token }}`. The app asks for the code; it does not use links.
4. Authentication → Sign In / Providers → Email: set the email OTP length to **6** (the app says "6-digit code").
5. Project Settings → API Keys: copy the Project URL and the publishable (anon) key into `mobile/.env`, then commit it. Both are public by design; row-level security protects the data.

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxxx
```

6. For usage metrics, also run [`supabase/migrations/20261123000000_telemetry.sql`](../supabase/migrations/20261123000000_telemetry.sql). What it collects and how to read it: [METRICS.md](METRICS.md).

Free tier limits worth knowing:

- **Email:** Supabase's built-in email sends at most 2 emails an hour for the whole project. Fine for a few testers signing in once. For more, connect a free SMTP sender (Resend's free tier is plenty) under Authentication → SMTP.
- **Pausing:** free projects pause after about a week with no activity. Any tester opening the app counts as activity. If it does pause, nothing is lost: phones keep their data and queue the uploads; restore the project from the dashboard.

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

## When something goes wrong

Testers do not need signal at the time. The app keeps a log on the phone for 14 days: errors, voyages started and stopped, whether tracking ran with the phone locked, gaps with no position (the phone paused the app), mic and backup problems.

- **Profile → Send a problem report** shares it, with the phone model and the settings that matter (location "all the time", precise, notifications, mic), by WhatsApp or email. Ask testers to send one after any voyage that looks wrong, once they have signal.
- If a screen fails, they see "This screen didn't open properly, your records are safe" with **Send details**, which shares the same report.

## What to ask testers

- Did a voyage log the right miles with the phone in a pocket?
- Battery used over a long passage (Settings → Battery on iPhone).
- Any voyage that says "No movement detected" when they were moving.
- Anything confusing in the daily log.
- Do the qualification numbers match their own logbook?
- Is the PDF something they would hand to a captain?
