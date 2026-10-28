import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCodexDatabaseFixture, OWNER_A as A, OWNER_B as B} from './helpers/codex-database.mjs';

const CLIENT='33333333-3333-4333-8333-333333333333';
const OTHER='44444444-4444-4444-8444-444444444444';
const AUTH='0123456789abcdefghijklmnopqrstuv';
const RESOURCE='https://mcp.example.test/mcp';

async function setup(t){
  const f=await createCodexDatabaseFixture(t);
  const {db,owner}=f;
  await db.exec(`reset role; create role supabase_auth_admin;
    create table auth.oauth_authorizations(
      authorization_id text primary key,user_id uuid,client_id uuid,status text,
      approved_at timestamptz,expires_at timestamptz
    );`);
  for(const name of ['20261026010000_codex_oauth_policy.sql','20261028000000_codex_bind_provider_approval.sql'])
    await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
  await db.query('insert into public.offtask_oauth_clients(client_id,client_name,resource,allowed_permissions,enabled) values($1,$2,$3,$4,true)',[CLIENT,'Private host',RESOURCE,['read','write']]);
  await owner(A);
  const save=async(permissions,revision,key)=>(await db.query('select public.offtask_oauth_set_consent($1::uuid,$2::text[],$3,$4,$5) result',[CLIENT,permissions,revision,AUTH,key])).rows[0].result.grant;
  const admin=async(sql,args=[])=>{await db.exec('reset role');try{return await db.query(sql,args);}finally{await owner(A);}};
  const event={user_id:A,authentication_method:'oauth_provider/authorization_code',claims:{sub:A,client_id:CLIENT,aud:'authenticated',role:'authenticated',is_anonymous:false}};
  const hook=async()=>{await db.exec('reset role;set role supabase_auth_admin');try{return(await db.query('select public.offtask_mcp_access_token_hook($1::jsonb) result',[JSON.stringify(event)])).rows[0].result.claims;}finally{await owner(A);}};
  const details=async()=>(await db.query('select public.offtask_oauth_consent_details($1::uuid) result',[CLIENT])).rows[0].result.grant;
  return {save,admin,hook,details};
}

test('pending permissions require the provider approval for the exact owner and client',async t=>{
  const {save,admin,hook}=await setup(t);
  await save(['read'],null,'approval-binding-1');
  await assert.rejects(hook,/provider approval required/);
  await admin("insert into auth.oauth_authorizations values($1,$2,$3,'pending',null,now()+interval '5 minutes')",[AUTH,A,CLIENT]);
  await assert.rejects(hook,/provider approval required/);
  await admin("update auth.oauth_authorizations set status='approved',approved_at=now(),user_id=$1",[B]);
  await assert.rejects(hook,/provider approval required/);
  await admin('update auth.oauth_authorizations set user_id=$1,client_id=$2',[A,OTHER]);
  await assert.rejects(hook,/provider approval required/);
  await admin("update auth.oauth_authorizations set client_id=$1,expires_at=now()-interval '1 second'",[CLIENT]);
  await assert.rejects(hook,/provider approval required/);
  await admin("update auth.oauth_authorizations set expires_at=now()+interval '5 minutes'");
  assert.deepEqual((await hook()).offtasks_mcp.permissions,['read']);
});

test('unapproved pending elevation preserves an existing read grant',async t=>{
  const {save,admin,hook,details}=await setup(t);
  await save(['read'],null,'approval-binding-2');
  await admin("insert into auth.oauth_authorizations values($1,$2,$3,'approved',now(),now()+interval '5 minutes')",[AUTH,A,CLIENT]);
  const first=await hook();
  const pending=await save(['read','write'],(await details()).revision,'approval-binding-3');
  assert.deepEqual(pending.pending_permissions,['read','write']);
  await admin("update auth.oauth_authorizations set status='pending',approved_at=null");
  const unchanged=await hook();
  assert.deepEqual(unchanged.offtasks_mcp.permissions,['read']);
  assert.equal(unchanged.offtasks_mcp.grant_revision,first.offtasks_mcp.grant_revision);
  await admin("update auth.oauth_authorizations set status='approved',approved_at=now()");
  const elevated=await hook();
  assert.deepEqual(elevated.offtasks_mcp.permissions,['read','write']);
  assert.notEqual(elevated.offtasks_mcp.grant_revision,first.offtasks_mcp.grant_revision);
});
