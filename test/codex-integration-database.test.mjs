import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCodexDatabaseFixture as setup,OWNER_A as A,OWNER_B as B} from './helpers/codex-database.mjs';
test('owner-scoped reads, legacy goal backfill, and trusted actor delegation',async t=>{
 const{db,owner,read,mutate}=await setup(t);
 await db.query("insert into planner_items(user_id,kind,id,value)values($1,'goal','travel','\"Travel\"')",[A]);
 const{goals}=await read('list_goals');assert.equal(goals.length,1);assert.equal(goals[0].legacy_goal_id,'travel');assert.equal(typeof goals[0].revision,'string');
 await assert.rejects(()=>read('list_goals',{},A),/forbidden/);
 await db.query("select set_config('request.jwt.claim.role','service_role',false)");
 await assert.rejects(()=>read('list_goals',{},A),/forbidden/); // a spoofed GUC alone never delegates a principal
 await owner(B);assert.deepEqual((await read('list_goals')).goals,[]);
 await assert.rejects(()=>read('get_goal_context',{goal_id:goals[0].id}),/not_found/);
 await assert.rejects(()=>read('list_goals',{project_id:A}),/not_found/);
 await assert.rejects(()=>mutate('save_goal',{goal_id:goals[0].id,expected_revision:goals[0].revision,title:'Forged'}),/not_found/);
 await owner('', 'service_role');assert.equal((await read('list_goals',{},A)).goals[0].id,goals[0].id);
 await owner('');await assert.rejects(()=>read('list_goals'),/unauthenticated/);
 await db.exec('reset role;set role anon');await assert.rejects(()=>read('list_goals'),/permission denied/);
});
test('plans preserve source revisions, materialize atomically, and retry without duplicates',async t=>{
 const{db,read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 const request={goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,summary:'Safe plugin',items:[{id:'schema',title:'Add safe schema',acceptance_criteria:['RLS verified']},{id:'adapter',title:'Build adapter',dependency_item_ids:['schema']}],request_key:'stable-plan-key'};
 const saved=await mutate('save_plan',request);assert.deepEqual(await mutate('save_plan',request),saved);
 await assert.rejects(()=>mutate('save_plan',{...request,summary:'Changed'}),/request_key_conflict/);
 const{plan}=saved;
 await assert.rejects(()=>mutate('apply_plan_tasks',{plan_id:plan.id,expected_plan_revision:plan.revision,selected_item_ids:['adapter']}),/select missing dependency/);
 assert.equal((await read('list_tasks')).tasks.length,0);
 const apply={plan_id:plan.id,expected_plan_revision:plan.revision,selected_item_ids:['schema','adapter'],request_key:'stable-apply-key'};
 const linked=await mutate('apply_plan_tasks',apply);assert.equal(linked.created_task_ids.length,2);assert.deepEqual(await mutate('apply_plan_tasks',apply),linked);
 const again=await mutate('apply_plan_tasks',{...apply,request_key:'new-apply-request'});assert.equal(again.created_task_ids.length,0);assert.equal(again.existing_task_ids.length,2);
 const tasks=(await read('list_tasks')).tasks;assert.equal(tasks.length,2);assert.equal(tasks.find(x=>x.title==='Build adapter').eligible,false);assert.equal(tasks.find(x=>x.title==='Add safe schema').eligible,true);
 assert.ok(tasks.every(x=>x.date===null&&x.execution_target==='codex'&&x.target_group==='upcoming'));
 const row=(await db.query('select * from offtask_integration_audit limit 1')).rows[0];assert.ok(!JSON.stringify(row).includes('Do not start background runs'));
});
test('protected PRDs require CAS, changed requirements invalidate plans, and legacy task edits reject stale patches',async t=>{
 const{db,read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 const{plan}=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,summary:'First',items:[{id:'one',title:'Implement'}]});
 assert.ok(prd.id.startsWith('offtask-prd:'));
 await assert.rejects(()=>db.query("update planner_items set value=value||'{\"body\":\"Stale blind outbox\"}' where user_id=$1 and id=$2",[A,prd.id]),/protected PRD/);
 await assert.rejects(()=>db.query("delete from planner_items where user_id=$1 and id=$2",[A,prd.id]),/protected PRD/);
 await db.query("select set_config('offtasks.integration_write','true',false)");
 await assert.rejects(()=>db.query("update planner_items set deleted=true where user_id=$1 and id=$2",[A,prd.id]),/protected PRD/);
 const before=await read('get_goal_context',{goal_id:goal.id});
 await mutate('save_prd',{goal_id:goal.id,expected_goal_revision:before.goal.revision,expected_prd_revision:prd.revision,markdown:'New requirements',acceptance_criteria:['New acceptance']});
 await assert.rejects(()=>mutate('apply_plan_tasks',{plan_id:plan.id,expected_plan_revision:plan.revision,selected_item_ids:['one']}),/revision_conflict/);
 const fresh=await read('get_goal_context',{goal_id:goal.id});assert.notEqual(fresh.prd.revision,prd.revision);assert.equal(fresh.plan.requirements_changed,true);
 const{id}= (await db.query('insert into tasks(user_id,content)values($1,$2)returning id',[A,'Original'])).rows[0];
 const old=(await read('get_task_context',{task_id:id})).task;
 await db.query('update tasks set content=$1 where id=$2',['Changed in app',id]);
 await assert.rejects(()=>mutate('update_task',{task_id:id,expected_revision:old.revision,patch:{title:'Stale chat'}}),/revision_conflict/);
 assert.equal((await read('get_task_context',{task_id:id})).task.title,'Changed in app');
});
test('dependency authorization, cycles and completion rules cannot be bypassed',async t=>{
 const{db,owner,read,mutate}=await setup(t);
 const ids=[];for(const label of ['First','Second'])ids.push((await db.query('insert into tasks(user_id,content)values($1,$2)returning id',[A,label])).rows[0].id);
 const foreign=(await (async()=>{await owner(B);return db.query('insert into tasks(user_id,content)values($1,$2)returning id',[B,'Private']);})()).rows[0].id;await owner(A);
 let task=(await read('get_task_context',{task_id:ids[1]})).task;
 await assert.rejects(()=>mutate('update_task',{task_id:task.id,expected_revision:task.revision,patch:{dependency_ids:[foreign]}}),/dependency unavailable/);
 task=(await mutate('update_task',{task_id:task.id,expected_revision:task.revision,patch:{dependencies:[ids[0]],execution_target:'codex'}})).task;
 await assert.rejects(()=>mutate('update_task',{task_id:task.id,expected_revision:task.revision,patch:{status:'done'}}),/unfinished dependencies/);
 let first=(await read('get_task_context',{task_id:ids[0]})).task;
 await assert.rejects(()=>mutate('update_task',{task_id:first.id,expected_revision:first.revision,patch:{dependencies:[task.id]}}),/dependency cycle/);
 await mutate('update_task',{task_id:first.id,expected_revision:first.revision,patch:{status:'done'}});
 task=(await mutate('update_task',{task_id:task.id,expected_revision:task.revision,patch:{status:'awaiting_review'}})).task;assert.equal(task.isComplete,false);
 await assert.rejects(()=>mutate('update_task',{task_id:task.id,expected_revision:task.revision,patch:{user_id:B}}),/task patch/);
 await assert.rejects(()=>mutate('update_task',{task_id:task.id,expected_revision:task.revision,patch:{priority:9}}),/validation_failed/);
});
test('result updates are append-only, idempotent and never complete tasks',async t=>{
 const{db,read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 const{plan,goal:currentGoal}=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items:[{id:'one',title:'One'}]});
 const applied=await mutate('apply_plan_tasks',{plan_id:plan.id,expected_plan_revision:plan.revision,selected_item_ids:['one']});
 const task=(await read('get_task_context',{task_id:applied.created_task_ids[0]})).task;
 const req={task_id:task.id,expected_revision:task.revision,source_goal_revision:currentGoal.revision,source_prd_revision:prd.revision,summary:'Implemented, ready for review',validation:['Isolated SQL passed; hosted testing not performed'],links:[{url:'https://github.com/etlyn/offtasks.com/pull/1',label:'PR'}],request_key:'result-repeat-key'};
 const saved=await mutate('add_task_result',req);assert.deepEqual(await mutate('add_task_result',req),saved);
 const context=await read('get_task_context',{task_id:task.id});assert.equal(context.task.isComplete,false);assert.equal(context.recent_updates.length,1);assert.equal(context.recent_updates[0].author_id,A);
 await assert.rejects(()=>db.query('update offtask_task_results set summary=$1',['Forged']),/permission denied/);
 await assert.rejects(()=>mutate('add_task_result',{...req,request_key:'result-other-key',links:[{url:'javascript:alert(1)'}]}),/result link/);
});
test('pagination and malformed inputs fail clearly, without fake empty results',async t=>{
 const{db,read,mutate}=await setup(t);for(const title of ['One','Two','Three'])await mutate('save_goal',{title});
 const first=await read('list_goals',{limit:2});assert.equal(first.goals.length,2);assert.equal(first.next_offset,2);const next=await read('list_goals',{limit:2,offset:2});assert.equal(next.goals.length,1);assert.equal(next.next_offset,null);
 await assert.rejects(()=>read('list_tasks',{limit:101}),/validation_failed/);
 await assert.rejects(()=>mutate('save_goal',{title:'Bad',priority:8}),/check constraint/);
 await assert.rejects(()=>mutate('save_goal',{title:'',request_key:'tiny'}),/validation_failed/);
 await assert.rejects(()=>read('unknown'),/unknown read operation/);
});

