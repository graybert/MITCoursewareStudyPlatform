-- Shared manifests are file-based. Only private study state goes here.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 updated_at timestamptz not null default now()
);
create table public.study_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{"progress":{},"positions":{},"notes":[],"bookmarks":[],"theme":"dark"}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.study_state enable row level security;
create policy "Own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Own study state" on public.study_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
