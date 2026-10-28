-- Bind pending Offtasks consent to the corresponding provider approval.
-- Supabase issues the hook inside its authorization-code exchange transaction,
-- before deleting the approved authorization. Missing/changed provider schema
-- fails closed. Ordinary sessions and unrelated clients remain unchanged.
create or replace function public.offtask_mcp_access_token_hook(event jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
  -- The trusted provider must have approved this exact owner/client request.
  -- A token exchange for some other authorization cannot activate unapproved intent.
  if not exists(select 1 from auth.oauth_authorizations a
   where a.authorization_id=g.pending_authorization_id and a.user_id=owner and a.client_id=client
    and a.status::text='approved' and a.approved_at is not null and a.expires_at>now())then
   if not g.active then raise exception using message='forbidden: provider approval required',errcode='42501';end if;
  else
  if not g.pending_permissions<@c.allowed_permissions then raise exception using message='forbidden: client policy changed',errcode='42501';end if;
  update public.offtask_oauth_grants set permissions=pending_permissions,active=true,resource=c.resource,grant_epoch=grant_epoch+1,pending_permissions=null,pending_authorization_id=null,pending_expires_at=null where user_id=owner and client_id=client returning *into g;
  end if;
 end if;
 if not g.active or g.resource<>c.resource or not public.offtask_oauth_permissions_valid(g.permissions)or not g.permissions<@c.allowed_permissions then raise exception using message='forbidden: active consent required',errcode='42501';end if;
 claims:=jsonb_set(claims,'{aud}',to_jsonb(c.resource));
 claims:=jsonb_set(claims,'{offtasks_mcp}',jsonb_build_object('resource',c.resource,'permissions',to_jsonb(g.permissions),'grant_revision',g.grant_epoch::text));
 return jsonb_build_object('claims',claims);
end $$;
