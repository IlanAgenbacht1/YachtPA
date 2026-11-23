-- YachtPA anonymous usage and diagnostics (closed beta observability).
--
-- Phones add rows; nobody can read them through the app's API. Each install
-- has a random ID: no name, email, position or yacht name is ever sent.
-- Read the data in the Supabase dashboard (SQL editor), with the views below.

create table public.telemetry (
  id bigserial primary key,
  install_id text not null check (length(install_id) between 8 and 64),
  ts timestamptz not null,
  received_at timestamptz not null default now(),
  kind text not null check (kind in ('event', 'log')),
  name text not null check (length(name) <= 64),
  level text check (level in ('error', 'warn', 'info')),
  message text check (length(message) <= 2000),
  props jsonb not null default '{}' check (pg_column_size(props) <= 4000),
  app_version text check (length(app_version) <= 32),
  platform text check (platform in ('ios', 'android', 'web')),
  os_version text check (length(os_version) <= 32),
  model text check (length(model) <= 64)
);
create index telemetry_ts on public.telemetry (ts);
create index telemetry_name_ts on public.telemetry (name, ts);

alter table public.telemetry enable row level security;
-- Insert only, signed in or not. No select/update/delete policy: phones can never read anyone's rows.
create policy "phones add rows" on public.telemetry for insert to anon, authenticated with check (true);
grant insert on public.telemetry to anon, authenticated;
grant usage, select on sequence public.telemetry_id_seq to anon, authenticated;

-- ── Views for the dashboard (not exposed to the app) ─────────────────────────

create view public.metrics_daily as
select date_trunc('day', ts)::date as day,
       count(distinct install_id) as active_testers,
       count(*) filter (where name = 'voyage_stop') as voyages,
       count(*) filter (where name = 'log_saved') as logs_saved,
       count(*) filter (where kind = 'log' and level = 'error') as errors
  from public.telemetry group by 1 order by 1 desc;

-- Is tracking reliable? One row per stopped GPS voyage.
create view public.metrics_voyages as
select ts, install_id, platform, model, app_version,
       props->>'mode' as mode,
       (props->>'nm')::numeric as nm,
       (props->>'durationMin')::numeric as duration_min,
       (props->>'positionsPerHour')::numeric as positions_per_hour,
       (props->>'gaps')::int as gaps,
       (props->>'longestGapMin')::int as longest_gap_min,
       (props->>'batteryPerHour')::numeric as battery_pct_per_hour,
       (props->>'lowPower')::boolean as low_power
  from public.telemetry
 where name = 'voyage_stop' and props->>'source' = 'gps'
 order by ts desc;

create view public.metrics_tracking as
select platform, model,
       count(*) as voyages,
       round(100.0 * avg(case when mode = 'background' then 1 else 0 end), 0) as pct_logged_locked,
       round(avg(positions_per_hour), 0) as avg_positions_per_hour,
       round(avg(longest_gap_min), 0) as avg_longest_gap_min,
       round(avg(battery_pct_per_hour), 2) as avg_battery_pct_per_hour,
       round(avg(battery_pct_per_hour) * 12, 1) as est_battery_pct_per_12h
  from public.metrics_voyages group by 1, 2 order by voyages desc;

-- Are phones set up right? Latest setup status per install.
create view public.metrics_setup as
select distinct on (install_id) install_id, ts, platform, model,
       (props->>'allowed')::boolean as location_allowed,
       (props->>'precise')::boolean as precise,
       (props->>'always')::boolean as always,
       (props->>'notifications')::boolean as notifications
  from public.telemetry where name = 'setup_status'
 order by install_id, ts desc;

-- Is it stable? Errors by version and phone.
create view public.metrics_errors as
select app_version, platform, model, name as area, message, count(*) as times, max(ts) as last_seen
  from public.telemetry where kind = 'log' and level = 'error'
 group by 1, 2, 3, 4, 5 order by last_seen desc;

-- Is the mic working?
create view public.metrics_mic as
select platform, model,
       count(*) filter (where (props->>'ok')::boolean) as ok,
       count(*) filter (where not (props->>'ok')::boolean) as failed,
       mode() within group (order by props->>'error') filter (where not (props->>'ok')::boolean) as common_error
  from public.telemetry where name = 'mic_result'
 group by 1, 2 order by count(*) desc;

-- Views read the table as their owner; keep them away from the app's API roles.
revoke all on public.metrics_daily, public.metrics_voyages, public.metrics_tracking,
              public.metrics_setup, public.metrics_errors, public.metrics_mic from anon, authenticated;
