-- Reject SQL/JSON null and missing arrays before any device-import writes.
create or replace function public.import_device_items(payload jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare
  owner uuid := auth.uid();
  item jsonb;
begin
  if owner is null then raise exception 'Sign in before importing device items'; end if;
  if jsonb_typeof(payload) is distinct from 'object'
    or jsonb_typeof(payload->'tasks') is distinct from 'array'
    or jsonb_typeof(payload->'notes') is distinct from 'array'
    or jsonb_typeof(payload->'goals') is distinct from 'array' then
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
