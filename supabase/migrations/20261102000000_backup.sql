-- YachtPA cloud backup (SCOPE §13, M6).
--
-- The phone is the source of truth. Each table mirrors the phone's SQLite
-- table, plus user_id. Row-level security means a signed-in user can only
-- ever see or change their own rows. No foreign keys between tables, so the
-- phone can push rows in any order.

create table public.profile (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  id integer not null default 1,
  name text not null,
  nationality text,
  created_at bigint not null
);

create table public.vessels (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  name text not null,
  propulsion text not null check (propulsion in ('motor', 'sail')),
  loa_m double precision,
  gt double precision,
  flag text,
  created_at bigint not null,
  primary key (user_id, id)
);

create table public.engagements (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  vessel_id text not null,
  position text not null,
  start_date text not null,
  end_date text,
  captain text,
  company text,
  created_at bigint not null,
  primary key (user_id, id)
);

create table public.voyages (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  engagement_id text not null,
  started_at bigint not null,
  ended_at bigint,
  from_name text,
  to_name text,
  start_lat double precision, start_lon double precision,
  end_lat double precision, end_lon double precision,
  distance_nm double precision not null default 0,
  duration_min double precision not null default 0,
  underway_min double precision not null default 0,
  night_min double precision not null default 0,
  avg_kn double precision not null default 0,
  max_kn double precision not null default 0,
  overnight integer not null default 0,
  skipper integer not null default 0,
  underway_by_day text not null default '{}',
  source text not null,
  status text not null,
  primary key (user_id, id)
);

create table public.track_points (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  voyage_id text not null,
  ts bigint not null,
  lat double precision not null,
  lon double precision not null,
  accuracy double precision,
  primary key (user_id, voyage_id, ts)
);

create table public.log_entries (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  engagement_id text not null,
  date text not null,
  activities text not null default '[]',
  duties text not null default '[]',
  notes text not null default '',
  status text not null,
  updated_at bigint not null,
  primary key (user_id, id)
);

create table public.documents (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  name text not null,
  issuer text,
  number text,
  expires text,
  created_at bigint not null,
  primary key (user_id, id)
);

do $$
declare t text;
begin
  foreach t in array array['profile', 'vessels', 'engagements', 'voyages', 'track_points', 'log_entries', 'documents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Settings → Delete account: removes the user, and with it every row above.
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
