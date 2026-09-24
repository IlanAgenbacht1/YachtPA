# Design

## prototype/

Source of the interactive UI-direction prototype. Each `.dc.html` is one phone artboard (390×844) containing the full demo flow: Home → Start voyage → Stop → Confirm → Log today → voice → confirm, plus Experience and Documents tabs, a background-voyage mini bar, and a red night-watch mode.

| File | Look |
|---|---|
| `Main.dc.html` | A · Deep Water. Dark navy-to-teal, glass cards, brass milestones. Cormorant Garamond + Manrope. |
| `Sailcloth.dc.html` | B · Sailcloth. Warm off-white paper, white cards, teal action. Fraunces + Figtree. |
| `Horizon.dc.html` | C · Horizon. Dark hero over a light sheet, regatta-orange action. Space Grotesk + IBM Plex Sans. |
| `canvas.json` | Artboard layout and notes for the canvas |

The three files share one template. Only five lines differ: the `<title>`, the Google Fonts link, the `body` rule, the `a` rule and the `.root{…}` token block. Everything visual flows through those CSS variables, so the winning look's `.root` block becomes the app's design tokens.

The live, tappable version is the "YachtPA UI Directions" canvas on claude.ai. These files are the versioned source for it.
