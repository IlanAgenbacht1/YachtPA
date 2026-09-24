# YachtPA — Scope v0.1 (draft for discussion)

Date: 2026-09-24
Status: draft. Nothing here is decided until the open decisions in §11 are answered.
Sources: [01-product-requirements.md](source/01-product-requirements.md), [02-initial-concept.md](source/02-initial-concept.md)

## 1. Product in one line

An offline-first mobile app that builds a yacht crew member's sea-service record automatically: GPS-tracked voyages, voice-logged duties, a certificate wallet, and qualification progress, exportable as a professional PDF and (later) verifiable by a captain.

Philosophy: **Work → speak → confirm.** Under two minutes a day. Open → Log → Done.

## 2. Reconciling the two source documents

The documents agree on the core and differ on emphasis. Proposed resolution:

| Topic | Doc 1 (PRD) | Doc 2 (Concept) | Proposed |
|---|---|---|---|
| GPS voyage tracking | Core | Core | Core. MVP. |
| Voice → AI | Duties list only | Full log: passage, activities, watches | One voice entry produces a structured log entry: passage details (only if not GPS-tracked), activity tags from a fixed taxonomy, duty bullets, watch times. AI adds nothing that is not in the transcript. |
| Activity tick-list | Not mentioned | Core | MVP. Doubles as the schema the AI maps speech onto. |
| Certificates + expiry | Post-MVP (§13) | Core daily need (§5) | **Recommend MVP.** Low complexity, and it is the reason to open the app when not at sea. Decision needed. |
| Verification | Per-voyage request | Bulk sign-off → signed and locked | Doc 2 model wins. Data model and status lifecycle in MVP, the feature itself in Phase 2. |
| Qualification progress | Core selling point | Career path | MVP ships progress against 2–3 officially sourced qualifications. Full career-path wizard Phase 2. |
| Night hours | Auto from GPS | Manual watch times | Both. Auto from track + sun position; manual watch entries editable and override. |
| Home screen | START VOYAGE / LOG DUTIES / MY MILES / QUALIFICATIONS | LOG TRIP / Experience / Documents / Career / Profile | Merged. See §7. |
| Schools, visa, jobs, B2B, references, marketplace | Future | Future | Phase 3+. Out of scope for now. |

Note on doc 1's "1,500 NM Yachtmaster" example: that figure does not match a published RYA threshold. Requirements get seeded from official RYA/MCA pages with source and date recorded, never from memory or examples.

## 3. MVP boundary

### In

1. Account + basic profile
2. Vessels and engagements (which yacht, position, dates, captain, company)
3. Voyage tracking: START / STOP, background GPS, works offline
4. Voyage summary on STOP: from → to, NM, duration, night hours, avg/max speed, day/night, map of track, confirm
5. Daily log entry: voice → AI draft → edit → confirm. Tick-list and manual entry as fallbacks
6. Diary: history by day, per vessel
7. Experience totals and breakdown (motor/sail, vessel size band, position, passage type)
8. Certificate wallet with expiry reminders (recommended, see decision)
9. Qualification progress driven by a rules table, seeded with 2–3 qualifications
10. Sanity checks: impossible movement, tracking too long, unusual distance, missed days
11. PDF sea-service record export
12. Offline-first storage with cloud sync and backup
13. Push notifications: expiry, milestones, "still underway?"

### Out (Phase 2 and later)

Captain sign-off and locking, certificate OCR, career-path wizard, B2B yacht dashboard, schools database, location-based services, passport/visa assistant, jobs, references, CV builder, marketplace.

## 4. Hardest problems, ranked

1. **Background GPS.** Battery over an 18-hour passage, iOS suspending the app, Android foreground-service rules, and the "Always allow location" permission prompt. This gets a spike before anything else is built.
2. **Underway detection and distance quality.** GPS jitter at anchor produces phantom miles. Needs an accuracy filter, a speed threshold, outlier rejection and a "you look stationary" prompt. Good news: boats are slow, so one fix per 30–60 s is accurate enough and battery-friendly.
3. **Sea-time definitions differ by authority.** RYA, MCA and IYT count "days", "night hours" and "passages" differently. Store raw facts (underway segments, days aboard, positions, watches); compute each metric per authority in the rules layer.
4. **Qualification rules engine.** A single qualification can combine rule types: total miles, days aboard, days as skipper, passages over a distance measured along the rhumb line, overnight passages, night hours, share of time in tidal waters, a rolling time window, vessel-size limits, plus prerequisite certificates. Rules must be data, not code.
5. **Offline AI.** Voice must work offshore. Record locally, transcribe on-device where the OS supports it, queue LLM structuring for reconnect. The user can confirm a transcript-only entry offline and get the polished version later.
6. **AI honesty.** "Never invent duties." Strict JSON schema, every output item must map to a span of the transcript, and the user sees the draft before anything is saved.
7. **Offline place names.** "Port Louis → Black River" needs a bundled ports/places dataset so start and end names work without signal.

