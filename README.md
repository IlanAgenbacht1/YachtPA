# YachtPA

An iPhone sea-service logbook for yacht crew that does the paperwork for you: GPS-tracked voyages, voice-logged duties, a certificate wallet and qualification progress, all offline-first.

Work → speak → confirm.

## Status

The Deck build (Round 2, build 4) is the base for the app. The Expo app in `mobile/` carries Deck's design tokens and saves real records on the phone: voyages from GPS, daily log, documents, experience totals. Aspects of the other builds may be folded in once the flows have been tested on real phones.

| Where | What |
|---|---|
| [mobile/](mobile/) | The Expo app. [mobile/README.md](mobile/README.md) says how to run it and what is still simulated. |
| [docs/BETA.md](docs/BETA.md) | How to build and get the app onto phones (Android APK for you, TestFlight for iPhones) |
| [docs/SCOPE.md](docs/SCOPE.md) | Draft scope: MVP boundary, hard problems, proposed stack, domain model, screens, phases |
| [docs/source/](docs/source/) | The two original requirement documents, verbatim |
| [design/prototype/](design/prototype/) | Interactive phone prototypes. Round 2: four different UI builds (Still, Chart, Ledger, Deck), each with its own 3-way look switch. Round 1: one app in two looks kept (Sailcloth, Horizon) |

## Next

1. Test on your Android phone, then send to iPhone testers via TestFlight: [docs/BETA.md](docs/BETA.md).
2. Phase 0 spike: background GPS for 24 h on a real phone, voice → structured log entry.
3. Build plan to MVP: [docs/SCOPE.md §13](docs/SCOPE.md#13-build-plan-to-mvp). M1 (local records) is done; M2 (qualifications) is next.
