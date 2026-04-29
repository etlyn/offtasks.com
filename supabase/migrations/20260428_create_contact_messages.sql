create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 2000),
  source text not null default 'landing' check (char_length(source) between 1 and 80),
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can submit contact messages" on public.contact_messages;

create policy "Anyone can submit contact messages"
on public.contact_messages
for insert
to anon, authenticated
with check (true);