## 5. Proposed stack (decision needed)

| Layer | Recommended | Alternative | Why |
|---|---|---|---|
| Mobile | Expo (React Native) + Expo Router | Flutter | One codebase for iOS and Android; background location via expo-location + TaskManager; Reanimated and Skia give the fluid, animated UI the brief wants; EAS handles builds and store submission. |
| Local store | SQLite via PowerSync client | WatermelonDB | Offline-first with proper sync semantics, not hand-rolled. |
| Backend | Supabase (Postgres, Auth, Storage, RLS, Edge Functions) | .NET API on Azure | Fastest path to MVP; row-level security gives "the user owns their data" for free. Azure/.NET is viable if staying in that ecosystem matters more than speed. |
| Sync | PowerSync ↔ Supabase | Custom queue | Battle-tested offline sync, conflict handling included. |
| Speech to text | On-device recogniser (iOS / Android) offline; cloud transcription when online | Whisper on-device | Offline is non-negotiable for crew. |
| AI structuring | Claude with structured output against a fixed schema | | Model choice at implementation time. |
| Maps | MapLibre | Mapbox | Open, offline tile packs possible later. |
| PDF | Server-side HTML → PDF | On-device PDF | Consistent output, emailable, one template. |
| Push | Expo Notifications | | |
| Captain sign-off page (Phase 2) | Small web app, magic link | | Captains must not need to install anything. |

## 6. Domain model v0

| Entity | Key fields | Notes |
|---|---|---|
| User / Profile | name, nationality, contact, photo, current position | |
| Vessel | name, type, motor/sail, LOA, GT, flag, IMO, official number, home port | Shared master data, user-scoped for now |
| Engagement | user, vessel, position, start, end, captain, management company | "Add current yacht" creates one. Voyages and log entries attach to the active engagement. |
| Voyage | engagement, start/end time, start/end fix, start/end place, distance NM, duration, night minutes, avg/max speed, source (gps/manual), status | User-bounded by START/STOP |
| UnderwaySegment | voyage, start, end, distance | Auto-detected movement within a voyage; drives "hours underway" |
| TrackPoint | voyage, ts, lat, lon, accuracy, speed | Local only in full; thinned before sync |
| LogEntry | engagement, date, location, voyages[], activity tags[], duties[], watches[], voice note, transcript, ai draft, status | One per day per engagement |
| Duty | log entry, text, category | Output of AI or manual |
| Watch | log entry, start, end, type | Night watches feed night hours |
| Document | type, issuer, number, issue date, expiry, file, superseded by | Certificates, passport, visas, medical |
| Qualification | authority, name, source URL, verified date | |
| RequirementRule | qualification, rule type, threshold, parameters | Data-driven |
| SignOffRequest (Phase 2) | crew, signer contact, entries[], token, status, signed at, signer identity | |

Status lifecycle for voyages and log entries: **draft → confirmed → requested → signed (locked)**. Built into MVP so Phase 2 does not need a migration.

## 7. Screens (MVP)

    HOME
    ┌──────────────────────────────────┐
    │ ⚓ M/Y Shadow · Deckhand           │  active engagement + last known place
    │ Port Louis                        │
    ├──────────────────────────────────┤
    │        [  START VOYAGE  ]         │  becomes a live card while tracking
    │        [  🎙  LOG TODAY  ]         │
    ├──────────────────────────────────┤
    │ My experience  2,487 NM · 184 h   │
    │ Documents      🟢 8 · 🟠 1          │
    │ Yachtmaster Offshore  ▓▓▓▓░ 51%   │
    └──────────────────────────────────┘
    Tabs: Home · Log · Experience · Documents · Profile

