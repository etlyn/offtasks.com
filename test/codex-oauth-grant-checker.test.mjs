import test from 'node:test';
import assert from 'node:assert/strict';
import {OWNER_A as A,OWNER_B as B} from './helpers/codex-database.mjs';
import {createCodexOAuthProviderFixture as setup,OAUTH_CLIENT as CLIENT,OAUTH_SESSION as SESSION,OAUTH_FOREIGN_SESSION as FOREIGN_SESSION,OAUTH_RESOURCE as RESOURCE} from './helpers/codex-oauth-provider.mjs';

const INACTIVE={active:false};

test('current provider session/consent and app epoch authorize only the verified owner/client',async t=>{
 const{check,input}=await setup(t);
 assert.deepEqual(await check(),{active:true,subject:A,client_id:CLIENT,session_id:SESSION,permissions:['read','write']});
 assert.equal((await check(input({permissions:['read']}))).active,true);
 assert.deepEqual(await check(input({subject:B})),INACTIVE);
 assert.deepEqual(await check(input({session_id:FOREIGN_SESSION})),INACTIVE);
 assert.deepEqual(await check(input({client_id:'66666666-6666-4666-8666-666666666666'})),INACTIVE);
 assert.deepEqual(await check(input({resource:'https://another.example/mcp'})),INACTIVE);
});

test('deleted sessions, changed session client/owner and concrete not_after deny access',async t=>{
 const{check,admin}=await setup(t);
 for(const[change,restore]of[
  [`update auth.sessions set user_id='${B}'where id='${SESSION}'`,`update auth.sessions set user_id='${A}'where id='${SESSION}'`],
  [`update auth.sessions set oauth_client_id=null where id='${SESSION}'`,`update auth.sessions set oauth_client_id='${CLIENT}'where id='${SESSION}'`],
  [`update auth.sessions set not_after=now()-interval'1 second'where id='${SESSION}'`,`update auth.sessions set not_after=null where id='${SESSION}'`],
 ]){await admin(change);assert.deepEqual(await check(),INACTIVE);await admin(restore);assert.equal((await check()).active,true);}
 await admin('delete from auth.sessions where id=$1',[SESSION]);assert.deepEqual(await check(),INACTIVE);
});

test('provider consent revocation, banned/deleted user and deleted client fail closed',async t=>{
 const{check,admin}=await setup(t);
 for(const[change,restore]of[
  [`update auth.oauth_consents set revoked_at=now()where user_id='${A}'`,`update auth.oauth_consents set revoked_at=null where user_id='${A}'`],
  [`update auth.users set banned_until=now()+interval'1 hour'where id='${A}'`,`update auth.users set banned_until=null where id='${A}'`],
  [`update auth.users set deleted_at=now()where id='${A}'`,`update auth.users set deleted_at=null where id='${A}'`],
  [`update auth.oauth_clients set deleted_at=now()where id='${CLIENT}'`,`update auth.oauth_clients set deleted_at=null where id='${CLIENT}'`],
 ]){await admin(change);assert.deepEqual(await check(),INACTIVE);await admin(restore);assert.equal((await check()).active,true);}
 await admin('delete from auth.oauth_consents where user_id=$1',[A]);assert.deepEqual(await check(),INACTIVE);
});

test('current app permissions/policy and grant epoch reject stale or pending authorization',async t=>{
 const{check,input,admin}=await setup(t);
 await admin('update public.offtask_oauth_grants set grant_epoch=8 where user_id=$1',[A]);
 assert.deepEqual(await check(),INACTIVE);assert.equal((await check(input({grant_revision:'8'}))).active,true);
 await admin("update public.offtask_oauth_grants set permissions=array['read']where user_id=$1",[A]);
 assert.deepEqual(await check(input({grant_revision:'8'})),INACTIVE);
 assert.deepEqual((await check(input({grant_revision:'8',permissions:['read']}))).permissions,['read']);
 await admin("update public.offtask_oauth_clients set allowed_permissions=array['read']where client_id=$1",[CLIENT]);
 await admin("update public.offtask_oauth_grants set permissions=array['read','write']where user_id=$1",[A]);
 assert.deepEqual(await check(input({grant_revision:'8',permissions:['read']})),INACTIVE);
 await admin("update public.offtask_oauth_clients set allowed_permissions=array['read','write'],enabled=false where client_id=$1",[CLIENT]);
 assert.deepEqual(await check(input({grant_revision:'8'})),INACTIVE);
 await admin('update public.offtask_oauth_clients set enabled=true where client_id=$1',[CLIENT]);
 await admin("update public.offtask_oauth_grants set active=false,permissions='{}',pending_permissions=array['read','write'],pending_expires_at=now()+interval'10 minutes'where user_id=$1",[A]);
 assert.deepEqual(await check(input({grant_revision:'8'})),INACTIVE);
});

test('malformed identities, revision, permission and token-time inputs never authorize',async t=>{
 const{check,input}=await setup(t);const now=Math.floor(Date.now()/1000);
 for(const patch of[
  {subject:'not-a-uuid'},{session_id:null},{client_id:42},{resource:RESOURCE+'?other=1'},
  {grant_revision:7},{grant_revision:'07'},{grant_revision:'8'},{grant_revision:null},
  {permissions:[]},{permissions:['write']},{permissions:['read','read']},{permissions:['read','admin']},{permissions:[{}]},
  {issued_at:now+120},{issued_at:'1234'},{issued_at:-1},{expires_at:now-1},{expires_at:1e100},
 ])assert.deepEqual(await check(input(patch)),INACTIVE,JSON.stringify(patch));
 for(const value of[null,[],{},input({oversized:'x'.repeat(17000)})])assert.deepEqual(await check(value),INACTIVE);
});

test('ordinary roles cannot inspect sessions, even with a forged service JWT role',async t=>{
 const{db,owner,check,admin}=await setup(t);
 for(const role of['anon','authenticated','supabase_auth_admin']){
  await db.exec('set role '+role);
  await db.query("select set_config('request.jwt.claim.role','service_role',false)");
  await assert.rejects(()=>check(),{code:'42501'});
 }
 // Defense in depth: the function body still rejects a spoofed JWT role even
 // if an operator accidentally grants it execution to an ordinary account.
 await admin('grant execute on function public.offtask_oauth_check_grant(jsonb)to authenticated');
 await owner(A);await db.query("select set_config('request.jwt.claim.role','service_role',false)");
 await assert.rejects(()=>check(),/forbidden/);
});

test('migration installs without provider tables and reports unsupported contracts instead of fabricating active state',async t=>{
 const{db,check}=await setup(t,{provider:false});
 await assert.rejects(()=>check(),{code:'55000'});
 const tables=(await db.query("select tablename from pg_catalog.pg_tables where schemaname='auth'order by tablename")).rows.map(row=>row.tablename);
 assert.deepEqual(tables,['users']);
});

test('required provider-column removal or type drift reports unavailable',async t=>{
 const{check,admin}=await setup(t);
 await admin('alter table auth.sessions drop column not_after');
 await assert.rejects(()=>check(),{code:'55000'});
 await admin('alter table auth.sessions add column not_after text');
 await assert.rejects(()=>check(),{code:'55000'});
});
