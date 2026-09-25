# Design tools

Checks and a screenshot harness for the `.dc.html` artboards in `design/prototype/`. Not part of the app.

| Tool | What it does |
|---|---|
| `lint_dc.py FILE` | Static checks for the artboard format: tag balance, holes are plain lookups, `sc-if`/`sc-for` hints, data-props JSON, root size, no emoji. |
| `check_logic.js FILE` | Runs the artboard's logic class under fake timers, resolves every `{{hole}}` against `renderVals()`, exercises every handler and look switch. |
| `harness/` | Renders an artboard in headless Chromium with a minimal emulation of the runtime and screenshots every screen and look listed in `plans.json`, then composes contact sheets. |

Run the harness (needs Playwright and Chromium; the artboards' Google Fonts must be cached as `harness/fonts/<Name>.css` with the woff2 files beside it, rewritten to relative paths):

```
export PW_ROOT=$(npm root -g)
node harness/shoot.js Still   # or Chart, Ledger, Deck; omit for all
node harness/sheet.js Still
```

Screenshots land in `harness/shots/<Name>/`. The emulation is not the real runtime: it re-renders on demand rather than reconciling, so treat it as a layout check, not a motion check.
