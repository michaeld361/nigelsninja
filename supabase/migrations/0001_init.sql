-- Production schema for Nigel Job Search Assistant.
-- The local app runs on data/store.json until Supabase credentials are set.
-- Row level security: only authenticated users who appear in allowed_users.

create table allowed_users (
  email text primary key,
  role text not null check (role in ('candidate', 'admin'))
);

create table profile (
  id int primary key default 1 check (id = 1),
  cv_text text not null default '',
  cv_version int not null default 1,
  linkedin_summary text not null default '',
  personal_statement text not null default '',
  updated_at timestamptz not null default now()
);

create table profile_files (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  kind text not null check (kind in ('cv', 'certificate')),
  version int,
  uploaded_at timestamptz not null default now()
);

create table settings (
  id int primary key default 1 check (id = 1),
  keyword_tiers jsonb not null,
  locations jsonb not null,
  radius_miles int not null default 40,
  contract_types jsonb not null,
  score_threshold int not null default 60,
  standing_notes text not null default '',
  digest_enabled boolean not null default true,
  disclaimer_mode text not null default 'on',
  disclaimer_text text not null default '',
  monthly_spend_ceiling numeric not null default 120
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz,
  trigger text not null check (trigger in ('cron', 'manual')),
  counts jsonb not null default '{}',
  errors jsonb not null default '[]',
  estimated_cost_usd numeric not null default 0
);

create table raw_jobs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs (id) on delete cascade,
  source text not null,
  external_id text not null,
  payload jsonb not null,
  stored_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text unique not null,
  title text not null,
  company text not null,
  location text not null,
  remote boolean not null default false,
  hybrid_days int,
  salary_min numeric,
  salary_max numeric,
  salary_period text,
  currency text,
  contract_type text not null,
  posted_at timestamptz,
  closes_at timestamptz,
  sources jsonb not null default '[]',
  apply_url text,
  description_text text not null default '',
  status text not null,
  status_changed_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now()
);

create table fit_assessments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  model text not null,
  prompt_version text not null,
  score int not null,
  summary text not null,
  matches jsonb not null default '[]',
  gaps jsonb not null default '[]',
  blockers jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table letters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  version int not null,
  model text not null,
  prompt_version text not null,
  cv_version int not null,
  ref_line text not null,
  salutation text not null,
  body jsonb not null,
  sign_off text not null,
  notes_for_nigel text not null default '',
  unsupported_claims jsonb not null default '[]',
  word_count int not null,
  edited_body text,
  state text not null check (state in ('draft', 'reviewed')),
  docx_path text,
  created_at timestamptz not null default now(),
  unique (job_id, version)
);

create table job_notes (
  job_id uuid primary key references jobs (id) on delete cascade,
  text text not null default ''
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs (id) on delete set null,
  company text not null,
  title text not null,
  applied_at timestamptz not null,
  outcome text,
  outcome_at timestamptz
);

create table status_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  from_status text,
  to_status text not null,
  at timestamptz not null default now(),
  by_email text not null
);

alter table allowed_users enable row level security;
alter table profile enable row level security;
alter table profile_files enable row level security;
alter table settings enable row level security;
alter table runs enable row level security;
alter table raw_jobs enable row level security;
alter table jobs enable row level security;
alter table fit_assessments enable row level security;
alter table letters enable row level security;
alter table job_notes enable row level security;
alter table applications enable row level security;
alter table status_events enable row level security;

create or replace function is_allowed() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from allowed_users where email = auth.jwt() ->> 'email'
  );
$$;

create policy allowed_read on allowed_users for select using (is_allowed());
create policy profile_all on profile for all using (is_allowed()) with check (is_allowed());
create policy profile_files_all on profile_files for all using (is_allowed()) with check (is_allowed());
create policy settings_all on settings for all using (is_allowed()) with check (is_allowed());
create policy runs_all on runs for all using (is_allowed()) with check (is_allowed());
create policy raw_jobs_all on raw_jobs for all using (is_allowed()) with check (is_allowed());
create policy jobs_all on jobs for all using (is_allowed()) with check (is_allowed());
create policy fit_all on fit_assessments for all using (is_allowed()) with check (is_allowed());
create policy letters_all on letters for all using (is_allowed()) with check (is_allowed());
create policy notes_all on job_notes for all using (is_allowed()) with check (is_allowed());
create policy applications_all on applications for all using (is_allowed()) with check (is_allowed());
create policy events_all on status_events for all using (is_allowed()) with check (is_allowed());

insert into allowed_users (email, role) values
  ('nigel@nigeldown.com', 'candidate'),
  ('mail@michaeldown.co.uk', 'admin');

-- Reject sign-ups that are not on the allow-list. Requires Supabase Auth.
create or replace function reject_unknown_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from allowed_users where email = new.email) then
    raise exception 'This account is not on the allow-list';
  end if;
  return new;
end;
$$;