test('stable goal identity survives a rename, legacy category changes and archive eligibility',async t=>{
 const{db,read,mutate}=await setup(t);
 const{id}= (await db.query('insert into tasks(user_id,content,label,execution_target)values($1,$2,$3,$4)returning id',[A,'Book','Travel','codex'])).rows[0];
 let{goals}=await read('list_goals');assert.equal(goals.length,1);const original=goals[0];
 const saved=await mutate('save_goal',{goal_id:original.id,expected_revision:original.revision,title:'Journey'});assert.equal(saved.goal.id,original.id);assert.equal(saved.goal.legacy_goal_id,'journey');
 assert.equal((await read('list_goals')).goals.length,1);assert.equal((await read('get_task_context',{task_id:id})).task.label,'Journey');
 assert.deepEqual((await db.query("select id from planner_items where kind='goal'")).rows,[{id:'journey'}]);
 await db.query("update tasks set label='Work' where id=$1",[id]);
 let ctx=await read('get_task_context',{task_id:id});assert.equal(ctx.goal.title,'Work');assert.notEqual(ctx.goal.id,original.id);
 const archived=await mutate('save_goal',{goal_id:ctx.goal.id,expected_revision:ctx.goal.revision,title:'Work',status:'archived'});assert.equal(archived.goal.status,'archived');
 ctx=await read('get_task_context',{task_id:id});assert.equal(ctx.task.eligible,false);
 await assert.rejects(()=>mutate('update_task',{task_id:id,expected_revision:ctx.task.revision,patch:{status:'in_progress'}}),/goal archived/);
});

