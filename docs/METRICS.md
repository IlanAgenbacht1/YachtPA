# Usage metrics and diagnostics

Anonymous data from testers' phones, to see how YachtPA holds up at sea. Free (Supabase free tier), yours, and built for no signal: phones queue events and upload them in batches when they next have a connection.

## What is collected

Each phone has a random install ID. **Never sent:** names, emails, positions, place names, yacht names, log text or document details.

| Event | When | Main fields |
|---|---|---|
| `app_open` | App opened | app version, platform, OS, phone model |
| `setup_status` | App opened, Tracking setup | location on, allowed, precise, all the time / Always, notifications |
| `voyage_start` | Start voyage | tracking mode (locked / open only), battery %, charging, low power |
| `voyage_stop` | Stop voyage | NM, minutes, underway, positions (usable), first fix, pauses while moving, quiet gaps, battery % per hour |
| `voyage_resumed` | App reopened mid-voyage (swiped away or stopped by the phone) | minutes since last position |
| `voyage_confirmed` / `voyage_discarded` | Summary | NM, skipper, names edited |
| `manual_voyage_added` | Add a past voyage | NM, hours |
| `log_saved` | Daily log saved | number of duties and ticks, written by mic / tidy / typing |
| `mic_result` | Mic used | worked or not, error type, word count, on-device |
| `document_saved`, `pdf_exported`, `report_sent` | | |
| logs (`kind = log`) | Warnings and errors, crashes, failed screens, failed updates | area, message |

Testers can switch it off: Profile → Share anonymous usage data (on by default for the beta, explained on the welcome screen).

## Setup (once, 2 minutes)

Needs the Supabase project from [BETA.md](BETA.md) step 0. In Supabase → SQL Editor, paste and run [`supabase/migrations/20261123000000_telemetry.sql`](../supabase/migrations/20261123000000_telemetry.sql). Nothing else: the app starts sending with its next update. No account or sign-in needed for testers.

## Reading it

Supabase → SQL Editor. Browser and development runs are left out of every view. Each phone shows as a short **install** ID (8 characters), the same one printed at the top of a tester's problem report. **app_version** reads `0.1.0 01a20e76` (running that over-the-air update) or `0.1.0 built-in` (the installed build as shipped); rows from before 25 Nov 2026 show only `0.1.0`. Times are UTC; problem reports use phone time and say which.

```sql
-- Start here: every phone, what it runs, whether tracking is set up, what it has done
select * from metrics_installs;

-- Day by day
select * from metrics_daily;

-- Every GPS voyage, newest first
select * from metrics_voyages limit 50;

-- Tracking per phone model
select * from metrics_tracking;

-- Warnings and errors per phone, newest first
select * from metrics_problems limit 50;

-- Errors across phones: what to fix first
select * from metrics_errors;

-- The mic per phone model
select * from metrics_mic;

-- Follow one phone, event by event
select * from metrics_events where install = '3e1bc123' limit 100;
```

Two kinds of row: **events** (`kind = event`, something happened, details in `props`) and **logs** (`kind = log`, a warning or error; `name` is the part of the app, e.g. `voyage`, `mic`, `update`, `backup`).

Things to watch in the beta:

- **A phone you don't recognise** in `metrics_installs` with a few opens, every permission granted at once and nothing else: an automated scanner that picked up the APK link. Ignore it.
- **`tracking_ready = false`:** that tester never finished Tracking setup.
- **`metrics_voyages.pauses` / `metrics_tracking.pct_voyages_paused` above 0:** tracking stopped while the boat was moving: Android battery saver, or iPhone Low Power Mode / swiping the app away. `quiet_gaps` are different: no new position because the phone was sitting still, which is normal.
- **`pct_usable` below ~80:** positions too inaccurate to use (phone deep inside the boat).
- **`est_battery_pct_per_12h` over 10:** above the target in SCOPE §12.
- **`running` stuck on an old version** with `update` warnings in `metrics_problems`: that phone can't download updates.
- **`metrics_errors`:** anything new after an update.

For charts, Grafana Cloud's free tier can read the same views (connect it to the Supabase Postgres with a read-only role). The views are created by [`supabase/migrations/20261125000000_metrics_v2.sql`](../supabase/migrations/20261125000000_metrics_v2.sql) (re-runnable).

## App Store privacy answers (App Store Connect → App Privacy)

Collected, **not linked to the user's identity**, **not used for tracking**:

- Diagnostics → Crash Data, Performance Data (battery), Other Diagnostic Data
- Usage Data → Product Interaction

Location is used on the phone to log voyages, and only summary numbers (miles, gaps) are sent, never positions; if cloud backup is used, voyages including positions are stored for the signed-in user. Declare that under Location → Precise Location, linked to the user, App Functionality, only if you turn on cloud backup.

No App Tracking Transparency prompt is needed: nothing tracks people across apps or websites.

iPhone crash reports and screenshot feedback from TestFlight testers arrive in App Store Connect → TestFlight, free, with no setup.
