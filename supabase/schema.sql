-- ─────────────────────────────────────────────────────────────────────────────
-- DataGuard — Supabase schema
-- Paste this into: Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists users (
  id          text primary key default replace(gen_random_uuid()::text, '-', ''),
  google_sub  text unique not null,
  email       text unique not null,
  name        text not null,
  picture     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  last_login  timestamptz not null default now()
);

create table if not exists scans (
  id              text primary key,
  user_id         text references users(id) on delete set null,
  status          text not null default 'queued',
  progress        float not null default 0,
  current_stage   text not null default 'queued',
  risk_score      float not null default 0,
  total_exposures int not null default 0,
  result_json     text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists scans_user_id_idx on scans(user_id);
create index if not exists scans_created_at_idx on scans(created_at desc);

-- Row-level security: users can only see their own scans
alter table scans enable row level security;
create policy "Users see own scans" on scans
  for all using (user_id = auth.uid()::text);

-- The functions use the service role key which bypasses RLS
