import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {writeFile,unlink} from 'node:fs/promises';
const path=new URL(`../node_modules/.google-auth-${process.pid}.mjs`,import.meta.url);
const bundle=await build({entryPoints:['src/lib/googleAuth.ts'],bundle:true,write:false,platform:'node',format:'esm'});
await writeFile(path,bundle.outputFiles[0].text);
const {createOfftasksGoogleAuth,isManagedSignInCallback}=await import(path.href);
test.after(()=>unlink(path));

function fixture() {
 const values=new Map(), calls=[], scrubbed=[];
 const client={auth:{
  async signInWithOAuth(value){calls.push(value);return {error:null};},
  async exchangeCodeForSession(code){assert.ok(scrubbed.length);calls.push({code});return {error:null};}
 }};
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const options={client,origin:'https://www.offtasks.com',storage:()=>storage,scrubCallbackUrl:url=>scrubbed.push(url)};
 return {values,calls,client,scrubbed,options,auth:createOfftasksGoogleAuth(options)};
}
test('Google uses the existing exact allowlisted callback and restores tab-local planner selection',async()=>{
 const f=fixture(), id='22222222-2222-4222-8222-222222222222';
 await f.auth.start(`/app?view=goals&goal=${id}`);
 assert.deepEqual(f.calls[0],{provider:'google',options:{redirectTo:'https://www.offtasks.com/app'}});
 const reloaded=createOfftasksGoogleAuth(f.options);
 assert.deepEqual(await reloaded.complete('https://www.offtasks.com/app?code=fixture'),{returnPath:`/app?goal=${id}&view=goals`});
 assert.deepEqual(f.scrubbed,['/app']);assert.equal(f.calls.length,2);assert.equal(f.values.size,0);
});
test('pending first-party consent survives Google login without widening destinations',async()=>{
 const f=fixture(), path='/oauth/consent?authorization_id='+'a'.repeat(32);
 await f.auth.start(path);
 assert.equal((await f.auth.complete('https://www.offtasks.com/app?code=fixture')).returnPath,path);
});
test('external and unsafe return destinations fall back to the planner',async()=>{
 for(const path of ['https://evil.invalid','//evil.invalid','/app?access_token=never','/oauth/consent?authorization_id=invalid']) {
  const f=fixture();await f.auth.start(path);
  assert.equal((await f.auth.complete('https://www.offtasks.com/app?code=fixture')).returnPath,'/app');
 }
});
test('provider cancellation is scrubbed without a session exchange or raw provider details',async()=>{
 const f=fixture();await f.auth.start('/app');
 await assert.rejects(f.auth.complete('https://www.offtasks.com/app?error=access_denied&error_description=never#secret'),/canceled/);
 assert.equal(f.calls.length,1);assert.deepEqual(f.scrubbed,['/app']);assert.equal(f.values.size,0);
});
test('denied browser storage does not block sign-in; expired exchange remains a visible failure',async()=>{
 const f=fixture();f.options.storage=()=>{throw new Error('blocked');};
 const auth=createOfftasksGoogleAuth(f.options);await auth.start('/app');
 f.client.auth.exchangeCodeForSession=async()=>({error:{message:'private detail'}});
 await assert.rejects(auth.complete('https://www.offtasks.com/app?code=fixture'),/invalid or expired/);
});
test('only /app callback parameters disable automatic exchange; recovery keeps its existing handler',()=>{
 for(const query of ['?code=fixture','?error=access_denied'])assert.equal(isManagedSignInCallback(new URL('https://www.offtasks.com/app'+query)),true);
 for(const path of ['/reset-password?code=fixture','/app?view=goals','/login'])assert.equal(isManagedSignInCallback(new URL('https://www.offtasks.com'+path)),false);
});
