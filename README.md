# YachtPA

A sea-service logbook for yacht crew that does the paperwork for you: GPS-tracked voyages, voice-logged duties, a certificate wallet and qualification progress, all offline-first.

Work → speak → confirm.

## Status

The Deck build (Round 2, build 4) is the base for the app. The Expo app in `mobile/` carries Deck's design tokens and all six prototype screens, running on sample data. Aspects of the other builds may be folded in once the flows have been tested on real phones.

| Where | What |
|---|---|
| [mobile/](mobile/) | The Expo app. [mobile/README.md](mobile/README.md) says how to run it and what is still simulated. |
| [docs/SCOPE.md](docs/SCOPE.md) | Draft scope: MVP boundary, hard problems, proposed stack, domain model, screens, phases |
| [docs/source/](docs/source/) | The two original requirement documents, verbatim |
| [design/prototype/](design/prototype/) | Interactive phone prototypes. Round 2: four different UI builds (Still, Chart, Ledger, Deck), each with its own 3-way look switch. Round 1: one app in two looks kept (Sailcloth, Horizon) |

## Next

1. Run the app on both phones with Expo Go, walk the flows, note what to fold in from Still, Chart and Ledger.
2. Phase 0 spike: background GPS on iOS and Android for 24 h, voice → structured log entry.
3. Replace the sample data with real stores, starting with vessels and engagements.
