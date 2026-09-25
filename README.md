# YachtPA

A sea-service logbook for yacht crew that does the paperwork for you: GPS-tracked voyages, voice-logged duties, a certificate wallet and qualification progress, all offline-first.

Work → speak → confirm.

## Status

The Deck build (Round 2, build 4) is the base for the app. The Expo app in `mobile/` carries Deck's design tokens and all six prototype screens. Voyage tracking is real: background GPS (or a simulator) into local SQLite, with distance, night hours and underway time computed from the stored track. The log entry, documents and qualification screens still run on sample data.

| Where | What |
|---|---|
| [mobile/](mobile/) | The Expo app. [mobile/README.md](mobile/README.md) says how to run it and what is still sample data. |
| [docs/SPIKE_GPS.md](docs/SPIKE_GPS.md) | Phase 0 spike protocol: the 24 h background-GPS test on real phones. |
| [docs/PLAY_STORE.md](docs/PLAY_STORE.md) | Google Play: costs, the closed-testing rule, background-location review, EAS build and submit commands. |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Draft privacy policy (Play requires a public one for background location). |
| [docs/SCOPE.md](docs/SCOPE.md) | Draft scope: MVP boundary, hard problems, proposed stack, domain model, screens, phases |
| [docs/source/](docs/source/) | The two original requirement documents, verbatim |
| [design/prototype/](design/prototype/) | Interactive phone prototypes. Round 2: four different UI builds (Still, Chart, Ledger, Deck), each with its own 3-way look switch. Round 1: one app in two looks kept (Sailcloth, Horizon) |

## Next

1. Open a Google Play Console account (25 USD) and an Expo account, then `eas build -p android --profile development` and run the GPS spike on both phones.
2. Voice → structured log entry spike: on-device speech to text, Claude structuring, offline queue.
3. Vessels and engagements: add current yacht, replace the seeded demo engagement.
4. Look persistence, log entries in SQLite, documents wallet on real data.
