import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
async function setup(t) {
 const db=new PGlite();t.after(()=>db.close());
 // Reproduce the pre-existing task/auth contract; no hosted database or service-role key.
 await db.exec(`create schema auth; create role authenticated; create role anon;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to authenticated,anon;
 create table public.tasks(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),content text not null,"isComplete" boolean not null default false,date date,priority integer not null default 0,target_group text not null default 'today' check(target_group in ('today','tomorrow','upcoming','close')));
 alter table public.tasks enable row level security;
 grant select,insert,update,delete on public.tasks to authenticated;
 create policy own_tasks on public.tasks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 insert into auth.users values('${a}'),('${b}');`);
 for(const migration of ['20260912000000_device_planner_sync.sql','20260927000000_validate_device_import.sql']) {
  await db.exec(await readFile(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'));
 }
 await db.exec('set role authenticated');
 const owner=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
 await owner(a);
 return {db,owner,importItems:payload=>db.query('select public.import_device_items($1::jsonb)',[JSON.stringify(payload)])};
}
const note={id:'note-one',title:'Trip',body:'Plan',pinned:false,updatedAt:'2026-09-26T00:00:00Z',tasks:[{id:'embedded',content:'Pack',isComplete:false}]};
const payload=()=>({tasks:[{id:'task-one',content:'Book',isComplete:false,priority:0,target_group:'today',date:null}],notes:[structuredClone(note)],goals:['Travel']});

test('migration imports once, preserves edits on retry, and isolates tasks/notes/goals by owner',async t=>{
 const {db,owner,importItems}=await setup(t);
 await importItems(payload());await importItems(payload());
 assert.equal((await db.query('select * from tasks')).rows.length,1);
 assert.equal((await db.query('select * from planner_items')).rows.length,2);
 assert.deepEqual((await db.query("select value from planner_items where kind='note'")).rows[0].value.tasks,note.tasks);
 await db.query("update tasks set content='Edited after import'");
 await importItems(payload());
 assert.equal((await db.query('select content from tasks')).rows[0].content,'Edited after import');
 await owner(b);
 assert.equal((await db.query('select * from tasks')).rows.length,0);
 assert.equal((await db.query('select * from planner_items')).rows.length,0);
 await assert.rejects(()=>db.query("insert into planner_items(user_id,kind,id,value) values($1,'goal','forged','\"forged\"')",[a]));
 await assert.rejects(()=>db.query("insert into tasks(user_id,content) values($1,'forged')",[a]));
 await importItems(payload());
 assert.equal((await db.query('select content from tasks')).rows[0].content,'Book');
 await owner(a);
 assert.equal((await db.query('select content from tasks')).rows[0].content,'Edited after import');
});

test('invalid import rolls back all writes and anonymous callers cannot invoke it',async t=>{
 const {db,owner,importItems}=await setup(t);
 const broken=payload();broken.notes[0].pinned='invalid';
 await assert.rejects(()=>importItems(broken));
 assert.equal((await db.query('select * from tasks')).rows.length,0);
 assert.equal((await db.query('select * from planner_items')).rows.length,0);
 for(const value of [null,[],{}, {tasks:null,notes:[],goals:[]}, {tasks:[],notes:[],goals:{}}]) await assert.rejects(()=>importItems(value));
 await assert.rejects(()=>importItems({tasks:[],notes:[],goals:Array(5001).fill('a')}));
 await owner('');await assert.rejects(()=>importItems(payload()));
 await db.exec('reset role;set role anon');await assert.rejects(()=>importItems(payload()));
});
