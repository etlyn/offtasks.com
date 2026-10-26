-- Local checker candidate, not a provider deployment or compatibility claim.
-- Provider contract inspected at supabase/auth commit:
-- c3348e8f1cb31454e9783e4eb9eab1e71ad9652f
-- internal/models/{sessions,oauth_consent,oauth_client,user}.go and
-- internal/api/oauthserver/handlers.go (UserRevokeOAuthGrant).
-- https://supabase.com/docs/guides/auth/sessions explicitly documents checking
-- auth.sessions for immediate sign-out detection. Revoking an OAuth grant marks
-- oauth_consents.revoked_at and deletes its user/client sessions in that source.
-- This migration never creates or modifies provider-owned auth tables. Dynamic
-- SQL and exact required-column types reject missing/incompatible auth schemas.
-- Operators must verify the actual staging Auth version, sign-out/revocation,
-- hook and consent semantics before enabling any client. This checks concrete
-- not_after and token expiry, not undisclosed provider timebox/inactivity/AAL
-- settings: those need separately verified server-owned policy, not invented SQL.
create function public.offtask_oauth_check_grant(input jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 subject_id uuid; checked_client_id uuid; session_id uuid;
 requested_permissions text[]; current_permissions text[];
 checked_at timestamptz:=statement_timestamp(); issued_at numeric; expires_at numeric;
 provider_active boolean;
begin
 -- A forged request.jwt.claim.role is insufficient. PostgREST must actually
 -- have selected its service role; no ordinary account may inspect sessions.
 if current_setting('role',true)is distinct from 'service_role' then
  raise exception using message='forbidden',errcode='42501';
 end if;
 if jsonb_typeof(input)is distinct from 'object' or octet_length(input::text)>16384 then
  return jsonb_build_object('active',false);
 end if;
 if exists(select 1 from unnest(array['subject','client_id','session_id','resource','grant_revision']) k
  where jsonb_typeof(input->k)is distinct from 'string')
  or length(input->>'resource')not between 1 and 2048
  or input->>'resource'!~'^https://'
  or input->>'grant_revision'!~'^[0-9]{1,19}$'
  or jsonb_typeof(input->'issued_at')is distinct from 'number'
  or jsonb_typeof(input->'expires_at')is distinct from 'number'
  or input->>'issued_at'!~'^[0-9]{1,12}$'
  or input->>'expires_at'!~'^[0-9]{1,12}$'
  or jsonb_typeof(input->'permissions')is distinct from 'array' then
  return jsonb_build_object('active',false);
 end if;
 if jsonb_array_length(input->'permissions')not between 1 and 2
  or exists(select 1 from jsonb_array_elements(input->'permissions') p
   where jsonb_typeof(p)<>'string' or p#>>'{}'not in('read','write')) then
  return jsonb_build_object('active',false);
 end if;
 requested_permissions:=array(select jsonb_array_elements_text(input->'permissions'));
 if not 'read'=any(requested_permissions)
  or cardinality(requested_permissions)<>(select count(distinct p)from unnest(requested_permissions)p)then
  return jsonb_build_object('active',false);
 end if;
 begin
  subject_id:=(input->>'subject')::uuid;checked_client_id:=(input->>'client_id')::uuid;session_id:=(input->>'session_id')::uuid;
 exception when invalid_text_representation then return jsonb_build_object('active',false);
 end;
 issued_at:=(input->>'issued_at')::numeric;expires_at:=(input->>'expires_at')::numeric;
 if issued_at<=0 or issued_at>extract(epoch from checked_at)+60
  or expires_at<=extract(epoch from checked_at) or expires_at<=issued_at then
  return jsonb_build_object('active',false);
 end if;

 -- Match names AND types, not merely table presence. Provider schemas are not
 -- a public versioned SQL API; absence/drift is unavailable, never active=true.
 if exists(
  select 1 from(values
   ('users','id','uuid'::regtype),('users','deleted_at','timestamptz'::regtype),('users','banned_until','timestamptz'::regtype),
   ('sessions','id','uuid'::regtype),('sessions','user_id','uuid'::regtype),('sessions','oauth_client_id','uuid'::regtype),('sessions','not_after','timestamptz'::regtype),
   ('oauth_consents','user_id','uuid'::regtype),('oauth_consents','client_id','uuid'::regtype),('oauth_consents','revoked_at','timestamptz'::regtype),
   ('oauth_clients','id','uuid'::regtype),('oauth_clients','deleted_at','timestamptz'::regtype)
  )required(table_name,column_name,type_oid)
  where not exists(select 1 from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid
   where a.attrelid=pg_catalog.to_regclass('auth.'||required.table_name)
    and c.relkind in('r','p')and a.attname=required.column_name and a.atttypid=required.type_oid
    and a.attnum>0 and not a.attisdropped)
 )then
  raise exception using message='grant_checker_unavailable: unsupported provider schema',errcode='55000';
 end if;

 select g.permissions into current_permissions
 from public.offtask_oauth_grants g join public.offtask_oauth_clients c on c.client_id=g.client_id
 where g.user_id=subject_id and g.client_id=checked_client_id
  and c.enabled and c.resource=input->>'resource' and g.resource=c.resource
  and g.active and g.grant_epoch::text=input->>'grant_revision'
  and 'read'=any(g.permissions)and g.permissions<@array['read','write']::text[]
  and g.permissions<@c.allowed_permissions and requested_permissions<@g.permissions;
 if not found then return jsonb_build_object('active',false);end if;

 begin
  execute $provider$
   select exists(select 1 from auth.users u
    join auth.sessions s on s.user_id=u.id and s.id=$2 and s.oauth_client_id=$3
    join auth.oauth_clients c on c.id=s.oauth_client_id and c.deleted_at is null
    join auth.oauth_consents consent on consent.user_id=u.id and consent.client_id=c.id and consent.revoked_at is null
    where u.id=$1 and u.deleted_at is null and(u.banned_until is null or u.banned_until<=$4)
     and(s.not_after is null or s.not_after>$4))
  $provider$ into provider_active using subject_id,session_id,checked_client_id,checked_at;
 exception when undefined_table or undefined_column or datatype_mismatch then
  raise exception using message='grant_checker_unavailable: unsupported provider schema',errcode='55000';
 end;
 if not provider_active then return jsonb_build_object('active',false);end if;
 return jsonb_build_object('active',true,'subject',input->>'subject','client_id',input->>'client_id',
  'session_id',input->>'session_id','permissions',to_jsonb(current_permissions));
end $$;
revoke all on function public.offtask_oauth_check_grant(jsonb)from public,anon,authenticated;
grant execute on function public.offtask_oauth_check_grant(jsonb)to service_role;
comment on function public.offtask_oauth_check_grant(jsonb)is
 'Service-only current app-grant/session check. Source contract supabase/auth c3348e8f1cb31454e9783e4eb9eab1e71ad9652f; staging version/revocation/policy verification required before client enablement. No provider table writes or guessed timeout configuration.';
