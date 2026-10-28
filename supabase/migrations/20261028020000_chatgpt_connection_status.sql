-- A distinct, operator-configured client prevents the existing Codex grant
-- from being mistaken for a ChatGPT connection. No client is enabled here.
alter table public.offtask_oauth_clients
 add column host_kind text not null default 'other' check(host_kind in ('other','chatgpt')),
 add column install_url text check(install_url is null or install_url ~ '^https://chatgpt\.com/plugins/[A-Za-z0-9_/-]+$');
create unique index offtask_one_enabled_chatgpt_client on public.offtask_oauth_clients(host_kind)
 where host_kind='chatgpt' and enabled;

-- This is an Offtasks authorization status, not a claim that ChatGPT is
-- installed or that a host-side connection has remained available.
create function public.offtask_chatgpt_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_oauth_owner(); c public.offtask_oauth_clients;
 g public.offtask_oauth_grants; provider_active boolean:=false;
begin
 select * into c from public.offtask_oauth_clients where host_kind='chatgpt' and enabled;
 if not found then return jsonb_build_object('status','unavailable'); end if;
 select * into g from public.offtask_oauth_grants where user_id=owner and client_id=c.client_id;
 if g.active and g.resource=c.resource and public.offtask_oauth_permissions_valid(g.permissions)
    and g.permissions<@c.allowed_permissions then
  begin
   execute $provider$
    select exists(select 1 from auth.users u
     join auth.sessions s on s.user_id=u.id and s.oauth_client_id=$2
     join auth.oauth_clients client on client.id=s.oauth_client_id and client.deleted_at is null
     join auth.oauth_consents consent on consent.user_id=u.id and consent.client_id=client.id and consent.revoked_at is null
     where u.id=$1 and u.deleted_at is null and(u.banned_until is null or u.banned_until<=now())
      and(s.not_after is null or s.not_after>now()))
   $provider$ into provider_active using owner,c.client_id;
  exception when undefined_table or undefined_column or datatype_mismatch then
   raise exception using message='connection_status_unavailable: unsupported provider schema',errcode='55000';
  end;
 end if;
 return jsonb_strip_nulls(jsonb_build_object(
  'status',case when provider_active then 'authorized' when g.active then 'reconnect' else 'disconnected' end,
  'install_url',c.install_url,
  'permissions',case when provider_active then to_jsonb(g.permissions) else null end,
  'revision',case when g.active then g.revision::text else null end
 ));
end $$;

-- The owner argument binds an in-flight mobile request to the account that
-- initiated it, even if another account is signed in before it reaches SQL.
create function public.offtask_chatgpt_revoke(expected_owner uuid,expected_revision text,request_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_oauth_owner(); client uuid;
begin
 if expected_owner is distinct from owner then raise exception using message='forbidden: account changed',errcode='42501';end if;
 select client_id into client from public.offtask_oauth_clients where host_kind='chatgpt' and enabled;
 if client is null then raise exception using message='not_found: ChatGPT client unavailable',errcode='P0002';end if;
 return public.offtask_oauth_revoke_consent(client,expected_revision,request_key);
end $$;
revoke all on function public.offtask_chatgpt_status(),public.offtask_chatgpt_revoke(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.offtask_chatgpt_status(),public.offtask_chatgpt_revoke(uuid,text,text) to authenticated;
