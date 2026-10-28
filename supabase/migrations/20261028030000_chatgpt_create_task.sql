-- Dedicated adapter for a user-requested ordinary task; it is never exposed to
-- an OAuth bearer or callable by a first-party client as a privileged write.
create function public.offtask_integration_create_task(args jsonb,actor uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_integration_owner(actor); g public.offtask_goals;
 t public.tasks; previous public.offtask_integration_requests; result jsonb;
 request text; fingerprint text; scheduled date; requested_goal uuid;
begin
 if jsonb_typeof(args) is distinct from 'object' or exists(select 1 from jsonb_object_keys(args) k where k not in('content','goal_id','date','request_key')) then
  raise exception using message='validation_failed: task input',errcode='22023';end if;
 request:=args->>'request_key';
 if request is null or length(request)not between 8 and 200 or request!~'^[A-Za-z0-9_.:-]+$'
  or jsonb_typeof(args->'content')is distinct from 'string' or nullif(trim(args->>'content'),'')is null
  or length(args->>'content')>16000 then raise exception using message='validation_failed: task content or request key',errcode='22023';end if;
 if args?'date' and args->'date'<>'null'::jsonb then
  if jsonb_typeof(args->'date')is distinct from 'string' or args->>'date'!~'^\d{4}-\d{2}-\d{2}$' then raise exception using message='validation_failed: task date',errcode='22023';end if;
  begin scheduled:=(args->>'date')::date; exception when invalid_datetime_format or datetime_field_overflow then raise exception using message='validation_failed: task date',errcode='22023';end;
 end if;
 if args?'goal_id' then
  if jsonb_typeof(args->'goal_id')is distinct from 'string' then raise exception using message='validation_failed: goal id',errcode='22023';end if;
  begin requested_goal:=(args->>'goal_id')::uuid; exception when invalid_text_representation then raise exception using message='validation_failed: goal id',errcode='22023';end;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));
 fingerprint:=encode(sha256(convert_to(args::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(owner::text||'create_task'||request,0));
 select * into previous from public.offtask_integration_requests r where r.user_id=owner and r.operation='create_task' and r.target='new' and r.request_key=request;
 if found then
  if previous.payload_hash<>fingerprint then raise exception using message='request_key_conflict',errcode='40001';end if;
  return previous.result;
 end if;
 if requested_goal is not null then
  select * into g from public.offtask_goals where user_id=owner and id=requested_goal and status='active' for share;
  if not found then raise exception using message='not_found: goal unavailable',errcode='P0002';end if;
 end if;
 insert into public.tasks(user_id,content,"isComplete",priority,target_group,date,label,goal_id)
 values(owner,trim(args->>'content'),false,0,'upcoming',scheduled,g.title,g.id) returning * into t;
 result:=jsonb_build_object('task',public.offtask_task_json(t));
 insert into public.offtask_integration_requests(user_id,operation,target,request_key,payload_hash,result)
 values(owner,'create_task','new',request,fingerprint,result);
 insert into public.offtask_integration_audit(user_id,actor_id,operation,target,request_key,affected_ids,revisions)
 values(owner,owner,'create_task',t.id::text,request,jsonb_build_array(t.id),jsonb_build_object('task',t.revision::text));
 return result;
end $$;
revoke all on function public.offtask_integration_create_task(jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.offtask_integration_create_task(jsonb,uuid) to service_role;
