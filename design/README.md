# Design

Decision (2026-09-25): **Deck** (Round 2, build 4) is the base for the app; its token blocks are now `mobile/src/theme/tokens.ts`. The other builds stay here as reference to fold aspects in from after testing.

## prototype/

Source of the interactive UI prototypes. Each `.dc.html` is one phone artboard (390×844) with the full demo flow inside it: Home → Start voyage → Stop → Confirm → Log today → voice → confirm, plus the secondary views, a live indicator while a voyage runs in the background, and a red night-watch look. Same sample data throughout.

The live, tappable version is the "YachtPA UI Directions" canvas on claude.ai. These files are the versioned source for it; `canvas.json` is the canvas index (two pages: Round 2 and Round 1).

### Round 2 · four different builds, each with its own look switch

Left to right: least to most on screen. Every build has a 3-way look switch inside the UI; one of the three is always the night-watch look (pure black, everything in red).

| File | Build | Idea | Type | Looks (switch) |
|---|---|---|---|---|
| `Still.dc.html` | 1 · Still | One thing at a time. Who/where, today, Start, Log, one line to the rest. Slow drifting colour fields, a ring that becomes the timer. | Instrument Serif + Outfit | Dusk · Dawn · Night (three orbs) |
| `Chart.dc.html` | 2 · Chart | The home screen is the chart. Stylised chart of the Mauritius west coast, live track drawing itself, controls floating on glass. | Bricolage Grotesque + Instrument Sans + JetBrains Mono | Day chart · Dusk chart · Night watch (layers popover) |
| `Ledger.dc.html` | 3 · Ledger | The app reads like a ship's log. Big serif dates, dotted leaders, rubber stamps, pages that turn. No tab bar. | Newsreader + Hanken Grotesk | Paper · Slate · Night (three ink pots) |
| `Deck.dc.html` | 4 · Deck | The Round 1 app, polished: dark hero over a light sheet, cards, bottom tabs. Fonts follow the look. | Space Grotesk + IBM Plex Sans (Horizon, Night) · Fraunces + Figtree (Sailcloth) | Horizon · Sailcloth · Night (three dots in a pill) |

A fourth build, Bridge (an instrument-panel dashboard), was dropped as off-theme; it is in git history. Each build's looks are pure CSS custom-property blocks (`.root`, `.root.<look>`) on the root element, so the chosen build's token block becomes the app's design tokens, and the night look is the same token mechanism, not a separate theme.

### Round 1 · one app, three looks (two kept for reference)

| File | Look |
|---|---|
| `Sailcloth.dc.html` | B · Sailcloth. Warm off-white paper, white cards, teal action. Fraunces + Figtree. |
| `Horizon.dc.html` | C · Horizon. Dark hero over a light sheet, regatta-orange action. Space Grotesk + IBM Plex Sans. |

The Round 1 files share one template; only the font link and the `.root{…}` token block differ. A · Deep Water (`Main.dc.html`) was dropped from the canvas in the editor; it is still in git history if needed.

## tools/

Lint, logic check and a screenshot harness for the artboards. See [tools/README.md](tools/README.md).
