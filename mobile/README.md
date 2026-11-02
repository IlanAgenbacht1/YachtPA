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
npm test            # track maths, sun, qualifications, PDF, log draft, migrations, backup engine (node --test)
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
| `src/domain/qualifications.ts` | Qualification rules as data (RYA, with source URL and date) and the engine that measures a record against them. |
| `src/domain/recordHtml.ts` | The sea-service record as HTML; `src/lib/exportPdf.ts` turns it into a PDF. |
| `src/db/migrations.ts` | SQLite schema, append-only, plus the outbox triggers that record changes for backup. |
| `src/sync/engine.ts` | Backup and restore logic (pure; tested with node:sqlite and a fake cloud). `backup.ts` wires it to the app, `supabase.ts` makes the client. |
| `src/domain/draft.ts` | Dictated text → duties and activity ticks. |
| `src/lib/reminders.ts` | Local notifications, rebuilt from the database after every change. |
| `src/location/background.ts` | The background location task. Writes fixes straight to SQLite. Imported at start-up. |

## What is real and what is not yet

- Real: onboarding; yacht and position; voyages from GPS (or typed in by hand) with miles, hours underway, night hours, overnight detection and sanity checks; daily log and diary; documents with expiry status; experience totals and breakdowns; RYA Yachtmaster Coastal and Offshore progress; reminders; PDF sea-service record; JSON export. All on the phone.
- Tracking with the phone locked works in real builds (APK, TestFlight) once location is set to "Always". In Expo Go it tracks only while the app is open. Not yet run on a real phone.
- Log draft: dictate with the keyboard mic, then "Tidy into duties" (`src/domain/draft.ts`, on the phone).
- Cloud backup: optional, Supabase (`src/sync/`, schema in `../supabase/migrations/`). Off unless `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` are set in `.env`. Not yet run against a live project.
- Place names come from the phone's geocoder when online, coordinates when not. Editable on the summary.
- App icon and splash are still the Expo placeholders.
- Builds and testers: [docs/BETA.md](../docs/BETA.md).

## Notes

- `npx expo install` needs api.expo.dev, which some proxies block. If it fails, use `npm install <pkg>@<version>` with the version from `node_modules/expo/bundledNativeModules.json`.
- `AGENTS.md` is Expo's own guidance for AI tools working in this folder and is worth keeping current with the SDK.
