-- Browser reminders are scoped to one first-party session and push subscription.
-- Configure an origin and the dispatcher separately after deploying this schema.
create table public.offtask_web_reminder_origins (
  origin text primary key,
  public_key text not null check (public_key ~ '^B[A-Za-z0-9_-]{86}$')
);

create table public.offtask_web_reminder_devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references auth.sessions(id) on delete cascade,
  origin text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null
);
create index offtask_web_reminder_device_owner on public.offtask_web_reminder_devices(user_id);
create index offtask_web_reminder_device_session on public.offtask_web_reminder_devices(session_id);

create table public.offtask_web_reminders (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.offtask_web_reminder_devices(id) on delete cascade,
  task_id text not null,
  note_id text not null default '',
  remind_at timestamptz not null,
  available_at timestamptz not null,
  lease uuid,
  unique(device_id, note_id, task_id)
);
create index offtask_web_reminders_due on public.offtask_web_reminders(available_at);
create index offtask_web_reminders_target on public.offtask_web_reminders(note_id, task_id);

alter table public.offtask_web_reminder_origins enable row level security;
alter table public.offtask_web_reminder_devices enable row level security;
alter table public.offtask_web_reminders enable row level security;
revoke all on public.offtask_web_reminder_origins, public.offtask_web_reminder_devices,
  public.offtask_web_reminders from public, anon, authenticated, service_role;
-- The existing app-only account-delete function can remove these devices and their queued rows.
grant select(user_id), delete on public.offtask_web_reminder_devices to service_role;

create function public.offtask_web_reminder_session() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  sid uuid;
begin
  if current_setting('role', true) <> 'authenticated' or auth.uid() is null
     or not public.offtask_first_party_request() or claims->>'is_anonymous' = 'true' then
    raise exception 'Use a signed-in Offtasks session' using errcode = '42501';
  end if;
  select s.id into sid
  from auth.sessions s join auth.users u on u.id = s.user_id
  where s.id::text = claims->>'session_id' and s.user_id = auth.uid()
    and s.oauth_client_id is null and (s.not_after is null or s.not_after > now())
    and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now());
  if sid is null then
    raise exception 'Sign in again to manage reminders' using errcode = '42501';
  end if;
  return sid;
end $$;

-- Read the latest task title when dispatching so a rename on another device is reflected.
create function public.offtask_web_reminder_title(owner_id uuid, note_key text, task_key text)
returns text language sql stable set search_path = '' as $$
  select case when note_key = '' then (
    select left(nullif(btrim(t.content), ''), 200) from public.tasks t
      where t.user_id = owner_id and t.id::text = task_key and t."isComplete" is not true
  ) else (
    select left(nullif(btrim(item->>'content'), ''), 200)
      from public.planner_items n
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(n.value->'tasks') = 'array' then n.value->'tasks' else '[]'::jsonb end
      ) item
      where n.user_id = owner_id and n.kind = 'note' and n.id = note_key
        and not n.deleted and n.id not like 'offtask-prd:%'
        and item->>'id' = task_key and item->>'isComplete' is distinct from 'true'
      limit 1
  ) end;
$$;

create function public.offtask_web_reminder_key(browser_origin text) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.offtask_web_reminder_session();
  return (select config.public_key from public.offtask_web_reminder_origins config where config.origin = browser_origin);
end $$;

