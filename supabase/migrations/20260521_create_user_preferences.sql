create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hide_completed boolean not null default false,
  advanced_mode boolean not null default false,
  theme_mode text not null default 'Light' check (theme_mode in ('Light', 'Dark')),
  auto_arrange boolean not null default false,
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their own preferences" on public.user_preferences;
drop policy if exists "Users can insert their own preferences" on public.user_preferences;
drop policy if exists "Users can update their own preferences" on public.user_preferences;
drop policy if exists "Users can delete their own preferences" on public.user_preferences;

create policy "Users can read their own preferences"
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert their own preferences"
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own preferences"
on public.user_preferences
for delete
to authenticated
using (user_id = auth.uid());