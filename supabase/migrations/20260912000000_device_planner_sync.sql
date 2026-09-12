create table public.planner_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note', 'goal')),
  id text not null check (length(id) between 1 and 200),
  value jsonb not null,
  deleted boolean not null default false,
  primary key (user_id, kind, id),
  check (
    (kind = 'goal' and jsonb_typeof(value) = 'string') or
    (kind = 'note' and jsonb_typeof(value) = 'object'
      and value ?& array['id', 'title', 'body', 'pinned', 'updatedAt']
      and value->>'id' = id
      and jsonb_typeof(value->'title') = 'string'
      and jsonb_typeof(value->'body') = 'string'
      and jsonb_typeof(value->'pinned') = 'boolean'
      and jsonb_typeof(value->'updatedAt') = 'string')
  )
);

alter table public.planner_items enable row level security;
grant select, insert, update, delete on public.planner_items to authenticated;
revoke all on public.planner_items from anon;
create policy "Own planner items" on public.planner_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.tasks add column if not exists client_id text;
alter table public.tasks add column if not exists label text;
alter table public.tasks add column if not exists completed_at timestamptz;
create unique index tasks_user_client_id on public.tasks(user_id, client_id);

create function public.import_device_items(payload jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare
  owner uuid := auth.uid();
  item jsonb;
begin
  if owner is null then raise exception 'Sign in before importing device items'; end if;
  if jsonb_typeof(payload->'tasks') <> 'array' or jsonb_typeof(payload->'notes') <> 'array'
    or jsonb_typeof(payload->'goals') <> 'array'
    or not payload ?& array['tasks', 'notes', 'goals'] then
    raise exception 'Invalid device import';
  end if;
  if jsonb_array_length(payload->'tasks') + jsonb_array_length(payload->'notes') + jsonb_array_length(payload->'goals') > 5000 then
    raise exception 'Import limit exceeded';
  end if;
  for item in select value from jsonb_array_elements(payload->'tasks') loop
    if nullif(item->>'id', '') is null then raise exception 'Missing device task ID'; end if;
    insert into public.tasks(user_id, client_id, content, "isComplete", priority, target_group, date, label, completed_at)
      values (owner, item->>'id', item->>'content', (item->>'isComplete')::boolean,
        (item->>'priority')::integer, item->>'target_group', (item->>'date')::date,
        item->>'label', (item->>'completed_at')::timestamptz)
      on conflict (user_id, client_id) do nothing;
  end loop;
  for item in select value from jsonb_array_elements(payload->'notes') loop
    insert into public.planner_items(user_id, kind, id, value)
      values(owner, 'note', item->>'id', item) on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(payload->'goals') loop
    insert into public.planner_items(user_id, kind, id, value)
      values(owner, 'goal', lower(item #>> '{}'), item) on conflict do nothing;
  end loop;
end;
$$;
revoke all on function public.import_device_items(jsonb) from public, anon;
grant execute on function public.import_device_items(jsonb) to authenticated;