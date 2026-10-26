-- Local provider-side candidate. This DOES NOT enable OAuth or install a hook.
-- Configure explicit staging clients as an operator, then compose this hook
-- with any existing shared-identity hook; never replace shared auth blindly.
create function public.offtask_oauth_permissions_valid(value text[])returns boolean language sql immutable as $$
 select value is not null and array_ndims(value)=1 and cardinality(value)between 1 and 2 and 'read'=any(value)
 and value<@array['read','write']::text[] and cardinality(value)=(select count(distinct p)from unnest(value)p)
$$;
create table public.offtask_oauth_clients(
 client_id uuid primary key,client_name text not null check(length(trim(client_name))between 1 and 200),
 resource text not null check(resource~'^https://'and resource!~'[@?#[:space:]]'and length(resource)<=2048),
 allowed_permissions text[]not null default array['read']::text[]check(public.offtask_oauth_permissions_valid(allowed_permissions)),
 enabled boolean not null default false,revision bigint not null default 1,updated_at timestamptz not null default now()
);
create table public.offtask_oauth_grants(
 user_id uuid not null references auth.users(id)on delete cascade,
 client_id uuid not null references public.offtask_oauth_clients(client_id)on delete cascade,
 resource text not null,permissions text[]not null default '{}',active boolean not null default false,
 revision bigint not null default 1,grant_epoch bigint not null default 0,
 pending_permissions text[],pending_authorization_id uuid,pending_expires_at timestamptz,
 updated_at timestamptz not null default now(),primary key(user_id,client_id),
 check(not active or public.offtask_oauth_permissions_valid(permissions)),
 check(pending_permissions is null or public.offtask_oauth_permissions_valid(pending_permissions))
);
alter table public.offtask_oauth_clients enable row level security;
alter table public.offtask_oauth_grants enable row level security;
revoke all on public.offtask_oauth_clients,public.offtask_oauth_grants from public,anon,authenticated;
grant select,insert,update,delete on public.offtask_oauth_clients,public.offtask_oauth_grants to service_role;
create trigger offtask_oauth_revision before insert or update on public.offtask_oauth_clients for each row execute function public.offtask_revision_trigger();
create trigger offtask_oauth_revision before insert or update on public.offtask_oauth_grants for each row execute function public.offtask_revision_trigger();

create function public.offtask_oauth_owner()returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid();claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}');
begin
 if owner is null or current_setting('role',true)<>'authenticated'or not public.offtask_first_party_request()or claims->>'is_anonymous'='true' then
  raise exception using message='forbidden: use a signed-in first-party session for consent',errcode='42501';end if;
 if not exists(select 1 from auth.users where id=owner)then raise exception using message='unauthenticated',errcode='28000';end if;
 return owner;
end $$;
create function public.offtask_oauth_grant_json(g public.offtask_oauth_grants)returns jsonb language sql stable as $$
 select jsonb_build_object('client_id',g.client_id,'resource',g.resource,'permissions',to_jsonb(g.permissions),'revision',g.revision::text,
  'active',g.active,'grant_revision',g.grant_epoch::text,'pending_permissions',to_jsonb(g.pending_permissions),'pending_authorization_id',g.pending_authorization_id,'pending_expires_at',g.pending_expires_at)
