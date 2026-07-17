-- Drop all app tables in reverse dependency order (safe for fresh installs)
drop table if exists baby_invites cascade;
drop table if exists growth_records cascade;
drop table if exists diaper_logs cascade;
drop table if exists sleep_logs cascade;
drop table if exists feeding_logs cascade;
drop table if exists baby_members cascade;
drop table if exists subscriptions cascade;
drop table if exists babies cascade;

-- profiles (manually managed — no trigger)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- babies
create table babies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birthdate date not null,
  gender text not null check (gender in ('male', 'female', 'other')),
  birth_weight_g numeric,
  birth_length_cm numeric,
  feeding_preference text check (feeding_preference in ('breast', 'formula', 'mixed')),
  is_premature boolean not null default false,
  gestational_weeks integer,
  photo_url text,
  created_at timestamptz not null default now()
);

-- baby_members
create table baby_members (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('parent', 'caregiver')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique(baby_id, user_id)
);

-- subscriptions
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium', 'family')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'trial')),
  trial_ends_at timestamptz,
  renews_at timestamptz,
  revenuecat_customer_id text,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- feeding_logs
create table feeding_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  logged_by uuid not null references auth.users(id),
  type text not null check (type in ('breast_left', 'breast_right', 'bottle', 'solid')),
  amount_ml numeric,
  duration_min numeric,
  started_at timestamptz not null default now(),
  notes text,
  source text not null default 'manual' check (source in ('manual', 'voice'))
);

-- sleep_logs
create table sleep_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  logged_by uuid not null references auth.users(id),
  sleep_type text not null check (sleep_type in ('nap', 'night')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'voice'))
);

-- diaper_logs
create table diaper_logs (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  logged_by uuid not null references auth.users(id),
  diaper_type text not null check (diaper_type in ('wet', 'dirty', 'both')),
  changed_at timestamptz not null default now(),
  notes text,
  source text not null default 'manual' check (source in ('manual', 'voice'))
);

-- growth_records
create table growth_records (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  logged_by uuid not null references auth.users(id),
  weight_g numeric,
  length_cm numeric,
  head_cm numeric,
  measured_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'voice'))
);

-- baby_invites
create table baby_invites (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  code text not null unique,
  role text not null check (role in ('parent', 'caregiver')),
  expires_at timestamptz not null,
  used_by uuid references auth.users(id),
  used_at timestamptz
);

-- RLS
alter table profiles enable row level security;
alter table babies enable row level security;
alter table baby_members enable row level security;
alter table subscriptions enable row level security;
alter table feeding_logs enable row level security;
alter table sleep_logs enable row level security;
alter table diaper_logs enable row level security;
alter table growth_records enable row level security;
alter table baby_invites enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "view member babies" on babies;
drop policy if exists "insert baby" on babies;
drop policy if exists "parent update baby" on babies;
create policy "view member babies" on babies for select using (exists (select 1 from baby_members where baby_id = babies.id and user_id = auth.uid()));
create policy "insert baby" on babies for insert with check (auth.uid() is not null);
create policy "parent update baby" on babies for update using (exists (select 1 from baby_members where baby_id = babies.id and user_id = auth.uid() and role = 'parent'));

drop policy if exists "view memberships" on baby_members;
drop policy if exists "insert own membership" on baby_members;
create policy "view memberships" on baby_members for select using (user_id = auth.uid());
create policy "insert own membership" on baby_members for insert with check (user_id = auth.uid());

drop policy if exists "own subscription" on subscriptions;
create policy "own subscription" on subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "member feeding logs" on feeding_logs;
drop policy if exists "member sleep logs" on sleep_logs;
drop policy if exists "member diaper logs" on diaper_logs;
drop policy if exists "member growth records" on growth_records;
create policy "member feeding logs" on feeding_logs for all using (exists (select 1 from baby_members where baby_id = feeding_logs.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = feeding_logs.baby_id and user_id = auth.uid()) and logged_by = auth.uid());
create policy "member sleep logs" on sleep_logs for all using (exists (select 1 from baby_members where baby_id = sleep_logs.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = sleep_logs.baby_id and user_id = auth.uid()) and logged_by = auth.uid());
create policy "member diaper logs" on diaper_logs for all using (exists (select 1 from baby_members where baby_id = diaper_logs.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = diaper_logs.baby_id and user_id = auth.uid()) and logged_by = auth.uid());
create policy "member growth records" on growth_records for all using (exists (select 1 from baby_members where baby_id = growth_records.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = growth_records.baby_id and user_id = auth.uid()) and logged_by = auth.uid());

drop policy if exists "parent invites" on baby_invites;
create policy "parent invites" on baby_invites for all using (exists (select 1 from baby_members where baby_id = baby_invites.baby_id and user_id = auth.uid() and role = 'parent')) with check (exists (select 1 from baby_members where baby_id = baby_invites.baby_id and user_id = auth.uid() and role = 'parent') and created_by = auth.uid());

-- Enable realtime for live log updates
alter publication supabase_realtime add table feeding_logs, sleep_logs, diaper_logs;

notify pgrst, 'reload schema';
