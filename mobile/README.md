# YachtPA app

Expo (React Native) app built from the Deck prototype (`design/prototype/Deck.dc.html`), with all three of its looks: Horizon, Sailcloth and Night watch.

## Run

```
npm install
npx expo start      # scan the QR code with Expo Go on iOS or Android
npm run web         # or in a browser, at phone width
```

Everything used so far ships inside Expo Go, so no development build is needed yet.

## Checks

```
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, Expo's config
npm test            # domain unit tests (geometry, sun, track filtering, underway detection, summaries)
npm run export:web  # proves the bundle builds; output in dist/
```

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes (Expo Router). `(tabs)/` holds Home, Log, Experience, Documents, Profile. `live` and `summary` sit above the tabs. |
| `src/theme/tokens.ts` | The three looks, copied from the prototype's CSS custom-property blocks. Nothing on screen reads a colour directly. |
| `src/theme/fonts.ts` | Weight → font-family map. Space Grotesk + IBM Plex Sans (Horizon, Night), Fraunces + Figtree (Sailcloth). |
| `src/components/ui/` | Primitives: `Txt`, `Hero`, `Sheet`, `Card`, `Button`, `Chip`, `Tile`, `Ring`, `Icon`, `LookPill`. |
| `src/components/motion.tsx` | Reveal, blink, breathe, pulse, bars, drift, and the `useProgress` count-up hook. |
| `src/domain/` | Pure computation, unit-tested: great-circle and rhumb-line distance, sunrise/sunset and night minutes, fix filtering, underway segments, voyage stats, sanity flags, offline place names. |
| `src/db/` | SQLite (expo-sqlite): versioned schema, vessels and engagements, voyages and track points, totals. |
| `src/location/` | The background location task, permission and tracking controls, and the simulator. |
| `src/store/AppStore.tsx` | App state on top of the database: voyage lifecycle, live polling, the log-entry flow. |
| `src/data/sample.ts` | Sample data still used by the parts that are not real yet. |

## What is real and what is not

Real:

- Voyage tracking end to end. Start creates a voyage row; fixes from the background task (or the simulator) are filtered and stored as track points; Stop computes distance, duration, underway and night minutes, average and max speed, passage type and start/end place names from the stored track; Confirm adds it to the totals. Everything survives a relaunch, including a voyage left running.
- Looks, fonts, layout, animations, haptics.

Simulated or sample:

- The GPS on web, and on phones when you use Profile → Testing → Simulate a voyage. Same code path as real fixes from the first table onwards.
- The log entry flow (speech, AI draft) is still scripted from `sample.ts`.
- The qualification card, the documents list and the monthly bars are sample data.

Not yet: look persistence, vessel and engagement editing (a demo engagement is seeded on first launch), tracking restart after a reboot, notifications. App icon and splash are Expo placeholders.

## Background GPS on a phone

Expo Go on Android cannot run the foreground service background tracking needs, so use a development build for anything beyond the simulator: see [docs/SPIKE_GPS.md](../docs/SPIKE_GPS.md) and [docs/PLAY_STORE.md](../docs/PLAY_STORE.md).

## Notes

- `npx expo install` needs api.expo.dev, which some proxies block. If it fails, use `npm install <pkg>@<version>` with the version from `node_modules/expo/bundledNativeModules.json`.
- `AGENTS.md` is Expo's own guidance for AI tools working in this folder and is worth keeping current with the SDK.
