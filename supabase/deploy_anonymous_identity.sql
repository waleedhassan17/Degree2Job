-- JobPulse PK anonymous identity migration
-- Run this once in the Supabase SQL editor.
-- It is idempotent and can be re-run safely.

create extension if not exists "pgcrypto";

create table if not exists public.anonymous_users (
  id uuid primary key default gen_random_uuid(),
  anon_key text not null unique,
  current_resume_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anonymous_users_anon_key_idx
  on public.anonymous_users (anon_key);

alter table public.resumes
  add column if not exists user_id uuid references public.anonymous_users (id) on delete set null;

alter table public.saved_jobs
  add column if not exists user_id uuid references public.anonymous_users (id) on delete cascade;

create index if not exists resumes_user_idx on public.resumes (user_id);
create index if not exists saved_user_idx on public.saved_jobs (user_id);

-- Backfill existing rows so current sessions keep working.
update public.resumes
set user_id = null
where user_id is null;

update public.saved_jobs
set user_id = null
where user_id is null;

-- Add a per-user uniqueness guard for saved jobs.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_jobs_user_job_key'
  ) then
    alter table public.saved_jobs
      add constraint saved_jobs_user_job_key unique (user_id, job_id);
  end if;
end $$;

-- Optional: keep the old session-scoped unique key in place so the app can
-- continue to fall back safely when the anonymous_users table isn't available.
