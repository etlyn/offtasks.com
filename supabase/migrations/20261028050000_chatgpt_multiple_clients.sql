-- Allow a separately registered public ChatGPT client alongside the existing
-- development client. This migration does not register or enable any client.
drop index public.offtask_one_enabled_chatgpt_client;
create unique index offtask_one_public_chatgpt_listing
 on public.offtask_oauth_clients(host_kind)
 where host_kind='chatgpt' and enabled and install_url is not null;

-- The existing web and installed mobile clients accept decimal revisions. Bind
-- that revision to every ChatGPT client policy and this owner's grant revision,
-- so an old confirmation cannot revoke a different or newly added connection.
create function public.offtask_chatgpt_snapshot(owner_id uuid) returns text
language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare state jsonb; digest bytea; value numeric:=0; i integer;
begin
 select coalesce(jsonb_agg(jsonb_build_array(c.client_id::text,c.revision::text,
  c.enabled,g.revision::text) order by c.client_id),'[]'::jsonb)
 into state from public.offtask_oauth_clients c
 left join public.offtask_oauth_grants g on g.client_id=c.client_id and g.user_id=owner_id
 where c.host_kind='chatgpt';
 digest:=sha256(convert_to(state::text,'UTF8'));
 for i in 0..31 loop value:=value*256+get_byte(digest,i); end loop;
 return value::text;
end $$;

create or replace function public.offtask_chatgpt_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_oauth_owner(); entry record;
 any_enabled boolean:=false; any_grant boolean:=false; any_authorized boolean:=false;
 can_write boolean:=false; provider_active boolean; install_url text;
begin
 for entry in
  select c.client_id,c.enabled,c.resource,c.allowed_permissions,c.install_url,
   g.active,g.pending_permissions,g.resource as grant_resource,g.permissions
  from public.offtask_oauth_clients c
  left join public.offtask_oauth_grants g on g.client_id=c.client_id and g.user_id=owner
  where c.host_kind='chatgpt' order by c.client_id
 loop
  if entry.enabled then
   any_enabled:=true;
   if entry.install_url is not null then install_url:=entry.install_url; end if;
  end if;
  if coalesce(entry.active,false) or entry.pending_permissions is not null then
   any_grant:=true;
  end if;
  if coalesce(entry.active,false) then
   if entry.enabled and entry.grant_resource=entry.resource
      and public.offtask_oauth_permissions_valid(entry.permissions)
      and entry.permissions<@entry.allowed_permissions then
    begin
     execute $provider$
      select exists(select 1 from auth.users u
       join auth.sessions s on s.user_id=u.id and s.oauth_client_id=$2
       join auth.oauth_clients client on client.id=s.oauth_client_id and client.deleted_at is null
       join auth.oauth_consents consent on consent.user_id=u.id and consent.client_id=client.id and consent.revoked_at is null
       where u.id=$1 and u.deleted_at is null and(u.banned_until is null or u.banned_until<=now())
        and(s.not_after is null or s.not_after>now()))
     $provider$ into provider_active using owner,entry.client_id;
    exception when undefined_table or undefined_column or datatype_mismatch then
     raise exception using message='connection_status_unavailable: unsupported provider schema',errcode='55000';
    end;
    if provider_active then
     any_authorized:=true;
     can_write:=can_write or 'write'=any(entry.permissions);
    end if;
   end if;
  end if;
 end loop;
 return jsonb_strip_nulls(jsonb_build_object(
  'status',case when any_authorized then 'authorized' when any_grant then 'reconnect'
                when any_enabled then 'disconnected' else 'unavailable' end,
  'install_url',install_url,
  'permissions',case when any_authorized then to_jsonb(case when can_write then array['read','write']::text[] else array['read']::text[] end) else null end,
  'revision',case when any_grant then public.offtask_chatgpt_snapshot(owner) else null end
 ));
end $$;

-- One confirmation disconnects all of the owner's ChatGPT grants, including
-- disabled clients with latent grants. Existing mobile callers keep the same
-- signature, and a retry with the same key returns the original result.
create or replace function public.offtask_chatgpt_revoke(expected_owner uuid,expected_revision text,request_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_oauth_owner(); entry record; fingerprint text;
 prior public.offtask_integration_requests; result jsonb; affected integer:=0;
begin
 if expected_owner is distinct from owner then raise exception using message='forbidden: account changed',errcode='42501';end if;
 if expected_revision is null or expected_revision!~'^[0-9]{1,78}$'
    or request_key is null or length(request_key)not between 8 and 200 or request_key!~'^[A-Za-z0-9_.:-]+$' then
  raise exception using message='validation_failed',errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('owner',owner,'revision',expected_revision)::text,'UTF8')),'hex');
 select * into prior from public.offtask_integration_requests r
  where r.user_id=owner and r.operation='chatgpt.revoke' and r.target='all' and r.request_key=$3;
 if found then
  if prior.payload_hash<>fingerprint then raise exception using message='request_key_conflict',errcode='40001';end if;
  return prior.result;
 end if;
 lock table public.offtask_oauth_clients in share mode;
 perform g.client_id from public.offtask_oauth_grants g
  join public.offtask_oauth_clients c on c.client_id=g.client_id
  where g.user_id=owner and c.host_kind='chatgpt' order by g.client_id for update of g;
 if public.offtask_chatgpt_snapshot(owner)<>expected_revision then
  raise exception using message='revision_conflict',errcode='40001';end if;
 for entry in
  select g.client_id,g.revision from public.offtask_oauth_grants g
  join public.offtask_oauth_clients c on c.client_id=g.client_id
  where g.user_id=owner and c.host_kind='chatgpt'
   and (g.active or g.pending_permissions is not null) order by g.client_id
 loop
  perform public.offtask_oauth_revoke_consent(entry.client_id,entry.revision::text,request_key);
  affected:=affected+1;
 end loop;
 if affected=0 then raise exception using message='not_found: ChatGPT authorization unavailable',errcode='P0002';end if;
 result:=jsonb_build_object('disconnected',true);
 insert into public.offtask_integration_requests(user_id,operation,target,request_key,payload_hash,result)
  values(owner,'chatgpt.revoke','all',request_key,fingerprint,result);
 return result;
end $$;

revoke all on function public.offtask_chatgpt_snapshot(uuid) from public,anon,authenticated,service_role;
revoke all on function public.offtask_chatgpt_status(),public.offtask_chatgpt_revoke(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.offtask_chatgpt_status(),public.offtask_chatgpt_revoke(uuid,text,text) to authenticated;
