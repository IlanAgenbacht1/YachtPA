-- Metrics v2: clearer views over the same telemetry table. No change to the table or to what phones send.
--
-- - Test runs are left out: browser and development builds ('web', app versions ending in -dev).
-- - Every view shows a short install ID (first 8 characters), the same one printed in a
--   tester's problem report, so a report can be matched to its phone.
-- - app_version reads "0.1.0 01a20e76" (over-the-air update) or "0.1.0 built-in" from builds
--   made after 25 Nov 2026; older rows show just "0.1.0".
-- - Events (kind = 'event': something happened, details in props) and logs (kind = 'log':
--   a warning or error with a message, name = the part of the app) get separate views.

drop view if exists public.metrics_tracking;
drop view if exists public.metrics_voyages;
drop view if exists public.metrics_daily, public.metrics_setup, public.metrics_errors, public.metrics_mic;
drop view if exists public.metrics_installs, public.metrics_problems, public.metrics_events, public.telemetry_real;

-- Real phones only.
create view public.telemetry_real as
select *, left(install_id, 8) as install
  from public.telemetry
 where platform in ('ios', 'android') and coalesce(app_version, '') not like '%-dev%';

-- One row per phone: who it is, what it runs, how it is set up, what it has done.
create view public.metrics_installs as
with base as (
  select install,
         max(platform) as platform,
         max(model) as model,
         max(os_version) as os,
         min(ts) as first_seen,
         max(ts) as last_seen,
         count(*) filter (where name = 'app_open') as opens,
         count(*) filter (where name = 'voyage_start') as voyages_started,
         count(*) filter (where name = 'voyage_stop') as voyages_stopped,
         count(*) filter (where name = 'log_saved') as logs_saved,
         count(*) filter (where name = 'mic_result') as mic_uses,
         count(*) filter (where kind = 'log' and level = 'warn') as warnings,
         count(*) filter (where kind = 'log' and level = 'error') as errors
    from public.telemetry_real group by install
), latest as (
  select distinct on (install) install, app_version from public.telemetry_real order by install, ts desc
), setup as (
  select distinct on (install) install,
         (props->>'allowed')::boolean and (props->>'precise')::boolean
           and ((props->>'always')::boolean or not (props->>'canAlways')::boolean) as tracking_ready,
         (props->>'notifications')::boolean as notifications
    from public.telemetry_real where name = 'setup_status' order by install, ts desc
)
select b.install, b.platform, b.model, b.os, l.app_version as running,
       s.tracking_ready, s.notifications,
       b.first_seen, b.last_seen, b.opens, b.voyages_started, b.voyages_stopped, b.logs_saved, b.mic_uses,
       b.warnings, b.errors
  from base b left join latest l using (install) left join setup s using (install)
 order by b.last_seen desc;

-- Day by day.
create view public.metrics_daily as
select date_trunc('day', ts)::date as day,
       count(distinct install) as active_phones,
       count(*) filter (where name = 'voyage_stop') as voyages,
       count(*) filter (where name = 'log_saved') as logs_saved,
       count(*) filter (where kind = 'log' and level = 'warn') as warnings,
       count(*) filter (where kind = 'log' and level = 'error') as errors
  from public.telemetry_real group by 1 order by 1 desc;

-- Every stopped GPS voyage, newest first: is tracking reliable?
create view public.metrics_voyages as
select ts, install, platform, model, app_version,
       props->>'mode' as mode,
       (props->>'nm')::numeric as nm,
       (props->>'durationMin')::numeric as duration_min,
       (props->>'underwayMin')::numeric as underway_min,
       (props->>'nightMin')::numeric as night_min,
       (props->>'positions')::int as positions,
       round(100.0 * (props->>'usable')::numeric / nullif((props->>'positions')::numeric, 0), 0) as pct_usable,
       (props->>'positionsPerHour')::numeric as positions_per_hour,
       (props->>'firstFixSec')::int as first_fix_sec,
       -- pauses: tracking stopped while moving (the phone paused the app). From builds after 25 Nov 2026.
       (props->>'pauses')::int as pauses,
       (props->>'longestPauseMin')::int as longest_pause_min,
       -- quiet gaps: no new position for 10+ min, including simply sitting still.
       (props->>'gaps')::int as quiet_gaps,
       (props->>'longestGapMin')::int as longest_quiet_min,
       (props->>'batteryPerHour')::numeric as battery_pct_per_hour,
       (props->>'lowPower')::boolean as low_power
  from public.telemetry_real
 where name = 'voyage_stop' and props->>'source' = 'gps'
 order by ts desc;

-- Tracking per phone model.
create view public.metrics_tracking as
select platform, model,
       count(*) as voyages,
       round(100.0 * avg(case when mode = 'background' then 1 else 0 end), 0) as pct_logged_locked,
       round(avg(pct_usable), 0) as avg_pct_usable,
       round(avg(first_fix_sec), 0) as avg_first_fix_sec,
       round(100.0 * avg(case when pauses > 0 then 1 else 0 end), 0) as pct_voyages_paused,
       round(avg(longest_pause_min), 0) as avg_longest_pause_min,
       round(avg(battery_pct_per_hour), 2) as avg_battery_pct_per_hour,
       round(avg(battery_pct_per_hour) * 12, 1) as est_battery_pct_per_12h
  from public.metrics_voyages group by 1, 2 order by voyages desc;

-- Latest setup per phone.
create view public.metrics_setup as
select distinct on (install) install, ts, platform, model,
       (props->>'services')::boolean as phone_location_on,
       (props->>'allowed')::boolean as location_allowed,
       (props->>'precise')::boolean as precise,
       (props->>'always')::boolean as always,
       (props->>'notifications')::boolean as notifications
  from public.telemetry_real where name = 'setup_status'
 order by install, ts desc;

-- Warnings and errors, newest first, one row per message per phone.
create view public.metrics_problems as
select max(ts) as last_seen, install, level, name as area, message, count(*) as times, max(app_version) as app_version, max(model) as model
  from public.telemetry_real where kind = 'log'
 group by install, level, name, message
 order by last_seen desc;

-- Errors only, grouped across phones: what to fix first.
create view public.metrics_errors as
select name as area, message, count(*) as times, count(distinct install) as phones, max(ts) as last_seen, max(app_version) as latest_version
  from public.telemetry_real where kind = 'log' and level = 'error'
 group by 1, 2 order by phones desc, times desc;

-- The mic, per phone model.
create view public.metrics_mic as
select platform, model,
       count(*) filter (where (props->>'ok')::boolean) as ok,
       count(*) filter (where not (props->>'ok')::boolean) as failed,
       mode() within group (order by props->>'error') filter (where not (props->>'ok')::boolean) as common_error,
       mode() within group (order by props->>'service') as usual_service
  from public.telemetry_real where name = 'mic_result'
 group by 1, 2 order by count(*) desc;

-- Every event in order, readable: for following one phone (where install = 'c4659132').
create view public.metrics_events as
select ts, install, platform, kind, coalesce(level, '') as level, name,
       case when kind = 'log' then message else props::text end as detail,
       app_version
  from public.telemetry_real
 order by ts desc;

-- Views read the table as their owner; keep them away from the app's API roles.
revoke all on public.telemetry_real, public.metrics_installs, public.metrics_daily, public.metrics_voyages, public.metrics_tracking,
              public.metrics_setup, public.metrics_problems, public.metrics_errors, public.metrics_mic, public.metrics_events
  from anon, authenticated;
