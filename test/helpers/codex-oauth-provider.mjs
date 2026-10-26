// Disposable TEST-ONLY provider-contract fixture, not a hosted Auth server.
import {readFile} from 'node:fs/promises';
import {createCodexDatabaseFixture,OWNER_A as A,OWNER_B as B} from './codex-database.mjs';

export const OAUTH_CLIENT='33333333-3333-4333-8333-333333333333';
export const OAUTH_SESSION='44444444-4444-4444-8444-444444444444';
export const OAUTH_FOREIGN_SESSION='55555555-5555-4555-8555-555555555555';
export const OAUTH_RESOURCE='https://mcp.offtasks.example/mcp';

export async function createCodexOAuthProviderFixture(t,{provider=true,seedGrant=true}={}){
 const fixture=await createCodexDatabaseFixture(t);const{db,owner}=fixture;
 await db.exec('reset role;create role supabase_auth_admin');
 if(provider)await db.exec(`
  -- Required columns from the pinned official Auth source. No production
  -- migration creates or alters these provider-owned auth tables.
  alter table auth.users add column deleted_at timestamptz,add column banned_until timestamptz;
  create table auth.oauth_clients(id uuid primary key,deleted_at timestamptz);
  create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users(id),oauth_client_id uuid references auth.oauth_clients(id),not_after timestamptz,created_at timestamptz not null default now(),refreshed_at timestamptz);
  create table auth.oauth_consents(user_id uuid not null references auth.users(id),client_id uuid not null references auth.oauth_clients(id),scopes text not null,granted_at timestamptz not null default now(),revoked_at timestamptz,primary key(user_id,client_id));
  insert into auth.oauth_clients(id)values('${OAUTH_CLIENT}');
  insert into auth.sessions(id,user_id,oauth_client_id)values('${OAUTH_SESSION}','${A}','${OAUTH_CLIENT}'),('${OAUTH_FOREIGN_SESSION}','${B}','${OAUTH_CLIENT}');
  insert into auth.oauth_consents(user_id,client_id,scopes)values('${A}','${OAUTH_CLIENT}','openid'),('${B}','${OAUTH_CLIENT}','openid');
 `);
 for(const file of ['20261026010000_codex_oauth_policy.sql','20261026020000_codex_oauth_grant_checker.sql'])
  await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.query('insert into public.offtask_oauth_clients(client_id,client_name,resource,allowed_permissions,enabled)values($1,$2,$3,$4,true)',[OAUTH_CLIENT,'Private test host',OAUTH_RESOURCE,['read','write']]);
 if(seedGrant)await db.query('insert into public.offtask_oauth_grants(user_id,client_id,resource,permissions,active,grant_epoch)values($1,$2,$3,$4,true,7)',[A,OAUTH_CLIENT,OAUTH_RESOURCE,['read','write']]);
 await owner('','service_role');
 const input=(patch={})=>({subject:A,client_id:OAUTH_CLIENT,session_id:OAUTH_SESSION,resource:OAUTH_RESOURCE,issued_at:Math.floor(Date.now()/1000)-10,expires_at:Math.floor(Date.now()/1000)+300,permissions:['read','write'],grant_revision:'7',...patch});
 const check=async(value=input())=>(await db.query('select public.offtask_oauth_check_grant($1::jsonb) result',[JSON.stringify(value)])).rows[0].result;
 const admin=async(sql,args=[])=>{await db.exec('reset role');try{return await db.query(sql,args);}finally{await owner('','service_role');}};
 return{...fixture,input,check,admin};
}
