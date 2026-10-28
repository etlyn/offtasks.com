import test from "node:test";
import assert from "node:assert/strict";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "../integrations/codex/node_modules/jose/dist/webapi/index.js";
import {
  AuthenticationError,
  createSupabaseGrantChecker,
  createTokenVerifier,
} from "../integrations/codex/dist/auth.js";
import { OWNER_A } from "./helpers/codex-database.mjs";
import {
  createCodexOAuthProviderFixture,
  OAUTH_CLIENT,
  OAUTH_SESSION,
  OAUTH_RESOURCE,
} from "./helpers/codex-oauth-provider.mjs";

// Real app hook + checker SQL and cryptographically signed verifier boundary.
// Auth issuance/storage is a disposable source-contract fixture, NOT a real
// provider, authorization-code/PKCE exchange, or hosted OAuth acceptance.
test("local consent → SQL hook → signed token → fresh SQL checker rejects revocation and old epochs", async (t) => {
  const f = await createCodexOAuthProviderFixture(t, { seedGrant: false });
  const issuer = "https://auth.example/auth/v1";
  let request = 0;
  const rpc = async (name, values) =>
    (
      await f.db.query(
        `select public.${name}(${values
          .map((_, index) => "$" + (index + 1))
          .join(",")}) result`,
        values
      )
    ).rows[0].result;
  const consent = async (revision = null) => {
    await f.owner(OWNER_A);
    return rpc("offtask_oauth_set_consent", [
      OAUTH_CLIENT,
      ["read", "write"],
      revision,
      "0123456789abcdefghijklmnopqrstuv",
      `workflow-consent-${++request}`,
    ]);
  };
  const issue = async () => {
    const now = Math.floor(Date.now() / 1000);
    await f.db.exec("reset role;set role supabase_auth_admin");
    try {
      const result = await rpc("offtask_mcp_access_token_hook", [
        JSON.stringify({
          user_id: OWNER_A,
          authentication_method: "oauth_provider/authorization_code",
          claims: {
            sub: OWNER_A,
            client_id: OAUTH_CLIENT,
            session_id: OAUTH_SESSION,
            iss: issuer,
            aud: "authenticated",
            role: "authenticated",
            iat: now,
            exp: now + 300,
            email: "",
            phone: "",
            aal: "aal1",
            is_anonymous: false,
          },
        }),
      ]);
      return result.claims;
    } finally {
      await f.owner("", "service_role");
    }
  };
  await consent();
  await f.owner("", "service_role");
  assert.equal((await f.check(f.input({ grant_revision: "1" }))).active, false);
  const claims = await issue();
  assert.equal(claims.offtasks_mcp.grant_revision, "1");
  const pair = await generateKeyPair("ES256");
  const key = createLocalJWKSet({
    keys: [
      {
        ...(await exportJWK(pair.publicKey)),
        kid: "local-workflow",
        alg: "ES256",
      },
    ],
  });
  const sign = (value) =>
    new SignJWT(value)
      .setProtectedHeader({ alg: "ES256", kid: "local-workflow" })
      .sign(pair.privateKey);
  const sent = [];
  const checker = createSupabaseGrantChecker(
    {
      supabaseUrl: "https://db.example",
      audience: OAUTH_RESOURCE,
      serviceRoleKey: "fixture-internal-only",
    },
    async (_url, init) => {
      const body = JSON.parse(init.body);
      sent.push(body);
      assert.equal(init.headers.Authorization, "Bearer fixture-internal-only");
      await f.owner("", "service_role");
      return Response.json(await f.check(body.input));
    }
  );
  const verify = createTokenVerifier(
    {
      issuer,
      audience: OAUTH_RESOURCE,
      jwksUrl: "https://auth.example/keys",
      allowedClientIds: [OAUTH_CLIENT],
      requiredScopes: [],
    },
    checker,
    key
  );
  const old = await sign(claims);
  assert.equal((await verify(`Bearer ${old}`)).userId, OWNER_A);
  await f.admin(
    "update auth.oauth_consents set revoked_at=now()where user_id=$1",
    [OWNER_A]
  );
  const denied = (error) =>
    error instanceof AuthenticationError && error.status === 401;
  await assert.rejects(verify(`Bearer ${old}`), denied);
  await f.admin(
    "update auth.oauth_consents set revoked_at=null where user_id=$1",
    [OWNER_A]
  );
  await f.owner(OWNER_A);
  const current = await rpc("offtask_oauth_consent_details", [OAUTH_CLIENT]);
  const gone = await rpc("offtask_oauth_revoke_consent", [
    OAUTH_CLIENT,
    current.grant.revision,
    "workflow-revoke-request",
  ]);
  await assert.rejects(verify(`Bearer ${old}`), denied);
  await consent(gone.grant.revision);
  const renewedClaims = await issue();
  assert.notEqual(
    renewedClaims.offtasks_mcp.grant_revision,
    claims.offtasks_mcp.grant_revision
  );
  const renewed = await sign(renewedClaims);
  await assert.rejects(verify(`Bearer ${old}`), denied);
  assert.equal((await verify(`Bearer ${renewed}`)).userId, OWNER_A);
  assert.equal(JSON.stringify(sent).includes(old), false);
  assert.equal(JSON.stringify(sent).includes(renewed), false);
  await f.admin("delete from auth.sessions where id=$1", [OAUTH_SESSION]);
  await assert.rejects(verify(`Bearer ${renewed}`), denied);
});
