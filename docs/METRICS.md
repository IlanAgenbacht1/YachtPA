# Usage metrics and diagnostics

Anonymous data from testers' phones, to see how YachtPA holds up at sea. Free (Supabase free tier), yours, and built for no signal: phones queue events and upload them in batches when they next have a connection.

## What is collected

Each phone has a random install ID. **Never sent:** names, emails, positions, place names, yacht names, log text or document details.

| Event | When | Main fields |
|---|---|---|
| `app_open` | App opened | app version, platform, OS, phone model |
| `setup_status` | App opened, Tracking setup | location on, allowed, precise, all the time / Always, notifications |
| `voyage_start` | Start voyage | tracking mode (locked / open only), battery %, charging, low power |
| `voyage_stop` | Stop voyage | NM, minutes, positions per hour, gaps, longest gap, battery % per hour |
| `voyage_resumed` | App reopened mid-voyage (swiped away or stopped by the phone) | minutes since last position |
| `voyage_confirmed` / `voyage_discarded` | Summary | NM, skipper, names edited |
| `manual_voyage_added` | Add a past voyage | NM, hours |
| `log_saved` | Daily log saved | number of duties and ticks, written by mic / tidy / typing |
| `mic_result` | Mic used | worked or not, error type, word count, on-device |
| `document_saved`, `pdf_exported`, `report_sent` | | |
| logs (`kind = log`) | Warnings and errors, crashes, failed screens | area, message |

Testers can switch it off: Profile → Share anonymous usage data (on by default for the beta, explained on the welcome screen).

## Setup (once, 2 minutes)

Needs the Supabase project from [BETA.md](BETA.md) step 0. In Supabase → SQL Editor, paste and run [`supabase/migrations/20261123000000_telemetry.sql`](../supabase/migrations/20261123000000_telemetry.sql). Nothing else: the app starts sending with its next update. No account or sign-in needed for testers.

## Reading it

Supabase → SQL Editor. Save these as snippets:

```sql
-- Who is testing, day by day
select * from metrics_daily;

-- Is tracking reliable, per phone model? (% logged with the phone locked, positions per hour, gaps, battery)
select * from metrics_tracking;

-- Every GPS voyage, newest first
select * from metrics_voyages limit 50;

-- Are phones set up right? Latest setup per tester
select * from metrics_setup;

-- Errors by app version and phone
select * from metrics_errors limit 50;

-- Is the mic working?
select * from metrics_mic;

-- Testers who closed the app mid-voyage (iPhone stops tracking when swiped away)
select ts, platform, model, props->>'minutesSinceLastPosition' as minutes
  from telemetry where name = 'voyage_resumed' order by ts desc;
```

Things to watch in the beta:

- **`metrics_tracking.pct_logged_locked` below 100:** phones logging only while open. Check `metrics_setup` for who lacks "Always" / "all the time".
- **`avg_longest_gap_min` over ~10:** the phone paused the app. On Android, battery saver; on iPhone, Low Power Mode or swiping away.
- **`est_battery_pct_per_12h` over 10:** above the target in SCOPE §12.
- **`metrics_errors`:** anything new after an update.

For charts, Grafana Cloud's free tier can read the same views (connect it to the Supabase Postgres with a read-only role).

## App Store privacy answers (App Store Connect → App Privacy)

Collected, **not linked to the user's identity**, **not used for tracking**:

- Diagnostics → Crash Data, Performance Data (battery), Other Diagnostic Data
- Usage Data → Product Interaction

Location is used on the phone to log voyages, and only summary numbers (miles, gaps) are sent, never positions; if cloud backup is used, voyages including positions are stored for the signed-in user. Declare that under Location → Precise Location, linked to the user, App Functionality, only if you turn on cloud backup.

No App Tracking Transparency prompt is needed: nothing tracks people across apps or websites.

iPhone crash reports and screenshot feedback from TestFlight testers arrive in App Store Connect → TestFlight, free, with no setup.
