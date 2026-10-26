import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import{createCodexDatabaseFixture,OWNER_A as A,OWNER_B as B}from'./helpers/codex-database.mjs';
const C='33333333-3333-4333-8333-333333333333',OTHER='44444444-4444-4444-8444-444444444444',AUTH='55555555-5555-4555-8555-555555555555';
const resource='https://mcp.example.test/mcp';
async function setup(t){
 const f=await createCodexDatabaseFixture(t),{db,owner}=f;
 await db.exec('reset role;create role supabase_auth_admin');
 await db.exec(await readFile(new URL('../supabase/migrations/20261026010000_codex_oauth_policy.sql',import.meta.url),'utf8'));
 await db.query('insert into offtask_oauth_clients(client_id,client_name,resource,allowed_permissions,enabled)values($1,$2,$3,$4,true)',[C,'Private MCP',resource,['read','write']]);
 await owner(A);let key=0;
 const details=async(client=C)=>(await db.query('select offtask_oauth_consent_details($1::uuid) result',[client])).rows[0].result;
 const save=async(perms=['read'],revision=null,requestKey=`consent-request-${++key}`)=>(await db.query('select offtask_oauth_set_consent($1::uuid,$2::text[],$3,$4::uuid,$5) result',[C,perms,revision,AUTH,requestKey])).rows[0].result;
 const revoke=async(revision,key=`revoke-request-${++key}`)=>(await db.query('select offtask_oauth_revoke_consent($1::uuid,$2,$3) result',[C,revision,key])).rows[0].result;
 const event=(method='oauth_provider/authorization_code',client=C)=>({user_id:A,authentication_method:method,claims:{sub:A,client_id:client,aud:'authenticated',role:'authenticated',session_id:'66666666-6666-4666-8666-666666666666',iat:1793000000,exp:1793003600,iss:'https://example.supabase.co/auth/v1',email:'test@example.test',phone:'',aal:'aal1',is_anonymous:false,user_metadata:{offtasks_mcp:{permissions:['read','write']}}}});
 const hook=async(input=event())=>{await db.exec('reset role;set role supabase_auth_admin');try{return(await db.query('select offtask_mcp_access_token_hook($1::jsonb) result',[JSON.stringify(input)])).rows[0].result;}finally{await owner(A);}};
 return{...f,details,save,revoke,event,hook};
}
test('consent is first-party, owner-scoped, CAS/idempotent and pending until trusted token issuance',async t=>{
 const{db,owner,details,save,hook,event}=await setup(t);
 assert.equal((await details()).grant,null);
 const first=await save(['read'],null,'stable-consent-key');assert.equal(first.grant.active,false);assert.deepEqual(first.grant.permissions,[]);assert.deepEqual(first.grant.pending_permissions,['read']);
 assert.deepEqual(await save(['read'],null,'stable-consent-key'),first);
 await assert.rejects(()=>save(['read','write'],null,'stable-consent-key'),/request_key_conflict/);
 await assert.rejects(()=>save(['read','write'],'0'),/revision_conflict/);
 await assert.rejects(()=>db.query('update offtask_oauth_grants set active=true'),/permission denied/);
 await assert.rejects(()=>db.query('select offtask_mcp_access_token_hook($1::jsonb)',[JSON.stringify(event())]),/permission denied/);
 await owner(B);assert.equal((await details()).grant,null);await owner(A);
 await assert.rejects(()=>hook(event('token_refresh')),/active consent required/);
 const token=await hook();assert.equal(token.claims.aud,resource);assert.deepEqual(token.claims.offtasks_mcp.permissions,['read']);assert.equal(token.claims.offtasks_mcp.grant_revision,'1');assert.equal(token.claims.sub,A);assert.equal(token.claims.role,'authenticated');
 assert.equal((await details()).grant.active,true);
});
test('refresh cannot activate pending elevation; revoke/regrant changes signed grant epoch',async t=>{
 const{details,save,revoke,hook,event}=await setup(t);
 await save();const initial=await hook();let g=(await details()).grant;
 await save(['read','write'],g.revision);
 const refresh=await hook(event('token_refresh'));assert.deepEqual(refresh.claims.offtasks_mcp.permissions,['read']);assert.equal(refresh.claims.offtasks_mcp.grant_revision,initial.claims.offtasks_mcp.grant_revision);
 const elevated=await hook();assert.deepEqual(elevated.claims.offtasks_mcp.permissions,['read','write']);assert.notEqual(elevated.claims.offtasks_mcp.grant_revision,initial.claims.offtasks_mcp.grant_revision);
 g=(await details()).grant;const gone=await revoke(g.revision,'stable-revoke-key');assert.equal(gone.grant.active,false);assert.deepEqual(gone.grant.permissions,[]);
 assert.deepEqual(await revoke(g.revision,'stable-revoke-key'),gone);await assert.rejects(()=>hook(event('token_refresh')),/active consent required/);
 await save(['read'],gone.grant.revision);const regrant=await hook();assert.notEqual(regrant.claims.offtasks_mcp.grant_revision,elevated.claims.offtasks_mcp.grant_revision);
});
test('ordinary/other clients remain unchanged and user metadata cannot grant access',async t=>{
 const{db,owner,save,details,hook,event}=await setup(t);
 const ordinary=event('password');delete ordinary.claims.client_id;assert.deepEqual(await hook(ordinary),{claims:ordinary.claims});
 const unrelated=event('oauth_provider/authorization_code',OTHER);assert.deepEqual(await hook(unrelated),{claims:unrelated.claims});
 await assert.rejects(()=>hook(event()),/explicit consent required/);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({client_id:C})]);await assert.rejects(()=>details(),/first-party session/);await assert.rejects(()=>save(),/first-party session/);
 await db.query("select set_config('request.jwt.claims','{}',false)");
 await assert.rejects(()=>save(['write']),/validation_failed/);await assert.rejects(()=>save(['read','delete']),/validation_failed/);
 await db.exec('reset role');await db.query("update offtask_oauth_clients set allowed_permissions=array['read']where client_id=$1",[C]);await owner(A);
 await assert.rejects(()=>save(['read','write']),/exceed client policy/);
 await db.exec('reset role');await db.query('update offtask_oauth_clients set enabled=false where client_id=$1',[C]);await owner(A);await assert.rejects(()=>details(),/not enabled/);
 const disabled=event();assert.deepEqual(await hook(disabled),{claims:disabled.claims});
});
test('expired pending intent and mismatched identities never issue MCP claims',async t=>{
 const{db,owner,save,hook,event}=await setup(t);await save();
 await db.exec('reset role');await db.query("update offtask_oauth_grants set pending_expires_at=now()-interval'1 minute'where user_id=$1",[A]);await owner(A);
 await assert.rejects(()=>hook(),/active consent required/);
 const mismatched=event();mismatched.claims.sub=B;await assert.rejects(()=>hook(mismatched),/token principal/);
});