create function public.offtask_web_reminder_list(browser_device uuid)
returns table(task_id text, note_id text, remind_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare sid uuid := public.offtask_web_reminder_session();
begin
  return query select r.task_id, r.note_id, r.remind_at
    from public.offtask_web_reminders r join public.offtask_web_reminder_devices d on d.id = r.device_id
    where d.id = browser_device and d.user_id = auth.uid() and d.session_id = sid and r.remind_at > now()
    order by r.remind_at;
end $$;

create function public.offtask_web_reminder_set(
  browser_device uuid, browser_origin text, task_key text, note_key text,
  fire_at timestamptz, subscription jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.offtask_web_reminder_session();
  owner_id uuid := auth.uid();
  endpoint_value text := subscription->>'endpoint';
  public_value text := subscription#>>'{keys,p256dh}';
  secret_value text := subscription#>>'{keys,auth}';
begin
  if browser_device is null or task_key is null or length(task_key) not between 1 and 240
     or note_key is null or length(note_key) > 240 then
    raise exception 'Invalid reminder task' using errcode = '22023';
  end if;
  if fire_at is null then
    delete from public.offtask_web_reminders r using public.offtask_web_reminder_devices d
    where d.id = r.device_id and d.id = browser_device and d.user_id = owner_id and d.session_id = sid
      and d.origin = browser_origin and r.note_id = note_key and r.task_id = task_key;
    return;
  end if;

  if not isfinite(fire_at) or fire_at <= now() then
    raise exception 'Choose a future reminder time' using errcode = '22023';
  end if;
  if not exists(select 1 from public.offtask_web_reminder_origins c where c.origin = browser_origin) then
    raise exception 'Web reminders are unavailable here' using errcode = '22023';
  end if;
  if endpoint_value is null or length(endpoint_value) > 2048
     or endpoint_value !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]#]+$'
     or public_value is null or public_value !~ '^B[A-Za-z0-9_-]{86}$'
     or secret_value is null or secret_value !~ '^[A-Za-z0-9_-]{22}$' then
    raise exception 'Invalid browser subscription' using errcode = '22023';
  end if;

  if note_key = '' then
    perform 1 from public.tasks t where t.user_id = owner_id and t.id::text = task_key for share;
  else
    perform 1 from public.planner_items n where n.user_id = owner_id and n.kind = 'note' and n.id = note_key for share;
  end if;
  if public.offtask_web_reminder_title(owner_id, note_key, task_key) is null then
    raise exception 'This task is no longer available for a reminder' using errcode = 'P0002';
  end if;

  insert into public.offtask_web_reminder_devices as d(id, user_id, session_id, origin, endpoint, p256dh, auth_secret)
    values (browser_device, owner_id, sid, browser_origin, endpoint_value, public_value, secret_value)
    on conflict(id) do update set session_id = excluded.session_id, endpoint = excluded.endpoint,
      p256dh = excluded.p256dh, auth_secret = excluded.auth_secret
    where d.user_id = owner_id and d.origin = browser_origin;
  if not found then
    raise exception 'This browser is linked to a different session' using errcode = '42501';
  end if;

  insert into public.offtask_web_reminders as r(device_id, task_id, note_id, remind_at, available_at)
    values(browser_device, task_key, note_key, fire_at, fire_at)
    on conflict(device_id, note_id, task_id) do update
      set id = gen_random_uuid(), remind_at = excluded.remind_at, available_at = excluded.available_at, lease = null
    where r.remind_at is distinct from excluded.remind_at;
end $$;

create function public.offtask_web_reminder_disconnect(browser_device uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid := public.offtask_web_reminder_session();
begin
  delete from public.offtask_web_reminder_devices d
    where d.id = browser_device and d.user_id = auth.uid() and d.session_id = sid;
end $$;

-- Cancel on completion or removal from either client, including note-linked tasks.
create function public.offtask_web_reminders_task_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'DELETE' or (new."isComplete" is true and old."isComplete" is not true) then
    delete from public.offtask_web_reminders r using public.offtask_web_reminder_devices d
      where r.device_id = d.id and d.user_id = old.user_id and r.note_id = '' and r.task_id = old.id::text;
  end if;
  return null;
end $$;

create trigger offtask_web_reminders_task_changed after update of "isComplete" or delete on public.tasks
for each row execute function public.offtask_web_reminders_task_changed();

create function public.offtask_web_reminders_note_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.kind = 'note' then
    delete from public.offtask_web_reminders r using public.offtask_web_reminder_devices d
      where r.device_id = d.id and d.user_id = old.user_id and r.note_id = old.id
        and public.offtask_web_reminder_title(old.user_id, old.id, r.task_id) is null;
  end if;
  return null;
end $$;

create trigger offtask_web_reminders_note_changed after update of value, deleted or delete on public.planner_items
for each row execute function public.offtask_web_reminders_note_changed();

-- Use a short lease so a timed-out worker can retry. IDs change on rescheduling.
create function public.offtask_web_reminder_claim(worker_key text)
returns table(id uuid, lease uuid, device_id uuid, endpoint text, p256dh text, auth_secret text,
  body text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.offtask_web_reminders r where r.remind_at <= now() - interval '15 minutes';
  return query
  with due as (
    select r.id from public.offtask_web_reminders r
    join public.offtask_web_reminder_devices d on d.id = r.device_id
    join public.offtask_web_reminder_origins c on c.origin = d.origin and c.public_key = worker_key
    where r.available_at <= now()
    order by r.available_at
    limit 40 for update of r skip locked
  ), claimed as (
    update public.offtask_web_reminders r
      set lease = gen_random_uuid(), available_at = now() + interval '90 seconds'
      from due where r.id = due.id
      returning r.*
  )
  select r.id, r.lease, d.id, d.endpoint, d.p256dh, d.auth_secret,
    case when s.oauth_client_id is null and (s.not_after is null or s.not_after > now())
          and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())
      then public.offtask_web_reminder_title(d.user_id, r.note_id, r.task_id) end,
    r.remind_at + interval '15 minutes'
  from claimed r join public.offtask_web_reminder_devices d on d.id = r.device_id
    join auth.sessions s on s.id = d.session_id and s.user_id = d.user_id
    join auth.users u on u.id = d.user_id;
end $$;

create function public.offtask_web_reminder_finish(job_id uuid, job_lease uuid, expired_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
declare device uuid;
begin
  delete from public.offtask_web_reminders r
    where r.id = job_id and r.lease = job_lease returning r.device_id into device;
  if expired_endpoint is not null and device is not null then
    delete from public.offtask_web_reminder_devices d where d.id = device and d.endpoint = expired_endpoint;
  end if;
end $$;

revoke all on function public.offtask_web_reminder_session(),
  public.offtask_web_reminder_title(uuid,text,text),
  public.offtask_web_reminder_key(text), public.offtask_web_reminder_list(uuid),
  public.offtask_web_reminder_set(uuid,text,text,text,timestamptz,jsonb),
  public.offtask_web_reminder_disconnect(uuid), public.offtask_web_reminders_task_changed(),
  public.offtask_web_reminders_note_changed(),
  public.offtask_web_reminder_claim(text), public.offtask_web_reminder_finish(uuid,uuid,text)
  from public, anon, authenticated, service_role;

grant execute on function public.offtask_web_reminder_key(text), public.offtask_web_reminder_list(uuid),
  public.offtask_web_reminder_set(uuid,text,text,text,timestamptz,jsonb),
  public.offtask_web_reminder_disconnect(uuid) to authenticated;
grant execute on function public.offtask_web_reminder_claim(text),
  public.offtask_web_reminder_finish(uuid,uuid,text) to service_role;
