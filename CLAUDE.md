# YachtPA (working title)

Sea-service logbook for yacht crew: GPS-tracked voyages, voice-logged duties, a certificate wallet and qualification progress. Offline-first. Philosophy: **Work → speak → confirm.**

Two people, personal project, no client. Optimise for speed and free tiers.

## Read first

1. `docs/SCOPE.md` — current scope, stack, domain model, phases, open decisions.
2. `docs/DECISIONS.md` — dated decision log with rationale. Append, never rewrite.
3. `design/README.md` — the prototype builds and looks.

## Status (2026-09-25)

No app code yet. Scoping and UI direction done. Next: pick a Round 2 build, then the Phase 0 spike.

## Stack (decided, see DECISIONS.md)

Expo (React Native) + Expo Router · SQLite via PowerSync · Supabase (Postgres, Auth, Storage, Edge Functions) · MapLibre with OpenFreeMap tiles · on-device speech recognition (expo-speech-recognition) · Claude via a Supabase Edge Function, structured outputs against a strict schema · expo-print for PDF · EAS Build / Update / Submit · GitHub Actions (Linux runners only) · TestFlight · Sentry.

## Constraints that shape everything

- **iOS first for MVP.** The developer has no Mac and no iPhone. iOS builds go through EAS cloud. The test device is a co-founder's iPhone, at sea, reached only through TestFlight and over-the-air updates. The app must self-report: diagnostics log, send-diagnostics button, GPX export, crash reporting.
- **Free tiers only** until past ~1,000 monthly users.
- **AI never invents.** Strict JSON schema, activity taxonomy as an enum, every duty cites a transcript span, the server rejects spans not found in the transcript. Only text goes to the API, never audio.
- **Cloud AI is primary; offline is a queue.** Most yachts have Starlink. Transcripts queue locally and process on reconnect. On-device models are a Phase 2 question.
- **Location is tracked only between START and STOP.**
- **Requirements are data**, versioned with source URL and last-verified date. The app says "appears to meet", never "certified".

## Conventions

- Docs are the memory. Cloud sessions keep nothing between runs, so any decision made in a session goes into `docs/DECISIONS.md` with a date, and `docs/SCOPE.md` is updated to match.
- New dependency → note it in `docs/SCOPE.md` §5.
- Commit messages: short imperative subject, body only when the why isn't obvious.
- Working style for the humans here: direct, short, tables over prose. Dry humour welcome. No restating.
