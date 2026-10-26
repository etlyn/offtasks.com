// Real additive SQL in an isolated PostgreSQL WASM database. Not a hosted/API test.
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
export const OWNER_A='11111111-1111-4111-8111-111111111111';
export const OWNER_B='22222222-2222-4222-8222-222222222222';
export async function createCodexDatabaseFixture(t){
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create schema auth;create role authenticated;create role anon;create role service_role;
 create table auth.users(id uuid primary key);insert into auth.users values('${OWNER_A}'),('${OWNER_B}');
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated,anon,service_role;
 create table public.tasks(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),content text not null,"isComplete" boolean not null default false,date date,priority integer not null default 0,target_group text not null default 'today'check(target_group in('today','tomorrow','upcoming','close')));
 alter table public.tasks enable row level security;grant select,insert,update,delete on public.tasks to authenticated;
 create policy own_tasks on public.tasks for all to authenticated using(user_id=auth.uid())with check(user_id=auth.uid());`);
 for(const file of ['20260912000000_device_planner_sync.sql','20260927000000_validate_device_import.sql','20261026000000_codex_integration.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.exec('set role authenticated');
 const owner=async(id,role='authenticated')=>{if(!['authenticated','service_role'].includes(role))throw Error('Unsupported fixture role');await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);};
 await owner(OWNER_A);let key=0;
 const read=async(op,args={},actor=null)=>(await db.query('select public.offtask_integration_read($1,$2::jsonb,$3::uuid) result',[op,JSON.stringify(args),actor])).rows[0].result;
 const mutate=async(op,args,actor=null)=>(await db.query('select public.offtask_integration_mutate($1,$2::jsonb,$3::uuid) result',[op,JSON.stringify({request_key:`test-request-${++key}`,...args}),actor])).rows[0].result;
 const feature=async()=>{
  const{goal}=await mutate('save_goal',{title:'Ship integration',outcome:'Stay in chat',priority:1});
  return mutate('save_prd',{goal_id:goal.id,expected_goal_revision:goal.revision,expected_prd_revision:null,markdown:'## Requirements\nDo not start background runs.',acceptance_criteria:['No fake execution']});
 };
 return{db,owner,read,mutate,feature};
}
