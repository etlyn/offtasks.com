-- Reconstruct an already-approved provider request for the signed-in owner.
-- Supabase can auto-approve previously-consented clients and return only a
-- callback. Never return its authorization code or expose provider rows directly.
create function public.offtask_oauth_approved_authorization_details(authorization_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_oauth_owner(); result jsonb;
begin
 if authorization_id is null or authorization_id!~'^[A-Za-z0-9]{32}$'then
  raise exception using message='validation_failed',errcode='22023';
 end if;
 select jsonb_build_object(
  'authorization_id',a.authorization_id,'redirect_uri',a.redirect_uri,
  'client',jsonb_build_object('id',c.client_id,'name',c.client_name),
  'user',jsonb_build_object('id',owner,'email',''),
  'scope',coalesce(a.scope,''),'state',a.state
 ) into result
 from auth.oauth_authorizations a
 join public.offtask_oauth_clients c on c.client_id=a.client_id and c.enabled
 where a.authorization_id=$1 and a.user_id=owner and a.status::text='approved'
  and a.approved_at is not null and a.expires_at>now()
  and (a.resource is null or a.resource=c.resource);
 if result is null then raise exception using message='not_found: approved authorization',errcode='P0002';end if;
 return result;
end $$;
revoke all on function public.offtask_oauth_approved_authorization_details(text) from public,anon,authenticated,service_role;
grant execute on function public.offtask_oauth_approved_authorization_details(text) to authenticated;
