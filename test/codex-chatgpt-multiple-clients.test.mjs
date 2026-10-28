import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { OWNER_A as A, OWNER_B as B } from "./helpers/codex-database.mjs";
import { createCodexOAuthProviderFixture, OAUTH_CLIENT as DEV, OAUTH_RESOURCE as RESOURCE } from "./helpers/codex-oauth-provider.mjs";

const PUBLIC = "66666666-6666-4666-8666-666666666666";
const SESSION_A = "77777777-7777-4777-8777-777777777777";
const SESSION_B = "88888888-8888-4888-8888-888888888888";

async function setup(t) {
  const f = await createCodexOAuthProviderFixture(t);
  await f.db.exec("reset role");
  for (const name of ["20261028020000_chatgpt_connection_status.sql", "20261028050000_chatgpt_multiple_clients.sql"]) {
    await f.db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
  }
  await f.owner("", "service_role");
  await f.admin("update public.offtask_oauth_clients set host_kind='chatgpt' where client_id=$1", [DEV]);
  const status = async () => (await f.db.query("select public.offtask_chatgpt_status() result")).rows[0].result;
  const revoke = async (owner, revision, key = "chatgpt-disconnect-test") =>
    (await f.db.query("select public.offtask_chatgpt_revoke($1,$2,$3) result", [owner, revision, key])).rows[0].result;
  const addPublic = async ({ enabled = true, listing = null } = {}) => {
    await f.admin("insert into auth.oauth_clients(id) values($1)", [PUBLIC]);
    await f.admin("insert into auth.sessions(id,user_id,oauth_client_id) values($1,$2,$3),($4,$5,$3)", [SESSION_A, A, PUBLIC, SESSION_B, B]);
    await f.admin("insert into auth.oauth_consents(user_id,client_id,scopes) values($1,$3,'openid'),($2,$3,'openid')", [A, B, PUBLIC]);
    await f.admin("insert into public.offtask_oauth_clients(client_id,client_name,resource,allowed_permissions,enabled,host_kind,install_url) values($1,'Public', $2, $3, $4,'chatgpt',$5)", [PUBLIC, RESOURCE, ["read", "write"], enabled, listing]);
  };
  const grant = async (owner, client = PUBLIC, permissions = ["read"]) =>
    f.admin("insert into public.offtask_oauth_grants(user_id,client_id,resource,permissions,active,grant_epoch) values($1,$2,$3,$4,true,7)", [owner, client, RESOURCE, permissions]);
  return { ...f, status, revoke, addPublic, grant };
}

test("the existing private grant remains visible and the decimal revision works with installed clients", async (t) => {
  const f = await setup(t);
  await f.owner(A);
  const before = await f.status();
  assert.equal(before.status, "authorized");
  assert.deepEqual(before.permissions, ["read", "write"]);
  assert.match(before.revision, /^\d{1,78}$/);
  await f.addPublic({ enabled: false });
  await f.owner(A);
  const after = await f.status();
  assert.equal(after.status, "authorized");
  assert.notEqual(after.revision, before.revision);
  assert.equal(after.install_url, undefined);
});

test("disconnect revokes both ChatGPT grants only for the owner and is retry-safe", async (t) => {
  const f = await setup(t);
  await f.addPublic({ listing: "https://chatgpt.com/plugins/offtasks" });
  await f.grant(A, PUBLIC, ["read"]);
  await f.grant(B, PUBLIC, ["read", "write"]);
  await f.owner(A);
  const current = await f.status();
  assert.equal(current.status, "authorized");
  assert.deepEqual(current.permissions, ["read", "write"]);
  assert.equal(current.install_url, "https://chatgpt.com/plugins/offtasks");
  await assert.rejects(() => f.revoke(B, current.revision), /account changed/);
  const result = await f.revoke(A, current.revision);
  assert.deepEqual(result, { disconnected: true });
  const epochs = (await f.admin("select client_id,grant_epoch from public.offtask_oauth_grants where user_id=$1 order by client_id", [A])).rows;
  await f.owner(A);
  assert.deepEqual(await f.revoke(A, current.revision), result);
  assert.deepEqual((await f.admin("select client_id,grant_epoch from public.offtask_oauth_grants where user_id=$1 order by client_id", [A])).rows, epochs);
  await f.owner(A);
  await assert.rejects(() => f.revoke(A, "1"), /request_key_conflict/);
  assert.equal((await f.status()).status, "disconnected");
  const rows = (await f.admin("select user_id,client_id,active from public.offtask_oauth_grants order by user_id,client_id")).rows;
  assert.equal(rows.filter((row) => row.user_id === A && row.active).length, 0);
  assert.equal(rows.filter((row) => row.user_id === B && row.active).length, 1);
  await f.owner(B);
  assert.equal((await f.status()).status, "authorized");
});