test('plan item cycles, stale edits and unchanged linked tasks are guarded',async t=>{
 const{read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 await assert.rejects(()=>mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items:[{id:'a',title:'A',dependency_item_ids:['b']},{id:'b',title:'B',dependency_item_ids:['a']}]}),/plan cycle/);
 await assert.rejects(()=>mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items:[{id:'a',title:'A'},{id:'a',title:'Duplicate'}]}),/plan item/);
 let{plan}=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items:[{id:'one',title:'Original'}]});
 const{created_task_ids}=await mutate('apply_plan_tasks',{plan_id:plan.id,expected_plan_revision:plan.revision,selected_item_ids:['one']});
 const oldPlan=plan;
 ({plan}=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:(await read('get_goal_context',{goal_id:goal.id})).goal.revision,plan_id:plan.id,expected_plan_revision:plan.revision,expected_prd_revision:prd.revision,items:[{id:'one',title:'Changed plan text'}]}));
 await assert.rejects(async()=>mutate('save_plan',{goal_id:goal.id,expected_goal_revision:(await read('get_goal_context',{goal_id:goal.id})).goal.revision,plan_id:plan.id,expected_plan_revision:oldPlan.revision,expected_prd_revision:prd.revision,items:[]}),/revision_conflict/);
 const relink=await mutate('apply_plan_tasks',{plan_id:plan.id,expected_plan_revision:plan.revision,selected_item_ids:['one']});assert.deepEqual(relink.existing_task_ids,created_task_ids);
 assert.equal((await read('get_task_context',{task_id:created_task_ids[0]})).task.title,'Original');
});

