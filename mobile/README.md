# YachtPA app

Expo (React Native) iPhone app built from the Deck prototype (`design/prototype/Deck.dc.html`), with all three of its looks: Horizon, Sailcloth and Night watch. Milestone M1 of the build plan in [docs/SCOPE.md §13](../docs/SCOPE.md#13-build-plan-to-mvp).

## Run

```
npm install
npx expo start      # scan the QR code with the iPhone camera, opens in Expo Go
npm run web         # or in a browser, at phone width (data in the browser, not shared with the phone)
```

Everything used so far ships inside Expo Go, so no development build is needed yet. To test a voyage at a desk, turn on Profile → Simulate GPS.

## Checks

```
npm test            # track maths and sun position (node --test, no extra deps)
npm run typecheck   # tsc --noEmit
npm run lint
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
| `src/components/TabBar.tsx` | Custom bottom tabs with the live-voyage mini bar docked above. |
| `src/store/AppStore.tsx` | Current yacht, the live voyage, toast. `useQuery` re-reads the database after every write. |
| `src/db/` | SQLite: schema and migrations (`db.ts`, append-only), all reads and writes (`repo.ts`). |
| `src/domain/` | Pure TypeScript, tested with `node --test`: distance, sun position, track filtering, underway detection, night hours, sanity checks. |
| `src/location/feed.ts` | GPS and the simulator. Picks background tracking when allowed, foreground otherwise. |
| `src/location/background.ts` | The background location task. Writes fixes straight to SQLite. Imported at start-up. |

## What is real and what is not yet

- Real: onboarding, yacht and position, voyages from GPS with distance, hours underway, night hours and speeds, sanity checks, daily log and diary, documents with expiry status, experience totals. All saved on the phone.
- Tracking with the phone locked: built (`src/location/background.ts`), works in real builds (APK, TestFlight) once location is set to "Always". In Expo Go it falls back to tracking only while the app is open. Not yet run on a real phone.
- Export: Profile → Export all my data writes a JSON file to the share sheet.
- Not built yet: qualifications (M2), notifications (M3), voice → AI draft (M4; use the keyboard mic for now), PDF export (M5), account and sync (M6).
- Builds: see [docs/BETA.md](../docs/BETA.md).
- Place names come from Apple's geocoder when online, coordinates when not. They can be edited on the summary.
- App icon and splash are still the Expo placeholders.

## Notes

- `npx expo install` needs api.expo.dev, which some proxies block. If it fails, use `npm install <pkg>@<version>` with the version from `node_modules/expo/bundledNativeModules.json`.
- `AGENTS.md` is Expo's own guidance for AI tools working in this folder and is worth keeping current with the SDK.