test('denying the matching pending request cannot revoke active access or undo completed token issuance',async t=>{
 const{db,details,save,hook,event}=await setup(t);await save();const active=await hook();let g=(await details()).grant;
 const pending=await save(['read','write'],g.revision);assert.equal(pending.grant.pending_authorization_id,AUTH);
 const cancel=async(rev,authID=AUTH,key='cancel-pending-key')=>(await db.query('select offtask_oauth_cancel_pending($1::uuid,$2::uuid,$3,$4) result',[C,authID,rev,key])).rows[0].result;
 await assert.rejects(()=>cancel(pending.grant.revision,OTHER,'wrong-auth-key'),/pending authorization changed/);
 const cancelled=await cancel(pending.grant.revision);assert.equal(cancelled.grant.active,true);assert.deepEqual(cancelled.grant.permissions,['read']);assert.equal(cancelled.grant.pending_authorization_id,null);assert.equal(cancelled.grant.grant_revision,active.claims.offtasks_mcp.grant_revision);
 assert.deepEqual(await cancel(pending.grant.revision),cancelled);
 assert.deepEqual((await hook(event('token_refresh'))).claims.offtasks_mcp.permissions,['read']);
 const next=await save(['read','write'],cancelled.grant.revision);const issued=await hook();await assert.rejects(()=>cancel(next.grant.revision,AUTH,'too-late-cancel'),/revision_conflict/);
 g=(await details()).grant;assert.equal(g.active,true);assert.equal(g.grant_revision,issued.claims.offtasks_mcp.grant_revision);assert.deepEqual(g.permissions,['read','write']);
});

test('app-only deletion removes user access grants but retains client policy and shared identity',async t=>{
 const{db,owner,save,hook}=await setup(t);await save();await hook();await owner(B);await save();
 await db.exec('reset role;alter role service_role bypassrls;grant select,delete on public.tasks,public.planner_items to service_role');await owner('', 'service_role');
 const source=await readFile(new URL('../supabase/functions/delete-account/delete-account.ts',import.meta.url),'utf8');
 const list=source.match(/export const cleanupTargets: CleanupTarget\[\] = \[([\s\S]*?)\];/)[1];
 const tables=[...list.matchAll(/table: "([a-z_]+)"/g)].map(match=>match[1]);assert.equal(tables[0],'offtask_oauth_grants');
 for(const table of tables)if((await db.query('select to_regclass($1) id',['public.'+table])).rows[0].id!==null)await db.query(`delete from public.${table} where user_id=$1`,[A]);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int count from offtask_oauth_grants where user_id=$1',[A])).rows[0].count,0);assert.equal((await db.query('select count(*)::int count from offtask_oauth_grants where user_id=$1',[B])).rows[0].count,1);
 assert.equal((await db.query('select count(*)::int count from offtask_oauth_clients')).rows[0].count,1);assert.equal((await db.query('select count(*)::int count from auth.users')).rows[0].count,2);
});