test('dense dependency graphs remain bounded and summary/context fields are explicit',async t=>{
 const{db,read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 const items=Array.from({length:100},(_,i)=>({id:`step-${i}`,title:`Step ${i}`,dependency_item_ids:Array.from({length:99-i},(_,j)=>`step-${i+j+1}`)}));
 const{plan}=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items});assert.equal(plan.items.length,100);
 const{id}=(await db.query('insert into tasks(user_id,content,description,label,acceptance_criteria)values($1,$2,$3,$4,$5::jsonb)returning id',[A,'a'.repeat(500),'Full detail',goal.title,JSON.stringify(['Do not silently truncate this acceptance criterion'])])).rows[0];
 const summary=(await read('list_tasks')).tasks.find(x=>x.id===id);assert.equal(summary.title.length,300);assert.equal(summary.title_truncated,true);assert.equal(summary.context_available,true);assert.equal('description'in summary,false);assert.equal('acceptance_criteria'in summary,false);
 const context=await read('get_task_context',{task_id:id});assert.equal(context.task.title.length,500);assert.equal(context.task.description,'Full detail');assert.equal(context.task.acceptance_criteria.length,1);
 assert.equal((await read('list_tasks',{work_stage:'blocked'})).tasks.length,0);
 await mutate('update_task',{task_id:id,expected_revision:context.task.revision,patch:{work_stage:'blocked'}});assert.equal((await read('list_tasks',{work_stage:'blocked'})).tasks.length,1);
});

test('project-only Codex tasks record explicit null source context without pretending removed requirements are current',async t=>{
 const{db,read,mutate}=await setup(t);
 const{id}=(await db.query('insert into tasks(user_id,content,execution_target,acceptance_criteria)values($1,$2,$3,$4::jsonb)returning id',[A,'Review config','codex',JSON.stringify(['Show actual validation'])])).rows[0];
 const context=await read('get_task_context',{task_id:id});assert.equal(context.goal,null);assert.equal(context.prd,null);assert.equal(context.task.eligible,true);
 const req={task_id:id,expected_revision:context.task.revision,source_goal_revision:null,source_prd_revision:null,summary:'Config reviewed',validation:['Unit checks passed; hosted OAuth not exercised']};
 const saved=await mutate('add_task_result',req);assert.equal(saved.result.source_goal_revision,null);assert.equal(saved.result.source_prd_revision,null);assert.equal(saved.task.isComplete,false);
 await assert.rejects(()=>mutate('add_task_result',{...req,source_goal_revision:'1'}),/revision_conflict/);
 await assert.rejects(()=>mutate('add_task_result',{...req,source_prd_revision:'1'}),/revision_conflict/);
 const missing={...req};delete missing.source_prd_revision;await assert.rejects(()=>mutate('add_task_result',missing),/source revisions must be explicit/);
});

test('OAuth client JWTs cannot bypass MCP scopes through ordinary RPCs or direct app tables',async t=>{
 const{db,owner,read,mutate,feature}=await setup(t);const{goal}=await feature();
 const{id}=(await db.query('insert into tasks(user_id,content)values($1,$2)returning id',[A,'Private'])).rows[0];
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'authenticated',sub:A,client_id:'read-only-oauth-client'})]);
 assert.equal((await db.query('select * from tasks')).rows.length,0);
 assert.equal((await db.query('select * from offtask_goals')).rows.length,0);
 await assert.rejects(()=>read('list_goals'),/OAuth credentials/);
 await assert.rejects(()=>mutate('save_goal',{title:'Bypass'}),/OAuth credentials/);
 await assert.rejects(()=>db.query('update tasks set content=$1 where id=$2',['Forged',id]),/OAuth credentials/);
 await assert.rejects(()=>db.query('delete from planner_items where id=$1',[goal.legacy_goal_id]),/OAuth credentials/);
 await owner('', 'service_role');await assert.rejects(()=>read('list_goals',{},A),/OAuth credentials/);
 await db.query("select set_config('request.jwt.claims','{}',false)");
 assert.equal((await read('list_goals',{},A)).goals[0].id,goal.id);
 await owner(A);assert.equal((await read('get_task_context',{task_id:id})).task.title,'Private');
});

