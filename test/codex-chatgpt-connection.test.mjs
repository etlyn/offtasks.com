import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { OWNER_A as A, OWNER_B as B } from "./helpers/codex-database.mjs";
import {
  createCodexOAuthProviderFixture,
  OAUTH_CLIENT as CLIENT,
} from "./helpers/codex-oauth-provider.mjs";

async function setup(t, options) {
  const f = await createCodexOAuthProviderFixture(t, options);
  await f.db.exec("reset role");
  await f.db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261028020000_chatgpt_connection_status.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  await f.owner("", "service_role");
  const status = async () =>
    (await f.db.query("select public.offtask_chatgpt_status() result")).rows[0]
      .result;
  const revoke = async (owner, revision, key = "chatgpt-revoke-test") =>
    (
      await f.db.query(
        "select public.offtask_chatgpt_revoke($1,$2,$3) result",
        [owner, revision, key]
      )
    ).rows[0].result;
  return { ...f, status, revoke };
}

test("other OAuth clients never appear as ChatGPT and a new client must be configured explicitly", async (t) => {
  const f = await setup(t);
  await f.owner(A);
  assert.deepEqual(await f.status(), { status: "unavailable" });
  await f.admin(
    "update public.offtask_oauth_clients set host_kind='chatgpt',install_url='https://chatgpt.com/plugins/offtasks' where client_id=$1",
    [CLIENT]
  );
  await f.owner(A);
  const current = await f.status();
  assert.equal(current.status, "authorized");
  assert.deepEqual(current.permissions, ["read", "write"]);
  assert.equal(current.install_url, "https://chatgpt.com/plugins/offtasks");
  assert.ok(current.revision);
  await f.owner(B);
  assert.deepEqual(await f.status(), {
    status: "disconnected",
    install_url: "https://chatgpt.com/plugins/offtasks",
  });
});

test("revoke is owner-bound, revision-checked and independent of another user", async (t) => {
  const f = await setup(t);
  await f.admin(
    "update public.offtask_oauth_clients set host_kind='chatgpt' where client_id=$1",
    [CLIENT]
  );
  await f.admin(
    "insert into public.offtask_oauth_grants(user_id,client_id,resource,permissions,active,grant_epoch) select $1,client_id,resource,permissions,active,grant_epoch from public.offtask_oauth_grants where user_id=$2",
    [B, A]
  );
  await f.owner(A);
  const current = await f.status();
  await assert.rejects(() => f.revoke(B, current.revision), /account changed/);
  await assert.rejects(() => f.revoke(A, "999"), /revision_conflict/);
  await f.revoke(A, current.revision);
  assert.equal((await f.status()).status, "disconnected");
  await f.owner(B);
  assert.equal((await f.status()).status, "authorized");
});

test("provider revocation and missing provider schema fail closed", async (t) => {
  const f = await setup(t);
  await f.admin(
    "update public.offtask_oauth_clients set host_kind='chatgpt' where client_id=$1",
    [CLIENT]
  );
  await f.admin(
    "update auth.oauth_consents set revoked_at=now() where user_id=$1",
    [A]
  );
  await f.owner(A);
  assert.equal((await f.status()).status, "reconnect");
  await f.admin("alter table auth.sessions drop column not_after");
  await f.owner(A);
  await assert.rejects(() => f.status(), { code: "55000" });
});
