-- ─────────────────────────────────────────────
-- JobPulse PK — initial schema
-- Run this in the Supabase SQL editor (or via the CLI) before first use.
-- ─────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── Anonymous users ─────────────────────────
create table if not exists public.anonymous_users (
  id              uuid primary key default gen_random_uuid(),
  anon_key        text not null unique,
  current_resume_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists anonymous_users_anon_key_idx on public.anonymous_users (anon_key);

-- ── Resumes ──────────────────────────────────
create table if not exists public.resumes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.anonymous_users (id) on delete set null,
  session_id      text not null,
  file_url        text,
  raw_text        text,
  parsed_profile  jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists resumes_session_idx on public.resumes (session_id);
create index if not exists resumes_user_idx on public.resumes (user_id);

-- ── Jobs ─────────────────────────────────────
create table if not exists public.jobs (
  id                  text primary key,
  external_id         text,
  title               text not null,
  company             text not null,
  location            text,
  city                text,
  salary_min          integer,
  salary_max          integer,
  salary_currency     text default 'PKR',
  job_type            text default 'full-time',
  experience_required text,
  description         text,
  requirements        jsonb default '[]'::jsonb,
  source              text not null,
  apply_url           text,
  posted_at           timestamptz,
  fetched_at          timestamptz not null default now(),
  is_active           boolean not null default true
);

create index if not exists jobs_source_idx   on public.jobs (source);
create index if not exists jobs_city_idx     on public.jobs (city);
create index if not exists jobs_posted_idx   on public.jobs (posted_at desc);
create index if not exists jobs_active_idx   on public.jobs (is_active);

-- ── Job matches ──────────────────────────────
create table if not exists public.job_matches (
  id             uuid primary key default gen_random_uuid(),
  resume_id      uuid not null references public.resumes (id) on delete cascade,
  job_id         text not null references public.jobs (id) on delete cascade,
  score          integer not null check (score between 0 and 100),
  verdict        text,
  match_reasons  jsonb default '[]'::jsonb,
  missing_skills jsonb default '[]'::jsonb,
  highlight      text,
  created_at     timestamptz not null default now(),
  unique (resume_id, job_id)
);

create index if not exists matches_resume_idx on public.job_matches (resume_id);
create index if not exists matches_score_idx  on public.job_matches (score desc);

-- ── Saved jobs / application tracker ─────────
create table if not exists public.saved_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.anonymous_users (id) on delete cascade,
  session_id  text not null,
  job_id      text not null references public.jobs (id) on delete cascade,
  status      text not null default 'saved'
              check (status in ('saved','applied','interview','offer','rejected')),
  notes       text,
  applied_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (session_id, job_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_jobs_user_job_key'
  ) then
    alter table public.saved_jobs
      add constraint saved_jobs_user_job_key unique (user_id, job_id);
  end if;
end $$;

create index if not exists saved_session_idx on public.saved_jobs (session_id);
create index if not exists saved_user_idx on public.saved_jobs (user_id);
create index if not exists saved_status_idx  on public.saved_jobs (status);

-- ── Row Level Security ───────────────────────
-- The app uses anonymous, session-id based access. The service-role key
-- (used only in server route handlers) bypasses RLS. For the anon key we
-- enable RLS and allow read access to jobs; writes go through the server.
alter table public.resumes     enable row level security;
alter table public.jobs        enable row level security;
alter table public.job_matches enable row level security;
alter table public.saved_jobs  enable row level security;

-- Jobs are public, read-only to the anon client.
drop policy if exists "jobs are readable" on public.jobs;
create policy "jobs are readable"
  on public.jobs for select
  using (true);

drop policy if exists "matches are readable" on public.job_matches;
create policy "matches are readable"
  on public.job_matches for select
  using (true);

-- Resumes and saved_jobs are written/read via the server (service role),
-- so no anon policies are granted here. Add scoped policies if you later
-- introduce Supabase Auth.