test('plan changes require goal CAS and cannot silently reactivate a noncurrent plan',async t=>{
 const{read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 await assert.rejects(()=>mutate('save_plan',{goal_id:goal.id,expected_prd_revision:prd.revision,items:[]}),/expected revision required/);
 const first=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items:[]});
 await assert.rejects(()=>mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items:[]}),/revision_conflict/);
 const second=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:first.goal.revision,expected_prd_revision:prd.revision,items:[]});
 assert.notEqual(first.plan.id,second.plan.id);
 await assert.rejects(()=>mutate('save_plan',{goal_id:goal.id,expected_goal_revision:second.goal.revision,plan_id:first.plan.id,expected_plan_revision:first.plan.revision,expected_prd_revision:prd.revision,items:[]}),/current plan changed/);
 assert.equal((await read('get_goal_context',{goal_id:goal.id})).plan.id,second.plan.id);
});

test('widget refresh reauthorizes goal and honors authoritative task filters',async t=>{
 const{db,owner,read,feature}=await setup(t);const{goal}=await feature();
 for(const target of ['codex',null])await db.query('insert into tasks(user_id,content,label,execution_target)values($1,$2,$3,$4)',[A,target?'Assigned':'Ordinary',goal.title,target]);
 assert.equal((await read('get_goal_context',{goal_id:goal.id})).tasks.length,2);
 const filtered=await read('render_plan_widget',{project_id:A,goal_id:goal.id,execution_target:'codex'});assert.equal(filtered.tasks.length,1);assert.equal(filtered.tasks[0].title,'Assigned');assert.equal(filtered.task_summary.total,1);
 assert.equal((await read('render_plan_widget',{goal_id:goal.id,execution_target:'codex',status:'done'})).tasks.length,0);
 await owner(B);await assert.rejects(()=>read('render_plan_widget',{goal_id:goal.id}),/not_found/);
});

test('internal context fragments reconstruct a real >3MB result history and conflict on revision changes',async t=>{
 const{db,read,mutate}=await setup(t);
 const{id}=(await db.query('insert into tasks(user_id,content)values($1,$2)returning id',[A,'Large evidence'])).rows[0];
 const evidence=Array.from({length:100},(_,i)=>`${i}:`+'x'.repeat(3996));
 for(let i=0;i<4;i++)await mutate('add_task_result',{task_id:id,source_goal_revision:null,source_prd_revision:null,summary:`Result ${i} `+'s'.repeat(31900),blockers:evidence,validation:evidence});
 const full=await read('get_task_context',{task_id:id});assert.ok(Buffer.byteLength(JSON.stringify(full))>3*1024*1024);
 const first=await read('get_task_context',{task_id:id,_context_offset:0});assert.equal(first.task.id,id);assert.equal(first.context_complete,false);assert.equal(first.context_fragment.encoding,'json');
 const parts=[];let page=first,calls=0;
 for(;;){assert.ok(Buffer.byteLength(JSON.stringify(page))<80000);assert.ok(page.context_fragment.text.length<=12000);parts.push(page.context_fragment.text);calls++;if(page.context_complete)break;
  page=await read('get_task_context',{task_id:id,_context_offset:page.next_context_offset,_context_snapshot:first.context_snapshot});}
 assert.ok(calls>200);assert.deepEqual(JSON.parse(parts.join('')),full);
 await mutate('update_task',{task_id:id,expected_revision:full.task.revision,patch:{content:'Changed during continuation'}});
 await assert.rejects(()=>read('get_task_context',{task_id:id,_context_offset:first.next_context_offset,_context_snapshot:first.context_snapshot}),/revision_conflict/);
 await assert.rejects(()=>read('get_task_context',{task_id:id,_context_offset:-1}),/context offset/);
 await assert.rejects(()=>read('get_task_context',{task_id:id,_context_offset:0,_context_snapshot:'forged'}),/context snapshot/);
 await assert.rejects(()=>db.query('select public.offtask_finish_context($1::jsonb,$2::jsonb)',['{}','{}']),/permission denied/);
});

