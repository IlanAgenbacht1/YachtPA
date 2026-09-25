# YachtPA

A sea-service logbook for yacht crew that does the paperwork for you: GPS-tracked voyages, voice-logged duties, a certificate wallet and qualification progress, all offline-first.

Work → speak → confirm.

## Status

Scoping and UI direction done. Stack and platform decided (2026-09-25). No app code yet.

| Where | What |
|---|---|
| [docs/SCOPE.md](docs/SCOPE.md) | Scope: MVP boundary, hard problems, stack, domain model, screens, phases, open decisions |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Dated decision log: name shortlist, iOS first, AI and the offline queue, CI/CD, costs |
| [CLAUDE.md](CLAUDE.md) | Project memory for Claude Code sessions: read-first list, constraints, conventions |
| [docs/source/](docs/source/) | The two original requirement documents, verbatim |
| [design/prototype/](design/prototype/) | Interactive phone prototypes. Round 2: four different UI builds (Still, Chart, Ledger, Deck), each with its own 3-way look switch. Round 1: one app in two looks kept (Sailcloth, Horizon) |

## Next

1. Pick a build (and a look) from the Round 2 prototypes.
2. Enrol in the Apple Developer Program. One to three days, and everything iOS waits on it.
3. Phase 0 spike on iOS: instrument first, then background GPS on a real passage, voice → queued → Claude draft.
4. Expo app scaffold with the chosen design tokens.
