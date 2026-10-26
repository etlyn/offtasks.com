-- Offtasks owns this additive domain layer. Auth identities remain provider-owned.
-- MCP credentials never reach PostgREST: a separately verified integration delegates
-- a subject through service_role; first-party clients use their ordinary auth.uid().
create function public.offtask_first_party_request()returns boolean language sql stable set search_path=public,pg_temp as $$
 select not coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb ?| array['client_id','oauth_client_id'],false)
  and nullif(current_setting('request.jwt.claim.client_id',true),'')is null
  and nullif(current_setting('request.jwt.claim.oauth_client_id',true),'')is null
$$;
revoke all on function public.offtask_first_party_request()from public,anon;
grant execute on function public.offtask_first_party_request()to authenticated,service_role;
alter table public.tasks add column if not exists revision bigint not null default 1;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.tasks add column if not exists execution_target text check(execution_target is null or execution_target='codex');
alter table public.tasks add column if not exists description text not null default '';
alter table public.tasks add column if not exists work_stage text not null default 'not_started'
  check(work_stage in ('not_started','ready','in_progress','blocked','awaiting_review'));
alter table public.tasks add column if not exists acceptance_criteria jsonb not null default '[]';
alter table public.tasks add column if not exists dependency_ids uuid[] not null default '{}';
alter table public.planner_items add column if not exists revision bigint not null default 1;
alter table public.planner_items add column if not exists updated_at timestamptz not null default now();