$$;
create function public.offtask_oauth_consent_details(oauth_client_id uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_oauth_owner();c public.offtask_oauth_clients;g public.offtask_oauth_grants;
begin
 select *into c from public.offtask_oauth_clients where client_id=oauth_client_id and enabled;
 if not found then raise exception using message='not_found: client is not enabled',errcode='P0002';end if;
 select *into g from public.offtask_oauth_grants where user_id=owner and client_id=c.client_id;
 return jsonb_build_object('client_id',c.client_id,'client_name',c.client_name,'resource',c.resource,'allowed_permissions',to_jsonb(c.allowed_permissions),
  'grant',case when g.user_id is null then null else public.offtask_oauth_grant_json(g)end);
end $$;

create function public.offtask_oauth_set_consent(oauth_client_id uuid,permissions text[],expected_revision text,authorization_id uuid,request_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
<<consent>>
declare owner uuid:=public.offtask_oauth_owner();c public.offtask_oauth_clients;g public.offtask_oauth_grants;
 fingerprint text;prior public.offtask_integration_requests;result jsonb;
begin
 if request_key is null or length(request_key)not between 8 and 200 or request_key!~'^[A-Za-z0-9_.:-]+$'or authorization_id is null or not public.offtask_oauth_permissions_valid(permissions)then raise exception using message='validation_failed',errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('client_id',oauth_client_id,'permissions',permissions,'expected_revision',expected_revision,'authorization_id',authorization_id)::text,'UTF8')),'hex');
 select *into prior from public.offtask_integration_requests r where r.user_id=owner and r.operation='oauth.set_consent'and r.target=oauth_client_id::text and r.request_key=$5;
 if found then if prior.payload_hash<>fingerprint then raise exception using message='request_key_conflict',errcode='40001';end if;return prior.result;end if;
 select *into c from public.offtask_oauth_clients where client_id=oauth_client_id and enabled for share;
 if not found then raise exception using message='not_found: client is not enabled',errcode='P0002';end if;
 if not permissions<@c.allowed_permissions then raise exception using message='forbidden: permissions exceed client policy',errcode='42501';end if;
 select *into g from public.offtask_oauth_grants where user_id=owner and client_id=oauth_client_id for update;
 if found then perform public.offtask_expect_revision(g.revision,to_jsonb(expected_revision));
 else if expected_revision is not null then raise exception using message='revision_conflict',errcode='40001';end if;
  insert into public.offtask_oauth_grants(user_id,client_id,resource)values(owner,oauth_client_id,c.resource)returning *into g;
 end if;
 -- This is pending intent, not active access. Only a trusted authorization-code
 -- token issuance may activate it; an old session refresh cannot elevate access.
 update public.offtask_oauth_grants set pending_permissions=$2,pending_authorization_id=authorization_id,pending_expires_at=now()+interval'10 minutes',
  active=case when resource=c.resource then active else false end,permissions=case when resource=c.resource then offtask_oauth_grants.permissions else '{}'::text[]end,
  resource=c.resource where user_id=owner and client_id=oauth_client_id returning *into g;
 result:=jsonb_build_object('grant',public.offtask_oauth_grant_json(g));
 insert into public.offtask_integration_requests(user_id,operation,target,request_key,payload_hash,result)values(owner,'oauth.set_consent',oauth_client_id::text,request_key,fingerprint,result);
 insert into public.offtask_integration_audit(user_id,actor_id,operation,target,request_key,affected_ids,revisions)values(owner,owner,'oauth.set_consent',oauth_client_id::text,request_key,jsonb_build_array(oauth_client_id),jsonb_build_object('grant',g.revision::text));
 return result;
end $$;

create function public.offtask_oauth_revoke_consent(oauth_client_id uuid,expected_revision text,request_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
<<consent>>
declare owner uuid:=public.offtask_oauth_owner();g public.offtask_oauth_grants;fingerprint text;prior public.offtask_integration_requests;result jsonb;
begin
 if request_key is null or length(request_key)not between 8 and 200 or request_key!~'^[A-Za-z0-9_.:-]+$'then raise exception using message='validation_failed',errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('client_id',oauth_client_id,'expected_revision',expected_revision)::text,'UTF8')),'hex');
 select *into prior from public.offtask_integration_requests r where r.user_id=owner and r.operation='oauth.revoke_consent'and r.target=oauth_client_id::text and r.request_key=$3;
 if found then if prior.payload_hash<>fingerprint then raise exception using message='request_key_conflict',errcode='40001';end if;return prior.result;end if;
 select *into g from public.offtask_oauth_grants where user_id=owner and client_id=oauth_client_id for update;
 if not found then raise exception using message='not_found',errcode='P0002';end if;
 perform public.offtask_expect_revision(g.revision,to_jsonb(expected_revision));
 update public.offtask_oauth_grants set active=false,permissions='{}',pending_permissions=null,pending_authorization_id=null,pending_expires_at=null,grant_epoch=grant_epoch+1 where user_id=owner and client_id=oauth_client_id returning *into g;
 result:=jsonb_build_object('grant',public.offtask_oauth_grant_json(g));
 insert into public.offtask_integration_requests(user_id,operation,target,request_key,payload_hash,result)values(owner,'oauth.revoke_consent',oauth_client_id::text,request_key,fingerprint,result);
 insert into public.offtask_integration_audit(user_id,actor_id,operation,target,request_key,affected_ids,revisions)values(owner,owner,'oauth.revoke_consent',oauth_client_id::text,request_key,jsonb_build_array(oauth_client_id),jsonb_build_object('grant',g.revision::text));
 return result;
end $$;