test('small contexts remain compatible and widget projections omit large documents',async t=>{
 const{read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 const small=await read('get_goal_context',{goal_id:goal.id});assert.deepEqual(await read('get_goal_context',{goal_id:goal.id,_context_offset:0}),small);
 const {plan,goal:updatedGoal}=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,summary:'s'.repeat(20000),items:[{id:'one',title:'One',description:'d'.repeat(16000),acceptance_criteria:['a'.repeat(4000)]}]});
 const widget=await read('render_plan_widget',{goal_id:goal.id});assert.equal(widget.plan.id,plan.id);assert.equal(widget.plan.summary.length,1600);assert.equal(widget.plan.summary_truncated,true);assert.equal('markdown'in widget.prd,false);assert.equal('acceptance_criteria'in widget.plan.items[0],false);assert.equal('description'in widget.plan.items[0],false);
 const chunk=await read('get_goal_context',{goal_id:goal.id,_context_offset:0});assert.equal(chunk.context_complete,false);assert.equal(chunk.goal.revision,updatedGoal.revision);assert.equal(chunk.prd.revision,prd.revision);
 const goals=await read('list_goals');assert.equal('prd_acceptance_criteria'in goals.goals[0],false);
});

test('app-only purge deletes referencing tasks before archived goals/plans and retains shared identities',async t=>{
 const{db,owner,read,mutate,feature}=await setup(t);const{goal,prd}=await feature();
 const saved=await mutate('save_plan',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:prd.revision,items:[{id:'one',title:'In progress'}]});
 const applied=await mutate('apply_plan_tasks',{plan_id:saved.plan.id,expected_plan_revision:saved.plan.revision,selected_item_ids:['one']});
 const context=await read('get_task_context',{task_id:applied.created_task_ids[0]});
 await mutate('update_task',{task_id:context.task.id,expected_revision:context.task.revision,patch:{work_stage:'in_progress'}});
 await mutate('save_goal',{goal_id:goal.id,expected_revision:context.goal.revision,title:goal.title,status:'archived'});
 await owner(B);const other=await mutate('save_goal',{title:'Other owner'});
 await db.query('insert into tasks(user_id,content,label)values($1,$2,$3)',[B,'Retained task',other.goal.title]);
 // Supabase's actual service role bypasses RLS. This fixture-only setup models
 // the existing privileged cleanup client, not an ordinary authenticated user.
 await db.exec('reset role;alter role service_role bypassrls;grant select,delete on public.tasks,public.planner_items to service_role');
 await owner('', 'service_role');
 await assert.rejects(()=>db.query('delete from offtask_plans where user_id=$1',[A]),/goal archived/);
 const source=await readFile(new URL('../supabase/functions/delete-account/delete-account.ts',import.meta.url),'utf8');
 const list=source.match(/export const cleanupTargets: CleanupTarget\[\] = \[([\s\S]*?)\];/)[1];
 const tables=[...list.matchAll(/table: "([a-z_]+)"/g)].map(match=>match[1]);
 assert.ok(tables.indexOf('tasks')<tables.indexOf('offtask_plans'));assert.ok(tables.indexOf('tasks')<tables.indexOf('offtask_goals'));
 for(const table of tables){if((await db.query('select to_regclass($1) id',['public.'+table])).rows[0].id!==null){await db.query(`delete from public.${table} where user_id=$1`,[A]);assert.equal((await db.query(`select count(*)::int count from public.${table} where user_id=$1`,[A])).rows[0].count,0);}}
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int count from auth.users')).rows[0].count,2);
 assert.equal((await db.query('select id from public.offtask_goals where user_id=$1',[B])).rows[0].id,other.goal.id);
 assert.equal((await db.query('select content from public.tasks where user_id=$1',[B])).rows[0].content,'Retained task');
});
