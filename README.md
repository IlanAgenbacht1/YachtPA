# YachtPA

A sea-service logbook for yacht crew that does the paperwork for you: GPS-tracked voyages, voice-logged duties, a certificate wallet and qualification progress, all offline-first.

Work → speak → confirm.

## Status

The Expo app in `mobile/` covers the offline part of the MVP (SCOPE §3) on real data stored on the phone: GPS voyages, daily log, diary, experience, RYA Yachtmaster progress, document wallet with reminders, and PDF/JSON export. Account, cloud sync and the AI-written draft wait on the backend decision (SCOPE §11.2). [mobile/README.md](mobile/README.md) lists exactly what is real.

| Where | What |
|---|---|
| [mobile/](mobile/) | The Expo app. [mobile/README.md](mobile/README.md) says how to run it and what is still simulated. |
| [docs/SCOPE.md](docs/SCOPE.md) | Draft scope: MVP boundary, hard problems, proposed stack, domain model, screens, phases |
| [docs/source/](docs/source/) | The two original requirement documents, verbatim |
| [design/prototype/](design/prototype/) | Interactive phone prototypes. Round 2: four different UI builds (Still, Chart, Ledger, Deck), each with its own 3-way look switch. Round 1: one app in two looks kept (Sailcloth, Horizon) |

## Next

1. Decide the backend (SCOPE §11.2). It unblocks login, sync and backup, and the Claude-written log draft.
2. Phase 0 spike on real phones: make a development build and run background GPS for 24 h on iOS and Android, measuring battery.
3. Walk the flows with crew in Expo Go; note what to fold in from Still, Chart and Ledger.