create table public.offtask_goals (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 legacy_goal_id text not null,title text not null check(length(trim(title)) between 1 and 200),
 outcome text not null default '',priority integer not null default 0 check(priority between 0 and 3),
 status text not null default 'active' check(status in ('active','archived')),
 prd_id text,prd_acceptance_criteria jsonb not null default '[]',plan_id uuid,
 revision bigint not null default 1,updated_at timestamptz not null default now(),unique(user_id,legacy_goal_id)
);
create table public.offtask_plans (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 goal_id uuid not null references public.offtask_goals(id) on delete cascade,
 source_prd_id text not null,source_prd_revision bigint not null,
 summary text not null default '',items jsonb not null default '[]',revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.offtask_goals add constraint offtask_goals_plan foreign key(plan_id) references public.offtask_plans(id) on delete set null;
alter table public.tasks add column if not exists goal_id uuid references public.offtask_goals(id) on delete set null;
alter table public.tasks add column if not exists source_plan_id uuid references public.offtask_plans(id) on delete set null;
alter table public.tasks add column if not exists source_plan_item_id text;
alter table public.tasks add column if not exists source_plan_revision bigint;
create unique index offtask_plan_task_once on public.tasks(user_id,source_plan_id,source_plan_item_id) where source_plan_id is not null;
create table public.offtask_task_results (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,
 author_id uuid not null,summary text not null,blockers jsonb not null default '[]',
 validation jsonb not null default '[]',links jsonb not null default '[]',
 source_goal_revision bigint,source_prd_revision bigint,created_at timestamptz not null default now()
);
create table public.offtask_integration_requests (
 user_id uuid not null references auth.users(id) on delete cascade,operation text not null,target text not null,
 request_key text not null,payload_hash text not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(user_id,operation,target,request_key)
);
create table public.offtask_integration_audit (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null,operation text not null,target text not null,request_key text not null,
 affected_ids jsonb not null default '[]',revisions jsonb not null default '{}',created_at timestamptz not null default now()
);
do $$declare tab text;begin
 foreach tab in array array['offtask_goals','offtask_plans','offtask_task_results','offtask_integration_requests','offtask_integration_audit'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('grant select,delete on public.%I to service_role',tab);
  execute format('create policy owner_read on public.%I for select to authenticated using(user_id=auth.uid())',tab);
 end loop;
end $$;

-- OAuth integration tokens are resource credentials, not unrestricted app API
-- sessions. The trusted adapter delegates only after per-tool authorization.
do $$declare tab text;begin
 foreach tab in array array['tasks','planner_items','user_preferences','offtask_goals','offtask_plans','offtask_task_results','offtask_integration_requests','offtask_integration_audit']loop
  if to_regclass('public.'||tab)is not null then
   execute format('create policy offtask_first_party_only on public.%I as restrictive for all to authenticated using(public.offtask_first_party_request()) with check(public.offtask_first_party_request())',tab);
  end if;
 end loop;
end $$;

create function public.offtask_revision_trigger() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.revision:=case when tg_op='INSERT' then 1 else old.revision+1 end;new.updated_at:=now();return new;end $$;
create trigger offtask_revision before insert or update on public.tasks for each row execute function public.offtask_revision_trigger();
create trigger offtask_revision before insert or update on public.planner_items for each row execute function public.offtask_revision_trigger();
create trigger offtask_revision before insert or update on public.offtask_goals for each row execute function public.offtask_revision_trigger();
create trigger offtask_revision before insert or update on public.offtask_plans for each row execute function public.offtask_revision_trigger();

create function public.offtask_legacy_goal_trigger() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then
  if old.kind='goal' then update public.offtask_goals set status='archived' where user_id=old.user_id and legacy_goal_id=old.id;
  else update public.offtask_goals set prd_id=null where user_id=old.user_id and prd_id=old.id;end if;return old;
 end if;
 if new.kind='goal' then
  insert into public.offtask_goals(user_id,legacy_goal_id,title,status) values(new.user_id,new.id,new.value#>>'{}',case when new.deleted then 'archived' else 'active' end)
   on conflict(user_id,legacy_goal_id) do update set title=excluded.title,status=excluded.status;
  update public.tasks set label=new.value#>>'{}' where user_id=new.user_id and goal_id=(select id from public.offtask_goals where user_id=new.user_id and legacy_goal_id=new.id) and label is distinct from (new.value#>>'{}');
 elsif tg_op='UPDATE' then
  -- A direct first-party edit must invalidate the PRD/plan source revision too.
  update public.offtask_goals set updated_at=now() where user_id=new.user_id and prd_id=new.id;
 end if;return new;
end $$;
create trigger offtask_goal_sync after insert or update or delete on public.planner_items for each row execute function public.offtask_legacy_goal_trigger();
insert into public.offtask_goals(user_id,legacy_goal_id,title,status)
 select user_id,id,value#>>'{}',case when deleted then 'archived' else 'active' end from public.planner_items where kind='goal';
-- Existing native goals also include labels on tasks, not only empty saved lists.
insert into public.offtask_goals(user_id,legacy_goal_id,title)
 select user_id,lower(trim(label)),min(trim(label)) from public.tasks where nullif(trim(label),'') is not null group by user_id,lower(trim(label)) on conflict(user_id,legacy_goal_id)do nothing;
update public.tasks t set goal_id=g.id from public.offtask_goals g where t.user_id=g.user_id and lower(t.label)=lower(g.title) and t.goal_id is null;

create function public.offtask_integration_owner(actor uuid) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid();jwt_role text:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','');
begin
 if not public.offtask_first_party_request() then raise exception using message='forbidden: OAuth credentials must use the MCP adapter',errcode='42501';end if;
 if actor is not null then
  if jwt_role<>'service_role' or current_setting('role',true)<>'service_role' then raise exception using message='forbidden',errcode='42501';end if;owner:=actor;
 end if;
 if owner is null then raise exception using message='unauthenticated',errcode='28000';end if;
 if not exists(select 1 from auth.users where id=owner) then raise exception using message='unauthenticated',errcode='28000';end if;
 return owner;
end $$;
create function public.offtask_expect_revision(actual bigint,expected jsonb) returns void language plpgsql as $$
begin
 if expected is null or expected='null'::jsonb or jsonb_typeof(expected) not in ('string','number') or (expected#>>'{}')!~'^[0-9]+$' then
  raise exception using message='validation_failed: expected revision required',errcode='22023';end if;
 if actual is distinct from (expected#>>'{}')::bigint then raise exception using message='revision_conflict',errcode='40001';end if;
end $$;
create function public.offtask_text_array(value jsonb) returns boolean language sql immutable as $$
 select case when jsonb_typeof(value)='array' then jsonb_array_length(value)<=100
 and not exists(select 1 from jsonb_array_elements(value) x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>4000) else false end
$$;
create function public.offtask_goal_json(g public.offtask_goals) returns jsonb language sql stable as $$
 select to_jsonb(g)-'user_id'-'prd_acceptance_criteria'||jsonb_build_object('project_id',g.user_id,'revision',g.revision::text,'url','https://offtasks.com/app?goal='||g.id::text)
$$;
create function public.offtask_prd_json(owner uuid,goal public.offtask_goals) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.id,'revision',p.revision::text,'markdown',p.value->>'body','title',p.value->>'title','acceptance_criteria',goal.prd_acceptance_criteria,'updated_at',p.updated_at)
 from public.planner_items p where p.user_id=owner and p.kind='note' and p.id=goal.prd_id and not p.deleted
$$;
create function public.offtask_plan_json(p public.offtask_plans) returns jsonb language sql stable as $$
 select to_jsonb(p)-'user_id'||jsonb_build_object('revision',p.revision::text,'source_prd_revision',p.source_prd_revision::text,
 'requirements_changed',not exists(select 1 from public.offtask_goals g join public.planner_items d on d.user_id=g.user_id and d.kind='note' and d.id=g.prd_id and not d.deleted where g.user_id=p.user_id and g.id=p.goal_id and d.id=p.source_prd_id and d.revision=p.source_prd_revision))
$$;
create function public.offtask_task_json(t public.tasks) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select to_jsonb(t)-'user_id'-'dependency_ids'||jsonb_build_object('title',t.content,'revision',t.revision::text,'project_id',t.user_id,
 'goal_id',coalesce(t.goal_id,(select g.id from public.offtask_goals g where g.user_id=t.user_id and lower(g.title)=lower(t.label) limit 1)),
 'dependencies',to_jsonb(t.dependency_ids),'source_plan_revision',t.source_plan_revision::text,'status',case when t."isComplete" then 'done' else t.work_stage end,
 'eligible',not t."isComplete" and coalesce(t.execution_target='codex',false) and t.work_stage in ('not_started','ready')
  and not exists(select 1 from unnest(t.dependency_ids) dep left join public.tasks d on d.id=dep and d.user_id=t.user_id where d.id is null or not d."isComplete")
  and not exists(select 1 from public.offtask_goals g where g.user_id=t.user_id and (g.id=t.goal_id or(t.goal_id is null and lower(g.title)=lower(t.label))) and g.status='archived'),
 'url','https://offtasks.com/app?task='||t.id::text)
$$;
create function public.offtask_task_summary(t public.tasks) returns jsonb language sql stable as $$
 select public.offtask_task_json(t)-'description'-'acceptance_criteria'||jsonb_build_object('title',left(t.content,300),'content',left(t.content,300),'title_truncated',length(t.content)>300,'context_available',true)
$$;

create function public.offtask_task_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare dependency uuid;
begin
 -- Serialize graph checks across legacy direct writes and RPC mutations too.
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||new.user_id::text,0));
 if not public.offtask_text_array(new.acceptance_criteria) or cardinality(new.dependency_ids)>100 or cardinality(new.dependency_ids)<>(select count(distinct d)from unnest(new.dependency_ids)d) or new.priority not between 0 and 3 then raise exception using message='validation_failed',errcode='22023';end if;
 if nullif(trim(new.label),'') is not null and not exists(select 1 from public.offtask_goals where user_id=new.user_id and lower(title)=lower(new.label)) then
  insert into public.offtask_goals(user_id,legacy_goal_id,title)values(new.user_id,lower(trim(new.label)),trim(new.label))on conflict(user_id,legacy_goal_id)do nothing;
 end if;
 if tg_op='INSERT' and new.goal_id is null then select id into new.goal_id from public.offtask_goals where user_id=new.user_id and lower(title)=lower(new.label) limit 1;
 elsif tg_op='UPDATE' and new.label is distinct from old.label and new.goal_id is not distinct from old.goal_id then
  select id into new.goal_id from public.offtask_goals where user_id=new.user_id and lower(title)=lower(new.label) limit 1;
 end if;
 if new.goal_id is not null and not exists(select 1 from public.offtask_goals where id=new.goal_id and user_id=new.user_id) then raise exception using message='not_found',errcode='P0002';end if;
 foreach dependency in array new.dependency_ids loop
  if dependency=new.id or not exists(select 1 from public.tasks where id=dependency and user_id=new.user_id) then raise exception using message='validation_failed: dependency unavailable',errcode='22023';end if;
 end loop;
 if exists(with recursive chain(id) as (
  select d from unnest(new.dependency_ids)d union
  select dep from chain c join public.tasks t on t.id=c.id and t.user_id=new.user_id cross join unnest(t.dependency_ids)dep
 )select 1 from chain where id=new.id) then raise exception using message='validation_failed: dependency cycle',errcode='22023';end if;
 if new.source_plan_id is not null and not exists(select 1 from public.offtask_plans p where p.id=new.source_plan_id and p.user_id=new.user_id and exists(select 1 from jsonb_array_elements(p.items)i where i->>'id'=new.source_plan_item_id)) then
  raise exception using message='not_found',errcode='P0002';end if;
 if (new.work_stage in ('in_progress','awaiting_review') or new."isComplete") and
  exists(select 1 from unnest(new.dependency_ids) dep join public.tasks d on d.id=dep where not d."isComplete") then
  raise exception using message='validation_failed: unfinished dependencies',errcode='22023';end if;
 if new.work_stage in ('in_progress','awaiting_review') and exists(select 1 from public.offtask_goals where id=new.goal_id and user_id=new.user_id and status='archived') then raise exception using message='validation_failed: goal archived',errcode='22023';end if;
 return new;
end $$;
create trigger offtask_task_guard before insert or update on public.tasks for each row execute function public.offtask_task_guard();

-- Direct first-party SQL writes acquire the same lock BEFORE row locks, avoiding
-- a goal -> task / task -> goal inversion with the integration RPCs. Trusted
-- delegated requests lock their explicit owner in the RPC before any SQL writes.
create function public.offtask_owner_statement_lock() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid();
begin
 if not public.offtask_first_party_request() then raise exception using message='forbidden: OAuth credentials must use the MCP adapter',errcode='42501';end if;
 if owner is not null then perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));end if;return null;