| Screen | Purpose |
|---|---|
| Onboarding | Account, why location "Always" is needed, add first vessel |
| Home | Above |
| Voyage live | Elapsed, NM so far, speed, small track map, STOP |
| Voyage summary | Auto-filled numbers, place names, day/night, confirm or edit |
| Log entry | Big record button → transcript → AI draft → tick-list and duty bullets → confirm |
| Diary | Calendar / list by day, filter by vessel |
| Experience | Lifetime totals, breakdowns, longest passage, largest vessel |
| Qualifications | Per qualification: progress ring, requirement checklist, "appears to meet" wording, source link |
| Vessels | List, add/edit vessel, engagements |
| Documents | Wallet with traffic-light status, add via camera/PDF, history of superseded ones |
| Profile | Personal and professional details |
| Export | Generate and share PDF |
| Settings | Units, sync status, permissions, export all data, delete account |

## 8. UI direction

Elegant, nautical, not kitsch. The practical constraints matter as much as the look: crew use this with wet hands, in sunlight, and at night on watch.

- **Palette:** deep navy to ocean-teal gradients for backdrops; warm off-white "sailcloth" surfaces for content; a brass/gold accent reserved for milestones and verified marks; green/amber/red used only for document status.
- **Motion:** slow breathing horizon line while a voyage is live; STOP slides the summary up with numbers counting in; progress rings animate on threshold; restrained celebration on milestones; shared-element transitions from list to detail. Reanimated + Skia.
- **Practical:** high contrast for sun readability; large one-handed tap targets; haptics on START/STOP; a red-on-black night mode to protect night vision on watch.
- **Type:** one clean sans for text, tabular figures for numbers so totals line up.
- **No clutter:** the home screen holds five things. Forms show three fields and a "more" disclosure.

## 9. Computation rules v0

| Metric | Rule |
|---|---|
| Distance | Sum of great-circle distance between filtered fixes, in NM. Filter: accuracy ≤ 50 m, drop fixes implying > 60 kn since the previous fix. |
| Underway | Speed ≥ 1 kn sustained ≥ 2 min starts a segment; 10 min below ends it. Thresholds configurable. |
| Hours underway | Sum of underway segments. |
| Night hours | Time between sunset and sunrise at the fix position, per authority definition where they differ. |
| Day / night passage | Any night minutes → night passage; segments spanning a full night → overnight passage. |
| Sea day | Local calendar day with at least one underway segment. |
| Day aboard | Any day inside an engagement. |
| Passage distance for rules | Rhumb-line start → end where the rule demands it; track distance for logged miles. |
| Sanity flags | Voyage > 24 h → "still underway?"; avg speed > 40 kn → check; jump > 200 NM from last known position with no voyage → confirm; 3 days no entry while engaged → prompt. |

## 10. Phases

| Phase | Weeks (rough) | Outcome |
|---|---|---|
| 0 — Spike | 1–2 | Background GPS proven on both platforms over a 24 h run. Voice → structured log proven end to end. Stack confirmed. |
| 1 — MVP | 8–12 | §3 "In" list, TestFlight / internal testing with real crew. |
| 2 — Trust | 4–6 | Captain sign-off and locking, smart notifications, certificate OCR, career-path wizard, richer stats. |
| 3 — Network | later | B2B yacht dashboard, jobs, references, schools, visa assistant, marketplace. |

## 11. Open decisions

1. **Mobile stack:** Expo/React Native (recommended) or Flutter?
2. **Backend:** Supabase (recommended for speed) or Azure/.NET (ecosystem fit)?
3. **MVP boundary:** include the certificate wallet? Captain sign-off in MVP or Phase 2?
4. **First qualifications to seed:** RYA Yachtmaster Coastal + Offshore and STCW basic set?
5. **Whose product:** personal project with a friend, no client (confirmed 2026-09-24). Optimise for speed and free tiers; put IP and revenue split in writing between the two of you.
6. **Team and timeline:** solo or team, target date for first crew test?
7. **App name:** working title "YachtPA" from the folder.

## 12. Non-negotiables and risks

- The app never claims to certify. Wording is always "appears to meet" with the official source linked.
- Requirements are versioned data with source URL and last-verified date.
- Location is tracked only between START and STOP. Clear consent, clear off switch.
- App Store review needs a visible, user-triggered reason for background location. START VOYAGE is that reason.
- Users can export everything (JSON + PDF) and delete their account.
- Battery: target under 10% per 12 h of tracking on a mid-range phone. Measured in the spike.