create function public.offtask_oauth_cancel_pending(oauth_client_id uuid,authorization_id uuid,expected_revision text,request_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_oauth_owner();g public.offtask_oauth_grants;fingerprint text;prior public.offtask_integration_requests;result jsonb;
begin
 if request_key is null or length(request_key)not between 8 and 200 or request_key!~'^[A-Za-z0-9_.:-]+$'or authorization_id is null then raise exception using message='validation_failed',errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('client_id',oauth_client_id,'authorization_id',authorization_id,'expected_revision',expected_revision)::text,'UTF8')),'hex');
 select *into prior from public.offtask_integration_requests r where r.user_id=owner and r.operation='oauth.cancel_pending'and r.target=oauth_client_id::text and r.request_key=$4;
 if found then if prior.payload_hash<>fingerprint then raise exception using message='request_key_conflict',errcode='40001';end if;return prior.result;end if;
 select *into g from public.offtask_oauth_grants where user_id=owner and client_id=oauth_client_id for update;
 if not found then raise exception using message='not_found',errcode='P0002';end if;
 perform public.offtask_expect_revision(g.revision,to_jsonb(expected_revision));
 if g.pending_authorization_id is distinct from authorization_id or g.pending_permissions is null then raise exception using message='revision_conflict: pending authorization changed',errcode='40001';end if;
 update public.offtask_oauth_grants set pending_permissions=null,pending_authorization_id=null,pending_expires_at=null where user_id=owner and client_id=oauth_client_id returning *into g;
 result:=jsonb_build_object('grant',public.offtask_oauth_grant_json(g));
 insert into public.offtask_integration_requests(user_id,operation,target,request_key,payload_hash,result)values(owner,'oauth.cancel_pending',oauth_client_id::text,request_key,fingerprint,result);
 insert into public.offtask_integration_audit(user_id,actor_id,operation,target,request_key,affected_ids,revisions)values(owner,owner,'oauth.cancel_pending',oauth_client_id::text,request_key,jsonb_build_array(oauth_client_id),jsonb_build_object('grant',g.revision::text));
 return result;
end $$;

create function public.offtask_mcp_access_token_hook(event jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare claims jsonb:=event->'claims';c public.offtask_oauth_clients;g public.offtask_oauth_grants;owner uuid;client uuid;method text:=event->>'authentication_method';
begin
 if jsonb_typeof(claims)is distinct from 'object'then raise exception using message='validation_failed: token claims',errcode='22023';end if;
 if nullif(claims->>'client_id','')is null then return jsonb_build_object('claims',claims);end if;
 begin client:=(claims->>'client_id')::uuid;exception when invalid_text_representation then return jsonb_build_object('claims',claims);end;
 select *into c from public.offtask_oauth_clients where client_id=client and enabled;
 if not found then return jsonb_build_object('claims',claims);end if; -- preserve all unrelated/shared app claims
 begin owner:=(event->>'user_id')::uuid;exception when invalid_text_representation then raise exception using message='forbidden: token principal',errcode='42501';end;
 if owner is null or claims->>'sub'is distinct from owner::text or claims->>'is_anonymous'='true'then raise exception using message='forbidden: token principal',errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));
 select *into g from public.offtask_oauth_grants where user_id=owner and client_id=client for update;
 if not found then raise exception using message='forbidden: explicit consent required',errcode='42501';end if;
 if method='oauth_provider/authorization_code'and g.pending_permissions is not null and g.pending_expires_at>now()then
  if not g.pending_permissions<@c.allowed_permissions then raise exception using message='forbidden: client policy changed',errcode='42501';end if;
  update public.offtask_oauth_grants set permissions=pending_permissions,active=true,resource=c.resource,grant_epoch=grant_epoch+1,pending_permissions=null,pending_authorization_id=null,pending_expires_at=null where user_id=owner and client_id=client returning *into g;
 end if;
 if not g.active or g.resource<>c.resource or not public.offtask_oauth_permissions_valid(g.permissions)or not g.permissions<@c.allowed_permissions then raise exception using message='forbidden: active consent required',errcode='42501';end if;
 claims:=jsonb_set(claims,'{aud}',to_jsonb(c.resource));
 claims:=jsonb_set(claims,'{offtasks_mcp}',jsonb_build_object('resource',c.resource,'permissions',to_jsonb(g.permissions),'grant_revision',g.grant_epoch::text));
 return jsonb_build_object('claims',claims);
end $$;

revoke all on function public.offtask_oauth_permissions_valid(text[]),public.offtask_oauth_owner(),public.offtask_oauth_grant_json(public.offtask_oauth_grants),public.offtask_oauth_consent_details(uuid),public.offtask_oauth_set_consent(uuid,text[],text,uuid,text),public.offtask_oauth_revoke_consent(uuid,text,text),public.offtask_oauth_cancel_pending(uuid,uuid,text,text),public.offtask_mcp_access_token_hook(jsonb)from public,anon,authenticated,service_role;
grant execute on function public.offtask_oauth_consent_details(uuid),public.offtask_oauth_set_consent(uuid,text[],text,uuid,text),public.offtask_oauth_revoke_consent(uuid,text,text),public.offtask_oauth_cancel_pending(uuid,uuid,text,text)to authenticated;
grant execute on function public.offtask_oauth_permissions_valid(text[])to service_role;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.offtask_mcp_access_token_hook(jsonb)to supabase_auth_admin;
