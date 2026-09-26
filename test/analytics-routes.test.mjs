import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/analytics-routes.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {screenForPath}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('public route aliases have bounded screen names',()=>{
 for(const [path,screen] of [['/','home'],['/support','support'],['/contact','support'],['/privacy-policy','privacy'],['/terms/','terms']])assert.equal(screenForPath(path),screen);
});
test('authentication, reset tokens, private planner and unknown paths never collect',()=>{
 for(const path of ['/app','/app/task/private','/login','/signup','/forgot-password','/reset-password','/auth/callback','/private','/support/customer@example.com','//support','/support?email=secret'])assert.equal(screenForPath(path),null);
});
