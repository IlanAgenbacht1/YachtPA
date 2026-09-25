# Decisions

Dated log. Newest first. Rationale lives here; [SCOPE.md](SCOPE.md) carries the current state.

## 2026-09-25

### Name

- **Salt** was the favourite and is rejected. SALT Superyachts (UK, yacht and crew management, since 2017) is a same-industry collision, and the App Store already has a telco, a bank and a dating app called Salt.
- **Shortlist: Teak first, Keel as the safe fallback.** Both clean in the yachting industry as of today. Store listing will be "<Name>: Sea Service Log" either way, because a bare English word is unfindable.
- Also rejected: Wake (WakeKeeper is a sailing trip logger), Kedge (a business school), Hail (a feature in the Sea People app), Seatime (SeaTime Tracker exists).
- Still to do: trademark search and domains (teak.app, getteak.app, keel.app, keel.boats). YachtPA stays the working title until then.

### Platform: iOS first

- Testers are yachties and mostly on iPhone. Android is deferred until after MVP.
- The developer has no Mac and no iPhone. Daily loop runs on an Android phone with Expo Go and a dev build; iOS is verified through EAS cloud builds on a co-founder's iPhone, at sea.
- Apple Developer Program under the developer's own Apple ID, enrolled on the web with SMS two-factor. The account holder is the legal seller; write that into the partner agreement.
- Testers: TestFlight internal track for the first few (invite by email, no review), external public link after the first Beta App Review. TestFlight builds expire after 90 days, so ship a fresh build at least every 80 days.

### Connectivity assumption

Most yachts now have Starlink or decent internet. Cloud AI is the primary path. Offline is handled by queueing, not by a local model. The minority on old phones with no internet get transcript plus tick-list until there is demand for more.

### Speech to text

- On-device OS recogniser through expo-speech-recognition. Offline, free, audio never leaves the phone.
- Fallback if the spike shows poor accuracy on accents or nautical vocabulary: whisper.rn. Cloud transcription only if both fail. Claude takes text, not audio, so this step is separate regardless.

### AI structuring

- Claude from a Supabase Edge Function. The phone never holds the API key.
- The model is a config value. Default `claude-opus-5` with effort `low`; the task is small extraction. Structured outputs against a strict JSON schema; the activity taxonomy is an enum in the schema.
- Honesty is enforced in code, not the prompt: every duty carries a quoted transcript span, and the function drops any span not found in the transcript.
- System prompt and schema sit behind a prompt-cache breakpoint.
- Cost at 30 entries per user per month, list prices: Opus 5 about $0.44, Sonnet 5 about $0.17, Haiku 4.5 about $0.09. GPT-5.6 Terra and Gemini 3.1 Pro both about $0.19; cheap tiers $0.01 to $0.02. Irrelevant below ~1,000 users. Pick by eval on ~50 real transcripts collected in the spike; the sensible band is the middle tier.
- DeepSeek ruled out on data handling: transcripts name vessels, captains and positions.

### Offline processing: the queue

- Entry lifecycle: `queued` → `drafted` → `confirmed`. Transcript is saved locally at record time. PowerSync uploads the row when the phone has signal. A Supabase database webhook calls the edge function, which writes the draft and sets `drafted`. The row syncs back; push notification "ready to review".
- If the crew member confirms before the draft arrives, the draft lands as a suggestion and never overwrites.
- Failures are a status column; a pg_cron job retries `failed` rows every ten minutes.
- On-device LLMs deferred to Phase 2. Order of preference then: Apple Foundation Models (iPhone 15 Pro and newer, free, no download), then llama.rn with a 1B to 4B model only if testers are on old phones. A rules-based offline draft is also deferred.

### PDF export

On-device with expo-print. Free and works offline. Replaces the server-side HTML → PDF in the original scope, which would need a paid container.

### Maps

MapLibre with OpenFreeMap tiles. No key, no bill.

### CI/CD

- GitHub Actions on Linux runners only for lint, typecheck, unit tests and edge-function tests against a local Supabase. Never macOS runners: they count tenfold against the free minutes.
- EAS Build for native binaries, gated by the Expo GitHub Action's continuous-deploy-fingerprint mode: build only when the native layer changes, otherwise publish an EAS Update.
- EAS Submit to TestFlight. Supabase CLI in Actions for migrations and functions. Two free Supabase projects, staging and production; a weekly Action pings staging so it does not pause. The PowerSync free instance has the same seven-day inactivity rule.
- Maestro on an Android emulator for end-to-end tests later. iOS end-to-end stays manual.

### Costs to a testable MVP

| Item | Cost |
|---|---|
| Apple Developer Program | $99 per year |
| Claude API credit | $5 to start |
| Expo, Supabase, PowerSync, GitHub, TestFlight, OTA updates, Sentry, map tiles | $0 |
| Google Play, only if Android is added | $25 once |
| Optional: Expo Starter for build-queue priority during native iteration | $19 per month, cancel after |

Bill starts past ~1,000 monthly users: Expo Starter $19/month, Supabase Pro $25/month.

### Phase 0 spike, revised

- Runs on the co-founder's iPhone on a real passage, so the app has to report on itself. Build the instrumentation first: a local diagnostics log (every fix, background wake, permission state, battery, foreground/background transitions), a Send-diagnostics button (upload to Supabase Storage, or share sheet when there is one bar of signal), GPX track export, Sentry with offline queueing.
- Two 24-hour runs: Low Power Mode off, then on. Watch for the iOS "still allow Always?" re-prompt that appears a few days in.
- In-app "Check for updates" button so the tester chooses when code changes underneath them. expo-updates rollback protection stays on.

### Reference: outsourcing cost

If the MVP were bought instead of built: lower-end realistic South African price is R180k to R220k for spike plus MVP from a mid-level React Native freelancer (about 400 hours at R450 to R550 an hour), Phase 2 another R72k to R132k. Quotes below ~R120k mean a junior, and the GPS and offline scope will quietly get cut.

### Confirmed

- Stack as recommended in SCOPE.md §5: Expo, PowerSync, Supabase. All subsequent planning proceeded on this basis.
- Personal project, two people, no client (already confirmed 2026-09-24).