end $$;
create trigger offtask_owner_lock before insert or update or delete on public.tasks for each statement execute function public.offtask_owner_statement_lock();
create trigger offtask_owner_lock before insert or update or delete on public.planner_items for each statement execute function public.offtask_owner_statement_lock();
do $$declare tab text;begin
 foreach tab in array array['user_preferences','offtask_goals','offtask_plans','offtask_task_results','offtask_integration_requests','offtask_integration_audit']loop
  if to_regclass('public.'||tab)is not null then
   execute format('create trigger offtask_owner_lock before insert or update or delete on public.%I for each statement execute function public.offtask_owner_statement_lock()',tab);
  end if;
 end loop;
end $$;

-- Internal transport pagination occurs before PostgREST serialization, so even
-- large valid history/criteria records fit the adapter's response-byte budget.
-- Offsets count PostgreSQL Unicode characters; clients must use next_context_offset
-- rather than JavaScript string.length. Public MCP cursors wrap this selector.
create function public.offtask_finish_context(context jsonb,args jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare serialized text;fingerprint text;expected text;offset_value integer;total integer;fragment text;next_offset integer;
begin
 if not args?'_context_offset' then
  if args?'_context_snapshot' then raise exception using message='validation_failed: context snapshot requires offset',errcode='22023';end if;
  return context;
 end if;
 if jsonb_typeof(args->'_context_offset')is distinct from 'number' or(args->>'_context_offset')!~'^(0|[1-9][0-9]*)$'or length(args->>'_context_offset')>9 then
  raise exception using message='validation_failed: context offset',errcode='22023';end if;
 offset_value:=(args->>'_context_offset')::integer;
 serialized:=context::text;total:=length(serialized);fingerprint:=encode(sha256(convert_to(serialized,'UTF8')),'hex');
 if args?'_context_snapshot' then
  expected:=args->>'_context_snapshot';
  if jsonb_typeof(args->'_context_snapshot')is distinct from 'string'or expected!~'^[0-9a-f]{64}$'then raise exception using message='validation_failed: context snapshot',errcode='22023';end if;
  if expected<>fingerprint then raise exception using message='revision_conflict: context changed; restart at offset zero',errcode='40001';end if;
 end if;
 if offset_value>total then raise exception using message='validation_failed: context offset outside record',errcode='22023';end if;
 if offset_value=0 and total<=24000 then return context;end if;
 fragment:=substring(serialized from offset_value+1 for 12000);next_offset:=offset_value+length(fragment);
 return jsonb_build_object(
  'goal',case when jsonb_typeof(context->'goal')='object'then jsonb_build_object('id',context#>'{goal,id}','title',context#>'{goal,title}','revision',context#>'{goal,revision}','status',context#>'{goal,status}')else null end,
  'task',case when jsonb_typeof(context->'task')='object'then jsonb_build_object('id',context#>'{task,id}','title',left(context#>>'{task,title}',300),'revision',context#>'{task,revision}','status',context#>'{task,status}')else null end,
  'prd',case when jsonb_typeof(context->'prd')='object'then jsonb_build_object('id',context#>'{prd,id}','revision',context#>'{prd,revision}')else null end,
  'plan',case when jsonb_typeof(context->'plan')='object'then jsonb_build_object('id',context#>'{plan,id}','revision',context#>'{plan,revision}','source_prd_revision',context#>'{plan,source_prd_revision}','requirements_changed',context#>'{plan,requirements_changed}')else null end,
  'context_fragment',jsonb_build_object('encoding','json','offset',offset_value,'total_characters',total,'text',fragment),
  'context_complete',next_offset>=total,'next_context_offset',case when next_offset<total then next_offset else null end,'context_snapshot',fingerprint
 );
end $$;

create function public.offtask_integration_read(operation text,args jsonb default '{}',actor uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=public.offtask_integration_owner(actor);g public.offtask_goals;p public.offtask_plans;t public.tasks;
 result jsonb;rows jsonb;lim integer;off integer;gid uuid;q text;total_tasks bigint;
begin
 if jsonb_typeof(args) is distinct from 'object' then raise exception using message='validation_failed',errcode='22023';end if;
 if args?'project_id' and args->>'project_id'<>owner::text then raise exception using message='not_found',errcode='P0002';end if;
 lim:=coalesce((args->>'limit')::integer,20);off:=coalesce((args->>'offset')::integer,0);q:=coalesce(args->>'query','');
 if lim<1 or lim>100 or off<0 or off>100000 then raise exception using message='validation_failed',errcode='22023';end if;
 if operation='list_projects' then return jsonb_build_object('projects',case when off=0 and ('My Offtasks' ilike '%'||q||'%') then jsonb_build_array(jsonb_build_object('id',owner,'name','My Offtasks','title','My Offtasks','revision','1','url','https://offtasks.com/app')) else '[]'::jsonb end,'next_offset',null);end if;
 if operation='list_goals' then
  select coalesce(jsonb_agg(v),'[]') into rows from(select public.offtask_goal_json(x)||jsonb_build_object('outcome',left(x.outcome,400),'outcome_truncated',length(x.outcome)>400,'context_available',true)v from public.offtask_goals x where x.user_id=owner and (q='' or x.title ilike '%'||q||'%') and (not args?'status' or x.status=args->>'status') order by x.id limit lim+1 offset off)s;
 elsif operation in ('get_goal_context','render_plan_widget') then
  if not args?'goal_id' and operation='render_plan_widget' then return public.offtask_integration_read('list_goals',args,actor);end if;
  select * into g from public.offtask_goals where user_id=owner and id=(args->>'goal_id')::uuid;
  if not found then raise exception using message='not_found',errcode='P0002';end if;
  select * into p from public.offtask_plans where user_id=owner and id=g.plan_id;
  select count(*)into total_tasks from public.tasks x where x.user_id=owner and(x.goal_id=g.id or(x.goal_id is null and lower(x.label)=lower(g.title)))
   and(not args?'execution_target' or coalesce(x.execution_target,'')=coalesce(args->>'execution_target',''))
   and(not args?'work_stage' or x.work_stage=args->>'work_stage')
   and(not args?'status' or(case when x."isComplete" then 'done' else x.work_stage end)=args->>'status' or(args->>'status'='open' and not x."isComplete"))
   and(q='' or x.content ilike '%'||q||'%');
  select coalesce(jsonb_agg(public.offtask_task_summary(x) order by x.id),'[]') into rows from(select * from public.tasks x where x.user_id=owner and (x.goal_id=g.id or(x.goal_id is null and lower(x.label)=lower(g.title)))
   and(not args?'execution_target' or coalesce(x.execution_target,'')=coalesce(args->>'execution_target',''))
   and(not args?'work_stage' or x.work_stage=args->>'work_stage')
   and(not args?'status' or(case when x."isComplete" then 'done' else x.work_stage end)=args->>'status' or(args->>'status'='open' and not x."isComplete"))
   and(q='' or x.content ilike '%'||q||'%')order by x.id limit(case when operation='render_plan_widget'then 20 else 100 end))x;
  if operation='render_plan_widget'then
   return jsonb_build_object(
    'goal',jsonb_build_object('id',g.id,'project_id',owner,'title',g.title,'outcome',left(g.outcome,400),'outcome_truncated',length(g.outcome)>400,'status',g.status,'revision',g.revision::text,'priority',g.priority,'url','https://offtasks.com/app?goal='||g.id::text),
    'prd',(select jsonb_build_object('id',d.id,'revision',d.revision::text)from public.planner_items d where d.user_id=owner and d.kind='note'and d.id=g.prd_id and not d.deleted),
    'plan',case when p.id is null then null else jsonb_build_object('id',p.id,'revision',p.revision::text,'source_prd_id',p.source_prd_id,'source_prd_revision',p.source_prd_revision::text,
     'requirements_changed',not exists(select 1 from public.planner_items d where d.user_id=owner and d.kind='note'and d.id=g.prd_id and d.id=p.source_prd_id and d.revision=p.source_prd_revision and not d.deleted),
     'summary',left(p.summary,1600),'summary_truncated',length(p.summary)>1600,
     'items',(select coalesce(jsonb_agg(jsonb_build_object('id',i.value->>'id','title',left(i.value->>'title',300),'title_truncated',length(i.value->>'title')>300)order by i.ordinality),'[]')from jsonb_array_elements(p.items)with ordinality i(value,ordinality)))end,
    'tasks',rows,'task_summary',jsonb_build_object('total',total_tasks,'returned',jsonb_array_length(rows)),'tasks_next_offset',case when total_tasks>20 then 20 else null end
   );
  end if;
  return public.offtask_finish_context(jsonb_build_object('goal',public.offtask_goal_json(g),'prd',public.offtask_prd_json(owner,g),'plan',case when p.id is not null then public.offtask_plan_json(p) else null end,'tasks',rows,'task_summary',jsonb_build_object('total',total_tasks,'returned',jsonb_array_length(rows)),'tasks_next_offset',case when total_tasks>100 then 100 else null end),args);
 elsif operation='list_tasks' then
  if args?'goal_id' then select * into g from public.offtask_goals where user_id=owner and id=(args->>'goal_id')::uuid;if not found then raise exception using message='not_found',errcode='P0002';end if;end if;
  select coalesce(jsonb_agg(v),'[]') into rows from(select public.offtask_task_summary(x)v from public.tasks x where x.user_id=owner
   and (g.id is null or x.goal_id=g.id or(x.goal_id is null and lower(x.label)=lower(g.title))) and(q='' or x.content ilike '%'||q||'%')
   and(not args?'execution_target' or coalesce(x.execution_target,'')=coalesce(args->>'execution_target',''))
   and(not args?'work_stage' or x.work_stage=args->>'work_stage')
   and(not args?'status' or (case when x."isComplete" then 'done' else x.work_stage end)=args->>'status' or(args->>'status'='open' and not x."isComplete"))
   order by x.id limit lim+1 offset off)s;
 elsif operation='get_task_context' then
  select * into t from public.tasks where user_id=owner and id=(args->>'task_id')::uuid;if not found then raise exception using message='not_found',errcode='P0002';end if;
  select * into g from public.offtask_goals where user_id=owner and (id=t.goal_id or(t.goal_id is null and lower(title)=lower(t.label))) order by (id=t.goal_id)desc nulls last limit 1;
  select * into p from public.offtask_plans where user_id=owner and id=g.plan_id;
  select coalesce(jsonb_agg(public.offtask_task_summary(x) order by x.id),'[]') into rows from public.tasks x where x.user_id=owner and x.id=any(t.dependency_ids);
  return public.offtask_finish_context(jsonb_build_object('task',public.offtask_task_json(t),'goal',case when g.id is not null then public.offtask_goal_json(g) else null end,'prd',public.offtask_prd_json(owner,g),'plan',case when p.id is not null then public.offtask_plan_json(p) else null end,'dependencies',rows,
   'recent_updates',(select coalesce(jsonb_agg(v order by v->>'created_at'desc,v->>'id'desc),'[]') from(select to_jsonb(r)-'user_id'||jsonb_build_object('source_goal_revision',r.source_goal_revision::text,'source_prd_revision',r.source_prd_revision::text) v from public.offtask_task_results r where r.user_id=owner and r.task_id=t.id order by r.created_at desc,r.id desc limit 20)s)),args);
 else raise exception using message='validation_failed: unknown read operation',errcode='22023';end if;
 result:=jsonb_build_object(case when operation='list_goals' then 'goals' else 'tasks' end,case when jsonb_array_length(rows)>lim then rows-(jsonb_array_length(rows)-1) else rows end,'next_offset',case when jsonb_array_length(rows)>lim then off+lim else null end);
 return result;
end $$;

create function public.offtask_integration_mutate(operation text,args jsonb,actor uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
<<mutation>>
declare owner uuid:=public.offtask_integration_owner(actor);g public.offtask_goals;p public.offtask_plans;t public.tasks;doc public.planner_items;
 key text:=args->>'request_key';target text:=coalesce(args->>'task_id',args->>'plan_id',args->>'goal_id','create');fingerprint text;
 previous public.offtask_integration_requests;result jsonb;patch jsonb;item jsonb;other jsonb;selected jsonb;newid uuid;
 prdid text;goalid uuid;planid uuid;taskid uuid;deps uuid[];created jsonb:='[]';existing jsonb:='[]';fields text;itemids text[];
begin
 if jsonb_typeof(args)<>'object' or key is null or length(key) not between 8 and 200 or key!~'^[A-Za-z0-9_.:-]+$' then raise exception using message='validation_failed: request_key required',errcode='22023';end if;
 if args?'project_id' and args->>'project_id'<>owner::text then raise exception using message='not_found',errcode='P0002';end if;
 if operation not in ('save_goal','save_prd','save_plan','apply_plan_tasks','update_task','add_task_result') then raise exception using message='validation_failed: unknown mutation',errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('offtask-owner:'||owner::text,0));
 fingerprint:=encode(sha256(convert_to(args::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(owner::text||operation||target||key,0));
 select * into previous from public.offtask_integration_requests r where r.user_id=owner and r.operation=$1 and r.target=mutation.target and r.request_key=key;
 if found then if previous.payload_hash<>fingerprint then raise exception using message='request_key_conflict',errcode='40001';end if;return previous.result;end if;
 if operation='save_goal' then
  if nullif(trim(args->>'title'),'') is null or length(args->>'title')>200 or length(coalesce(args->>'outcome',''))>16000 then raise exception using message='validation_failed',errcode='22023';end if;
  if args?'goal_id' then
   select * into g from public.offtask_goals where user_id=owner and id=(args->>'goal_id')::uuid for update;if not found then raise exception using message='not_found',errcode='P0002';end if;
   perform public.offtask_expect_revision(g.revision,args->'expected_revision');
   fields:=g.legacy_goal_id;
   if exists(select 1 from public.offtask_goals where user_id=owner and legacy_goal_id=lower(trim(args->>'title')) and id<>g.id)then raise exception using message='revision_conflict: goal name already exists',errcode='40001';end if;
   update public.offtask_goals set title=trim(args->>'title'),legacy_goal_id=lower(trim(args->>'title')),outcome=coalesce(args->>'outcome',outcome),priority=coalesce((args->>'priority')::integer,priority),status=coalesce(args->>'status',status) where id=g.id returning * into g;
   insert into public.planner_items(user_id,kind,id,value,deleted)values(owner,'goal',g.legacy_goal_id,to_jsonb(g.title),g.status='archived')
    on conflict(user_id,kind,id)do update set value=excluded.value,deleted=excluded.deleted;
   if fields<>g.legacy_goal_id then delete from public.planner_items where user_id=owner and kind='goal' and id=fields;end if;
   select * into g from public.offtask_goals where id=g.id and user_id=owner;
  else
   if exists(select 1 from public.offtask_goals where user_id=owner and legacy_goal_id=lower(trim(args->>'title')))then raise exception using message='revision_conflict: goal already exists',errcode='40001';end if;
   insert into public.planner_items(user_id,kind,id,value)values(owner,'goal',lower(trim(args->>'title')),to_jsonb(trim(args->>'title')));
   select * into g from public.offtask_goals where user_id=owner and legacy_goal_id=lower(trim(args->>'title')) for update;
   update public.offtask_goals set outcome=coalesce(args->>'outcome',''),priority=coalesce((args->>'priority')::integer,0),status=coalesce(args->>'status','active') where id=g.id returning * into g;
  end if;result:=jsonb_build_object('goal',public.offtask_goal_json(g));
 elsif operation in ('save_prd','save_plan') then
  select * into g from public.offtask_goals where user_id=owner and id=(args->>'goal_id')::uuid for update;if not found then raise exception using message='not_found',errcode='P0002';end if;
  perform public.offtask_expect_revision(g.revision,args->'expected_goal_revision');
  select * into doc from public.planner_items where user_id=owner and kind='note' and id=g.prd_id and not deleted for update;
  if operation='save_prd' then
   if not public.offtask_text_array(coalesce(args->'acceptance_criteria','[]')) or jsonb_typeof(args->'markdown') is distinct from 'string' or length(args->>'markdown')>200000 then raise exception using message='validation_failed',errcode='22023';end if;
   if doc.id is not null then perform public.offtask_expect_revision(doc.revision,args->'expected_prd_revision');prdid:=doc.id;
   else if coalesce(args->'expected_prd_revision','null')<>'null'::jsonb then raise exception using message='revision_conflict',errcode='40001';end if;prdid:='offtask-prd:'||gen_random_uuid()::text;end if;
   insert into public.planner_items(user_id,kind,id,value)values(owner,'note',prdid,jsonb_build_object('id',prdid,'title',g.title||' · PRD','body',args->>'markdown','pinned',false,'updatedAt',now()))
    on conflict(user_id,kind,id)do update set value=planner_items.value||jsonb_build_object('body',args->>'markdown','updatedAt',now()),deleted=false;
   update public.offtask_goals set prd_id=prdid,prd_acceptance_criteria=coalesce(args->'acceptance_criteria','[]')where id=g.id returning * into g;
   result:=jsonb_build_object('goal',public.offtask_goal_json(g),'prd',public.offtask_prd_json(owner,g));
  else
   if doc.id is null or g.status<>'active' then raise exception using message='validation_failed: active goal and PRD required',errcode='22023';end if;
   perform public.offtask_expect_revision(doc.revision,args->'expected_prd_revision');
   if jsonb_typeof(args->'items') is distinct from 'array' or jsonb_array_length(args->'items')>100 or length(coalesce(args->>'summary',''))>32000 then raise exception using message='validation_failed',errcode='22023';end if;
   itemids:='{}';for item in select value from jsonb_array_elements(args->'items')loop
   if jsonb_typeof(item)<>'object' or length(coalesce(item->>'id','')) not between 1 and 200 or nullif(trim(item->>'id'),'') is null or nullif(trim(item->>'title'),'') is null or length(item->>'title')>500 or length(coalesce(item->>'description',''))>16000 or not public.offtask_text_array(coalesce(item->'acceptance_criteria','[]')) or not public.offtask_text_array(coalesce(item->'dependency_item_ids','[]')) or (item->>'id')=any(itemids) then raise exception using message='validation_failed: plan item',errcode='22023';end if;itemids:=array_append(itemids,item->>'id');
   end loop;
   for item in select value from jsonb_array_elements(args->'items')loop
    if exists(select 1 from jsonb_array_elements_text(coalesce(item->'dependency_item_ids','[]'))d where not d=any(itemids) or d=item->>'id')then raise exception using message='validation_failed: plan dependency',errcode='22023';end if;
   end loop;
   if exists(with recursive edges(a,b)as(select i->>'id',d from jsonb_array_elements(args->'items')i cross join jsonb_array_elements_text(coalesce(i->'dependency_item_ids','[]'))d),walk(a,b)as(select a,b from edges union select w.a,e.b from walk w join edges e on e.a=w.b)select 1 from walk where a=b)then raise exception using message='validation_failed: plan cycle',errcode='22023';end if;
   if args?'plan_id' then
    select * into p from public.offtask_plans where user_id=owner and goal_id=g.id and id=(args->>'plan_id')::uuid for update;if not found then raise exception using message='not_found',errcode='P0002';end if;
    if g.plan_id is distinct from p.id then raise exception using message='revision_conflict: current plan changed',errcode='40001';end if;
    perform public.offtask_expect_revision(p.revision,args->'expected_plan_revision');
    update public.offtask_plans set summary=coalesce(args->>'summary',''),items=args->'items',source_prd_id=doc.id,source_prd_revision=doc.revision where id=p.id returning * into p;
   else
    if args?'expected_plan_revision' and args->'expected_plan_revision'<>'null'::jsonb then raise exception using message='revision_conflict',errcode='40001';end if;
    insert into public.offtask_plans(user_id,goal_id,source_prd_id,source_prd_revision,summary,items)values(owner,g.id,doc.id,doc.revision,coalesce(args->>'summary',''),args->'items')returning * into p;
   end if;
   update public.offtask_goals set plan_id=p.id where id=g.id returning * into g;result:=jsonb_build_object('goal',public.offtask_goal_json(g),'plan',public.offtask_plan_json(p));
  end if;
 elsif operation='apply_plan_tasks' then
  select * into p from public.offtask_plans where user_id=owner and id=(args->>'plan_id')::uuid for update;if not found then raise exception using message='not_found',errcode='P0002';end if;
  perform public.offtask_expect_revision(p.revision,args->'expected_plan_revision');
  select * into g from public.offtask_goals where user_id=owner and id=p.goal_id for update;
  select * into doc from public.planner_items where user_id=owner and kind='note' and id=g.prd_id and not deleted for update;
  if g.status<>'active' or g.plan_id is distinct from p.id or doc.id is distinct from p.source_prd_id or doc.revision is distinct from p.source_prd_revision then raise exception using message='revision_conflict',errcode='40001';end if;
  selected:=args->'selected_item_ids';if not public.offtask_text_array(selected) or jsonb_array_length(selected)=0 then raise exception using message='validation_failed',errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements_text(selected)s where not exists(select 1 from jsonb_array_elements(p.items)i where i->>'id'=s))then raise exception using message='validation_failed: unknown plan item',errcode='22023';end if;
  for item in select value from jsonb_array_elements(p.items)i where selected? (i->>'id') loop
   select id into taskid from public.tasks where user_id=owner and source_plan_id=p.id and source_plan_item_id=item->>'id';
   if taskid is not null then existing:=existing||jsonb_build_array(taskid);continue;end if;
   insert into public.tasks(user_id,content,description,"isComplete",priority,target_group,date,label,goal_id,execution_target,work_stage,acceptance_criteria,source_plan_id,source_plan_item_id,source_plan_revision)
    values(owner,item->>'title',coalesce(item->>'description',''),false,g.priority,'upcoming',null,g.title,g.id,'codex','ready',coalesce(item->'acceptance_criteria','[]'),p.id,item->>'id',p.revision)returning id into taskid;
   created:=created||jsonb_build_array(taskid);
  end loop;
  for item in select value from jsonb_array_elements(p.items)i where selected? (i->>'id') loop
   select id into taskid from public.tasks where user_id=owner and source_plan_id=p.id and source_plan_item_id=item->>'id';
   if not created?taskid::text then continue;end if;
   deps:='{}';for fields in select value from jsonb_array_elements_text(coalesce(item->'dependency_item_ids','[]'))loop
    select id into newid from public.tasks where user_id=owner and source_plan_id=p.id and source_plan_item_id=fields;
    if newid is null then raise exception using message='validation_failed: select missing dependency too',errcode='22023';end if;deps:=array_append(deps,newid);
   end loop;
   if cardinality(deps)>0 then update public.tasks set dependency_ids=deps where id=taskid;end if;
  end loop;
  result:=jsonb_build_object('created_task_ids',created,'existing_task_ids',existing,'plan',public.offtask_plan_json(p));
 elsif operation in ('update_task','add_task_result') then
  select * into t from public.tasks where user_id=owner and id=(args->>'task_id')::uuid for update;if not found then raise exception using message='not_found',errcode='P0002';end if;
  if operation='update_task' or args?'expected_revision' then perform public.offtask_expect_revision(t.revision,args->'expected_revision');end if;
  if operation='update_task' then
   patch:=args->'patch';if jsonb_typeof(patch) is distinct from 'object' or patch='{}'::jsonb or exists(select 1 from jsonb_object_keys(patch)k where k not in ('content','title','description','acceptance_criteria','execution_target','work_stage','status','priority','dependency_ids','dependencies','isComplete','date','target_group','label'))then raise exception using message='validation_failed: task patch',errcode='22023';end if;
   if patch?'isComplete' and jsonb_typeof(patch->'isComplete')is distinct from 'boolean' then raise exception using message='validation_failed: completion must be boolean',errcode='22023';end if;
   foreach fields in array array['content','title','description','work_stage','status','target_group']loop
    if patch?fields and jsonb_typeof(patch->fields)is distinct from 'string' then raise exception using message='validation_failed: task text fields',errcode='22023';end if;
   end loop;
   if patch?'description' and (jsonb_typeof(patch->'description')<>'string' or length(patch->>'description')>32000) then raise exception using message='validation_failed: task description',errcode='22023';end if;
   if patch?'status' then
    if patch->>'status'='done' then patch:=patch||'{"isComplete":true}'::jsonb;
    elsif patch->>'status'='open' then patch:=patch||'{"isComplete":false}'::jsonb;
    else patch:=patch||jsonb_build_object('work_stage',patch->>'status','isComplete',false);end if;
   end if;
   if patch?'dependencies' then patch:=patch||jsonb_build_object('dependency_ids',patch->'dependencies');end if;
   if patch?'dependency_ids' then if not public.offtask_text_array(patch->'dependency_ids')then raise exception using message='validation_failed',errcode='22023';end if;select coalesce(array_agg(d::uuid),'{}')into deps from jsonb_array_elements_text(patch->'dependency_ids')d;else deps:=t.dependency_ids;end if;
   if (patch?'content' or patch?'title')and(nullif(trim(coalesce(patch->>'content',patch->>'title')),'')is null or length(coalesce(patch->>'content',patch->>'title'))>16000)then raise exception using message='validation_failed',errcode='22023';end if;
   update public.tasks set content=coalesce(patch->>'content',patch->>'title',content),description=coalesce(patch->>'description',description),priority=coalesce((patch->>'priority')::integer,priority),execution_target=case when patch?'execution_target' then patch->>'execution_target' else execution_target end,
    work_stage=coalesce(patch->>'work_stage',work_stage),"isComplete"=coalesce((patch->>'isComplete')::boolean,"isComplete"),acceptance_criteria=coalesce(patch->'acceptance_criteria',acceptance_criteria),dependency_ids=deps,
    date=case when patch?'date' then (patch->>'date')::date else date end,target_group=coalesce(patch->>'target_group',target_group),label=case when patch?'label' then patch->>'label' else label end,
    completed_at=case when patch->>'isComplete'='true' then coalesce(completed_at,now())when patch->>'isComplete'='false' then null else completed_at end
    where id=t.id returning * into t;result:=jsonb_build_object('task',public.offtask_task_json(t));
  else
   if nullif(trim(args->>'summary'),'')is null or length(args->>'summary')>32000 or not public.offtask_text_array(coalesce(args->'blockers','[]'))or not public.offtask_text_array(coalesce(args->'validation','[]'))or jsonb_typeof(coalesce(args->'links','[]'))<>'array' or jsonb_array_length(coalesce(args->'links','[]'))>50 then raise exception using message='validation_failed',errcode='22023';end if;
   for item in select value from jsonb_array_elements(coalesce(args->'links','[]'))loop
    if jsonb_typeof(item)<>'object' or coalesce(item->>'url','')!~'^https?://' or length(item->>'url')>4000 or length(coalesce(item->>'label',''))>500 then raise exception using message='validation_failed: result link',errcode='22023';end if;
   end loop;
   if not args?'source_goal_revision' or not args?'source_prd_revision' then raise exception using message='validation_failed: source revisions must be explicit (or null)',errcode='22023';end if;
   select * into g from public.offtask_goals where user_id=owner and(id=t.goal_id or(t.goal_id is null and lower(title)=lower(t.label)))order by(id=t.goal_id)desc nulls last limit 1;
   if g.id is not null then
    perform public.offtask_expect_revision(g.revision,args->'source_goal_revision');
    select * into doc from public.planner_items where user_id=owner and kind='note' and id=g.prd_id and not deleted;
    if doc.id is not null then perform public.offtask_expect_revision(doc.revision,args->'source_prd_revision');
    elsif args->'source_prd_revision'<>'null'::jsonb then raise exception using message='revision_conflict: requirements no longer present',errcode='40001';end if;
   elsif args->'source_goal_revision'<>'null'::jsonb or args->'source_prd_revision'<>'null'::jsonb then
    raise exception using message='revision_conflict: parent context no longer present',errcode='40001';
   end if;
   insert into public.offtask_task_results(user_id,task_id,author_id,summary,blockers,validation,links,source_goal_revision,source_prd_revision)
    values(owner,t.id,owner,args->>'summary',coalesce(args->'blockers','[]'),coalesce(args->'validation','[]'),coalesce(args->'links','[]'),g.revision,doc.revision)returning id into newid;
   select jsonb_build_object('task',public.offtask_task_json(t),'result',to_jsonb(r)-'user_id'||jsonb_build_object('source_goal_revision',r.source_goal_revision::text,'source_prd_revision',r.source_prd_revision::text))into result from public.offtask_task_results r where id=newid;
  end if;
 end if;
 insert into public.offtask_integration_requests(user_id,operation,target,request_key,payload_hash,result)values(owner,operation,target,key,fingerprint,result);
 insert into public.offtask_integration_audit(user_id,actor_id,operation,target,request_key,affected_ids,revisions)
  values(owner,owner,operation,target,key,
   (select coalesce(jsonb_agg(identifier),'[]')from jsonb_array_elements(jsonb_build_array(result#>'{goal,id}',result#>'{plan,id}',result#>'{task,id}',result#>'{result,id}')||coalesce(result->'created_task_ids','[]'))e(identifier)where identifier<>'null'::jsonb),
   jsonb_strip_nulls(jsonb_build_object('goal',result#>'{goal,revision}','plan',result#>'{plan,revision}','task',result#>'{task,revision}',
    'created_tasks',(select jsonb_object_agg(x.id::text,x.revision::text)from public.tasks x where x.user_id=owner and coalesce(result->'created_task_ids','[]')?x.id::text))));
 return result;
end $$;

-- No client-controlled context flag: invoker identity distinguishes ordinary
-- PostgREST writes from writes executed inside the owner-owned CAS RPC. Keeping
-- these in the note payload model still lets existing note storage preserve them.
create function public.offtask_protect_prd_note() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare protected boolean:=false;rpc_owner name;
begin
 if tg_op<>'INSERT' then protected:=old.kind='note' and old.id like 'offtask-prd:%';end if;
 if tg_op<>'DELETE' then protected:=protected or(new.kind='note' and new.id like 'offtask-prd:%');end if;
 if protected then
  select pg_get_userbyid(proowner) into rpc_owner from pg_catalog.pg_proc where oid='public.offtask_integration_mutate(text,jsonb,uuid)'::regprocedure;
  if current_user<>rpc_owner and current_user<>'service_role' then raise exception using message='forbidden: protected PRD requires versioned save_prd',errcode='42501';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger offtask_prd_guard before insert or update or delete on public.planner_items for each row execute function public.offtask_protect_prd_note();

-- Helpers/trigger entrypoints are not an alternative externally callable API.
revoke all on function public.offtask_integration_owner(uuid),public.offtask_expect_revision(bigint,jsonb),public.offtask_goal_json(public.offtask_goals),public.offtask_prd_json(uuid,public.offtask_goals),public.offtask_plan_json(public.offtask_plans),public.offtask_task_json(public.tasks),public.offtask_task_summary(public.tasks),public.offtask_text_array(jsonb),public.offtask_revision_trigger(),public.offtask_legacy_goal_trigger(),public.offtask_task_guard(),public.offtask_owner_statement_lock(),public.offtask_protect_prd_note(),public.offtask_finish_context(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.offtask_integration_read(text,jsonb,uuid),public.offtask_integration_mutate(text,jsonb,uuid) from public,anon;
grant execute on function public.offtask_integration_read(text,jsonb,uuid),public.offtask_integration_mutate(text,jsonb,uuid) to authenticated,service_role;
