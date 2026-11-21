# YachtPA app

Expo (React Native) app built on the Deck design (`design/prototype/Deck.dc.html`), with its three looks: Horizon, Sailcloth and Night watch.

## Run

```
npm install
npx expo start      # scan the QR code with Expo Go on iOS or Android
npm run web         # exports the web build and serves it on :8081 (see "Web" below)
```

Expo Go runs everything except **background** GPS: in Expo Go a voyage tracks while the app is open. For tracking with the screen off, make a development build (`npx expo run:ios|android`, or `npx eas-cli@latest build --profile development`).

## Checks

```
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # domain unit tests (node:test + tsx)
npm run export:web  # proves the bundle builds; output in dist/
```

## Layout

| Path | What |
|---|---|
| `src/domain/` | Pure TypeScript, no React: voyage maths, night hours, sanity checks, experience totals, qualification rules engine, offline log draft, document status. Unit tested in `tests/`. |
| `src/domain/qualData.ts` | Qualification requirements as versioned data, each with its official source URL and the date it was checked. |
| `src/db/` | SQLite schema, migrations and the repository. Everything is stored on the phone first. |
| `src/tracking/tracker.ts` | GPS feed: background task, foreground watch, or simulated run. All three write to the same track table. |
| `src/store/AppStore.tsx` | Loads records into memory, runs actions (write to SQLite, then reload), derives totals from `src/domain`. |
| `src/lib/` | Notifications, PDF/JSON export, formatting, haptics. |
| `src/app/` | Routes (Expo Router). `(tabs)/` holds Home, Log, Experience, Documents, Profile. |
| `src/theme/`, `src/components/` | Design tokens and UI primitives from the Deck build. |

## What is real and what is not yet

Real, on the phone, offline:
- Onboarding, profile, vessels and engagements.
- Voyage START/STOP with GPS (background on a development build, foreground in Expo Go). Distance, underway time, night hours (from sun position), average and max speed, passage type and sanity flags, all computed from the track.
- Manual voyages for passages without GPS.
- Daily log: dictate or type → offline draft (splits and tidies only your words, tags activities, reads watch times) → edit → confirm. Voice note recorded and kept with the entry. Tick-list fallback.
- Diary by day with vessel filter and missing-day prompts.
- Experience totals and breakdowns; vessel history.
- Qualification progress for RYA Yachtmaster Coastal and Offshore, from the official RYA pages.
- Document wallet with photo/PDF copies, traffic-light status, renewals with history, and local expiry reminders (90/60/30 days, weekly, then daily).
- "Still underway?" after 24 h and milestone notifications.
- PDF sea-service record and full JSON export, shared from the phone. Delete all data.
- Records requested or signed for sign-off are locked (the Phase 2 lifecycle is in place).

Not yet (waiting on the backend decision, SCOPE §11.2):
- Account and login, cloud sync and backup.
- AI-polished duty wording (Claude) and transcription of the recorded audio. Today the transcript comes from the keyboard's dictation.
- Server-rendered PDF (the PDF is built on the phone for now).

Simulated GPS: turn it on in Profile → Settings to run a scripted Port Louis → Black River voyage at one minute per second. The web build always uses it.

## Web

expo-sqlite on web needs a cross-origin isolated page (SharedArrayBuffer). Expo's dev server cannot add the headers to the page in single-page mode, so `npm run web` exports the build and serves `dist/` through `scripts/serve-web.js`, which adds them. `npm run web:dev` starts Expo's own web server, but the database will not open there.

## Notes

- `npx expo install` needs api.expo.dev, which some proxies block. If it fails, use `npm install <pkg>@<version>` with the version from `node_modules/expo/bundledNativeModules.json`.
- `AGENTS.md` is Expo's own guidance for AI tools working in this folder and is worth keeping current with the SDK.
- App icon and splash are still the Expo placeholders.