test("a per-client retry-key conflict rolls back the entire multi-client disconnect", async (t) => {
  const f = await setup(t);
  await f.addPublic();
  await f.grant(A);
  await f.owner(A);
  await f.db.query("select public.offtask_oauth_revoke_consent($1,$2,$3)", [PUBLIC, "1", "reused-conflicting-key"]);
  await f.admin("update public.offtask_oauth_grants set active=true,permissions=$3 where user_id=$1 and client_id=$2", [A, PUBLIC, ["read"]]);
  await f.owner(A);
  const current = await f.status();
  await assert.rejects(() => f.revoke(A, current.revision, "reused-conflicting-key"), /request_key_conflict/);
  const rows = (await f.admin("select active from public.offtask_oauth_grants where user_id=$1", [A])).rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.active));
});

test("a previously issued single-client revision cannot revoke a different connection", async (t) => {
  const f = await setup(t);
  await f.addPublic();
  await f.grant(A);
  await f.owner(A);
  await assert.rejects(() => f.revoke(A, "1", "legacy-client-key"), /revision_conflict/);
  const rows = (await f.admin("select active from public.offtask_oauth_grants where user_id=$1", [A])).rows;
  assert.ok(rows.every((row) => row.active));
});

test("a new or changed grant invalidates an old confirmation without revoking anything", async (t) => {
  const f = await setup(t);
  await f.addPublic();
  await f.owner(A);
  const before = await f.status();
  await f.grant(A);
  await f.owner(A);
  await assert.rejects(() => f.revoke(A, before.revision), /revision_conflict/);
  const rows = (await f.admin("select active from public.offtask_oauth_grants where user_id=$1", [A])).rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.active));
});

test("disabled clients with latent grants can be disconnected and a single public listing is enforced", async (t) => {
  const f = await setup(t);
  await f.addPublic({ listing: "https://chatgpt.com/plugins/offtasks" });
  await f.grant(A);
  await assert.rejects(() => f.admin("update public.offtask_oauth_clients set install_url='https://chatgpt.com/plugins/another' where client_id=$1", [DEV]), /unique|duplicate/i);
  await f.admin("update public.offtask_oauth_clients set enabled=false where host_kind='chatgpt'");
  await f.owner(A);
  const current = await f.status();
  assert.equal(current.status, "reconnect");
  assert.equal(current.install_url, undefined);
  await f.revoke(A, current.revision);
  const rows = (await f.admin("select active from public.offtask_oauth_grants where user_id=$1", [A])).rows;
  assert.ok(rows.every((row) => !row.active));
});

test("disconnect also cancels pending authorization and invalidates its old confirmation", async (t) => {
  const f = await setup(t);
  await f.addPublic();
  await f.owner(A);
  const before = await f.status();
  await f.db.query("select public.offtask_oauth_set_consent($1,$2,$3,$4,$5)",
    [PUBLIC, ["read"], null, "A".repeat(32), "pending-consent-test"]);
  await assert.rejects(() => f.revoke(A, before.revision), /revision_conflict/);
  const current = await f.status();
  await f.revoke(A, current.revision);
  const rows = (await f.admin("select active,pending_permissions,pending_authorization_id from public.offtask_oauth_grants where user_id=$1", [A])).rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => !row.active && row.pending_permissions === null && row.pending_authorization_id === null));
});

test("a pending-only authorization can be found and canceled", async (t) => {
  const f = await setup(t);
  await f.addPublic();
  await f.admin("update public.offtask_oauth_grants set active=false,permissions='{}' where user_id=$1 and client_id=$2", [A, DEV]);
  await f.owner(A);
  await f.db.query("select public.offtask_oauth_set_consent($1,$2,$3,$4,$5)",
    [PUBLIC, ["read"], null, "B".repeat(32), "pending-only-test"]);
  const current = await f.status();
  assert.equal(current.status, "reconnect");
  assert.match(current.revision, /^\d{1,78}$/);
  await f.revoke(A, current.revision);
  assert.equal((await f.status()).status, "disconnected");
});

test("the snapshot helper is not callable by ordinary accounts and provider drift fails closed", async (t) => {
  const f = await setup(t);
  await f.owner(A);
  await assert.rejects(() => f.db.query("select public.offtask_chatgpt_snapshot($1)", [B]), /permission denied/i);
  await f.admin("alter table auth.sessions drop column not_after");
  await f.owner(A);
  await assert.rejects(() => f.status(), { code: "55000" });
});
