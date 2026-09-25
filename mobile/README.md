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
| `src/store/AppStore.tsx` | Voyage and log flows. Also where the simulated position feed lives. |
| `src/data/sample.ts` | The sample data every prototype used. |

## What is real and what is simulated

- Real: navigation, looks and fonts, layout, animations, haptics on START and STOP.
- Simulated: GPS (one "minute" every 600 ms), speech to text, the AI draft. All of it is in `AppStore.tsx` and `sample.ts`, so nothing else changes when the real feeds land.
- Not persisted: the look choice and everything else reset on relaunch.
- App icon and splash are still the Expo placeholders.

## Notes

- `npx expo install` needs api.expo.dev, which some proxies block. If it fails, use `npm install <pkg>@<version>` with the version from `node_modules/expo/bundledNativeModules.json`.
- `AGENTS.md` is Expo's own guidance for AI tools working in this folder and is worth keeping current with the SDK.
