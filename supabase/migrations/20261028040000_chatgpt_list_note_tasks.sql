-- Read ordinary and note-embedded tasks together. Note tasks remain read-only
-- until the mobile note outbox supports conflict-safe cross-device mutations.
create function public.offtask_integration_list_tasks(args jsonb,actor uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_integration_owner(actor); g public.offtask_goals;
 lim integer; off integer; q text; rows jsonb;
begin
 if jsonb_typeof(args)is distinct from 'object' then raise exception using message='validation_failed: task list',errcode='22023';end if;
 begin
  lim:=least(greatest(coalesce((args->>'limit')::integer,20),1),100);
  off:=greatest(coalesce((args->>'offset')::integer,0),0);
 exception when invalid_text_representation or numeric_value_out_of_range then raise exception using message='validation_failed: task pagination',errcode='22023';end;
 q:=coalesce(args->>'query','');
 if args?'project_id' and args->>'project_id'<>owner::text then raise exception using message='not_found',errcode='P0002';end if;
 if args?'goal_id' then
  select * into g from public.offtask_goals where user_id=owner and id=(args->>'goal_id')::uuid;
  if not found then raise exception using message='not_found',errcode='P0002';end if;
 end if;
 with combined as (
  select 'task:'||t.id::text sort_key,t."isComplete" done,coalesce(t.date::text,'9999-12-31') sort_date,
   public.offtask_task_summary(t)||jsonb_build_object('origin','task') value
  from public.tasks t where t.user_id=owner
   and(g.id is null or t.goal_id=g.id or(t.goal_id is null and lower(t.label)=lower(g.title)))
   and(q='' or t.content ilike '%'||q||'%')
   and(not args?'execution_target' or coalesce(t.execution_target,'')=coalesce(args->>'execution_target',''))
   and(not args?'work_stage' or t.work_stage=args->>'work_stage')
   and(not args?'status' or(case when t."isComplete" then 'done' else t.work_stage end)=args->>'status' or(args->>'status'='open' and not t."isComplete"))
  union all
  select 'note:'||n.id||':'||entry.ordinality::text,entry.value->'isComplete'='true'::jsonb,
   case when entry.value->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then entry.value->>'date' else '9999-12-31' end,
   jsonb_strip_nulls(jsonb_build_object(
    'id','note-task:'||encode(sha256(convert_to(jsonb_build_array(n.id,entry.value->>'id')::text,'UTF8')),'hex'),
    'origin','note','note_id',n.id,'note_task_id',entry.value->>'id','note_title',left(n.value->>'title',200),
    'content',left(entry.value->>'content',16000),'title',left(entry.value->>'content',300),
    'content_truncated',length(entry.value->>'content')>16000,'title_truncated',length(entry.value->>'content')>300,'isComplete',entry.value->'isComplete'='true'::jsonb,
    'status',case when entry.value->'isComplete'='true'::jsonb then 'done' else 'open' end,
    'date',entry.value->>'date','target_group',entry.value->>'target_group','label',entry.value->>'label',
    'revision',n.revision::text,'project_id',owner,'context_available',false,'read_only',true))
  from public.planner_items n
  cross join lateral jsonb_array_elements(case when jsonb_typeof(n.value->'tasks')='array' then n.value->'tasks' else '[]'::jsonb end) with ordinality entry(value,ordinality)
  where n.user_id=owner and n.kind='note' and not n.deleted and n.id not like 'offtask-prd:%'
   and jsonb_typeof(entry.value)='object' and jsonb_typeof(entry.value->'id')='string'
   and jsonb_typeof(entry.value->'content')='string' and jsonb_typeof(entry.value->'isComplete')='boolean'
   and args->'include_note_tasks' is distinct from 'false'::jsonb
   and not(args?'execution_target') and not(args?'work_stage')
   and(g.id is null or lower(entry.value->>'label')=lower(g.title))
   and(q='' or entry.value->>'content' ilike '%'||q||'%')
   and(not args?'status' or(args->>'status'='done' and entry.value->'isComplete'='true'::jsonb)
    or(args->>'status'='open' and entry.value->'isComplete'='false'::jsonb))
 ), page as (select * from combined order by done,sort_date,sort_key limit lim+1 offset off)
 select coalesce(jsonb_agg(value order by done,sort_date,sort_key),'[]') into rows from page;
 return jsonb_build_object('tasks',case when jsonb_array_length(rows)>lim then rows-(jsonb_array_length(rows)-1) else rows end,
  'next_offset',case when jsonb_array_length(rows)>lim then off+lim else null end);
end $$;
revoke all on function public.offtask_integration_list_tasks(jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.offtask_integration_list_tasks(jsonb,uuid) to service_role;
