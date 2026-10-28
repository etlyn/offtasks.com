import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
} from "jose";
import {
  AuthenticationError,
  createHttpsGrantChecker,
  createSupabaseGrantChecker,
  createTokenVerifier,
  type AuthConfig,
  type GrantCheckInput,
} from "../src/auth.js";
import { loadConfig } from "../src/config.js";

const subject = "11111111-1111-4111-8111-111111111111";
const session = "22222222-2222-4222-8222-222222222222";
const config: AuthConfig = {
  issuer: "https://auth.example/auth/v1",
  audience: "https://mcp.example/mcp",
  jwksUrl: "https://auth.example/auth/v1/.well-known/jwks.json",
  allowedClientIds: ["registered-chatgpt"],
  requiredScopes: [],
};
let privateKey: CryptoKey;
let key: ReturnType<typeof createLocalJWKSet>;
before(async () => {
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  key = createLocalJWKSet({
    keys: [
      {
        ...(await exportJWK(pair.publicKey)),
        kid: "test-key",
        alg: "ES256",
        use: "sig",
      },
    ],
  });
});

async function token(overrides: Record<string, unknown> = {}): Promise<string> {
  return new SignJWT({
    sub: subject,
    client_id: "registered-chatgpt",
    session_id: session,
    iat: Math.floor(Date.now() / 1_000),
    exp: Math.floor(Date.now() / 1_000) + 300,
    iss: config.issuer,
    aud: config.audience,
    offtasks_mcp: {
      resource: config.audience,
      permissions: ["read", "write"],
      grant_revision: "1",
    },
    ...overrides,
  })
    .setProtectedHeader({ alg: "ES256", kid: "test-key", typ: "at+jwt" })
    .sign(privateKey);
}
const active = async (input: GrantCheckInput) => ({
  active: true,
  subject: input.subject,
  client_id: input.client_id,
  session_id: input.session_id,
  permissions: [...input.permissions],
});
const errorIs = (code: string) => (error: unknown) =>
  error instanceof AuthenticationError && error.code === code;

test("valid signed resource token retains only immutable principal fields and rechecks grant each time", async () => {
  let checks = 0;
  const verify = createTokenVerifier(
    config,
    async (input) => {
      checks++;
      assert.equal(input.grant_revision, "1");
      return active(input);
    },
    key
  );
  const signed = await token();
  const principal = await verify(`Bearer ${signed}`);
  assert.deepEqual(principal, {
    userId: subject,
    clientId: "registered-chatgpt",
    sessionId: session,
    permissions: ["read", "write"],
  });
  await verify(`Bearer ${signed}`);
  assert.equal(checks, 2);
  assert.equal(JSON.stringify(principal).includes(signed), false);
});

test("wrong issuer/audience/client, forged, expired and malformed credentials fail before grant checks", async () => {
  let checks = 0;
  const verify = createTokenVerifier(
    config,
    async (input) => {
      checks++;
      return active(input);
    },
    key
  );
  for (const overrides of [
    { iss: "https://attacker.example" },
    { aud: "authenticated" },
    { aud: [config.audience, "authenticated"] },
    { client_id: "unapproved" },
    { azp: "another-client" },
    { exp: 1 },
    { sub: "not-an-owner-uuid" },
    { session_id: "bad" },
  ])
    await assert.rejects(
      verify(`Bearer ${await token(overrides)}`),
      errorIs("invalid_token")
    );
  const signed = await token();
  const parts = signed.split(".");
  await assert.rejects(
    verify(`Bearer ${parts[0]}.${parts[1]}.invalid`),
    errorIs("invalid_token")
  );
  for (const value of [
    undefined,
    "",
    "Basic secret",
    `Bearer ${signed},extra`,
    "Bearer invalid",
  ])
    await assert.rejects(verify(value), errorIs("invalid_token"));
  assert.equal(checks, 0);
});

test("application permissions and actual optional provider scopes are enforced separately", async () => {
  const verify = createTokenVerifier(config, active, key);
  for (const offtasks_mcp of [
    null,
    {},
    { resource: "https://other.example", permissions: ["read"] },
    { resource: config.audience, permissions: ["write"] },
    { resource: config.audience, permissions: ["admin"] },
    { resource: config.audience, permissions: ["read"], grant_revision: "0" },
    { resource: config.audience, permissions: ["read"], grant_revision: 1 },
    { resource: config.audience, permissions: ["read"], grant_revision: "1e3" },
  ]) {
    await assert.rejects(
      verify(`Bearer ${await token({ offtasks_mcp })}`),
      (error: unknown) => error instanceof AuthenticationError
    );
  }
  const scoped = createTokenVerifier(
    { ...config, requiredScopes: ["email"] },
    active,
    key
  );
  await assert.rejects(
    scoped(`Bearer ${await token({ scope: "profile" })}`),
    errorIs("insufficient_scope")
  );
  await scoped(`Bearer ${await token({ scope: "email profile" })}`);
  assert.throws(() =>
    createTokenVerifier({ ...config, audience: "authenticated" }, active, key)
  );
  assert.throws(() =>
    createTokenVerifier(
      { ...config, requiredScopes: ["offtask:read"] },
      active,
      key
    )
  );
});

test("revoked, changed, narrowed, or unavailable grants fail closed", async () => {
  const signed = `Bearer ${await token()}`;
  await assert.rejects(
    createTokenVerifier(
      config,
      async (input) => ({ ...(await active(input)), active: false }),
      key
    )(signed),
    errorIs("invalid_token")
  );
  await assert.rejects(
    createTokenVerifier(
      config,
      async (input) => ({ ...(await active(input)), subject: session }),
      key
    )(signed),
    errorIs("invalid_token")
  );
  await assert.rejects(
    createTokenVerifier(
      config,
      async (input) => ({ ...(await active(input)), permissions: ["read"] }),
      key
    )(signed),
    errorIs("insufficient_scope")
  );
  await assert.rejects(
    createTokenVerifier(
      config,
      async () => {
        throw new Error("private upstream details");
      },
      key
    )(signed),
    errorIs("temporarily_unavailable")
  );
});

test("HTTPS checker sends no user bearer, validates reply, and fails closed on timeout/error", async () => {
  const input: GrantCheckInput = {
    resource: config.audience,
    subject,
    session_id: session,
    client_id: "registered-chatgpt",
    issued_at: 1,
    expires_at: 2,
    permissions: ["read"],
    grant_revision: "1",
  };
  let sent: RequestInit | undefined;
  const checker = createHttpsGrantChecker(
    "https://checker.example/check",
    "internal-checker-secret",
    (async (_url, init) => {
      sent = init;
      return Response.json(await active(input));
    }) as typeof fetch
  );
  assert.equal((await checker(input)).active, true);
  assert.equal(
    (sent?.headers as Record<string, string>).Authorization,
    "Bearer internal-checker-secret"
  );
  assert.deepEqual(JSON.parse(String(sent?.body)), input);
  for (const response of [
    new Response("", { status: 500 }),
    Response.json({ active: true }),
    Response.json(null),
  ]) {
    await assert.rejects(
      createHttpsGrantChecker(
        "https://checker.example/check",
        "secret",
        (async () => response) as typeof fetch
      )(input),
      errorIs("temporarily_unavailable")
    );
  }
  assert.throws(() =>
    createHttpsGrantChecker("http://checker.example", "secret")
  );
});

test("authoritative inactive-only checker response denies with 401 instead of upstream failure", async () => {
  const checker = createHttpsGrantChecker(
    "https://checker.example/check",
    "secret",
    (async () => Response.json({ active: false })) as typeof fetch
  );
  const input: GrantCheckInput = {
    resource: config.audience,
    subject,
    session_id: session,
    client_id: "registered-chatgpt",
    issued_at: 1,
    expires_at: 2,
    permissions: ["read", "write"],
    grant_revision: "1",
  };
  assert.deepEqual(await checker(input), {
    active: false,
    subject,
    client_id: input.client_id,
    session_id: session,
    permissions: [],
  });
  await assert.rejects(
    createTokenVerifier(config, checker, key)(`Bearer ${await token()}`),
    (error: unknown) =>
      error instanceof AuthenticationError &&
      error.status === 401 &&
      error.code === "invalid_token"
  );
  for (const permissions of [[], ["write"], ["administrator"]]) {
    const malformed = createHttpsGrantChecker(
      "https://checker.example/check",
      "secret",
      (async () =>
        Response.json({
          ...(await active(input)),
          permissions,
        })) as typeof fetch
    );
    await assert.rejects(
      createTokenVerifier(config, malformed, key)(`Bearer ${await token()}`),
      errorIs("temporarily_unavailable")
    );
  }
  const narrower = createHttpsGrantChecker(
    "https://checker.example/check",
    "secret",
    (async () =>
      Response.json({
        ...(await active(input)),
        permissions: ["read"],
      })) as typeof fetch
  );
  await assert.rejects(
    createTokenVerifier(config, narrower, key)(`Bearer ${await token()}`),
    errorIs("insufficient_scope")
  );
});

test("grant checker cancels responses over 16KiB before buffering and counts encoded bytes", async () => {
  const input: GrantCheckInput = {
    resource: config.audience,
    subject,
    session_id: session,
    client_id: "registered-chatgpt",
    issued_at: 1,
    expires_at: 2,
    permissions: ["read"],
    grant_revision: "1",
  };
  let cancelled = false;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(16_385));
      },
      cancel() {
        cancelled = true;
      },
    })
  );
  const checker = createHttpsGrantChecker(
    "https://checker.example/check",
    "secret",
    (async () => response) as typeof fetch
  );
  await assert.rejects(checker(input), errorIs("temporarily_unavailable"));
  assert.equal(cancelled, true);
  const multibyte = createHttpsGrantChecker(
    "https://checker.example/check",
    "secret",
    (async () =>
      Response.json({
        active: false,
        padding: "€".repeat(6_000),
      })) as typeof fetch
  );
  await assert.rejects(multibyte(input), errorIs("temporarily_unavailable"));
});

test("disabled is the default and production activation requires explicit secure configuration", () => {
  assert.equal(loadConfig({}).enabled, false);
  assert.throws(() => loadConfig({ OFFTASK_OPENAI_DOMAIN_CHALLENGE: "token\nother" }), /domain challenge/);
  assert.throws(() => loadConfig({ OFFTASK_MCP_ENABLED: "true" }));
  const env = {
    OFFTASK_MCP_ENABLED: "true",
    OFFTASK_MCP_RESOURCE: config.audience,
    OFFTASK_OAUTH_ISSUER: config.issuer,
    OFFTASK_OAUTH_CLIENT_IDS: "registered-chatgpt",
    OFFTASK_SUPABASE_URL: "https://db.example",
    OFFTASK_SUPABASE_SERVICE_ROLE_KEY: "internal-rpc-secret",
    OFFTASK_CURSOR_SECRET: "a".repeat(32),
    OFFTASK_GRANT_CHECK_URL: "https://checker.example/check",
    OFFTASK_GRANT_CHECK_CREDENTIAL: "internal-checker-secret",
  };
  assert.equal(
    loadConfig(env).resourceMetadataUrl,
    "https://mcp.example/.well-known/oauth-protected-resource"
  );
  assert.equal(
    loadConfig({
      ...env,
      OFFTASK_GRANT_CHECK_URL: "",
      OFFTASK_GRANT_CHECK_CREDENTIAL: "",
    }).enabled,
    true
  );
  assert.throws(() =>
    loadConfig({ ...env, OFFTASK_GRANT_CHECK_CREDENTIAL: "" })
  );
  assert.throws(() =>
    loadConfig({ ...env, OFFTASK_OAUTH_SCOPES: "offtask:read" })
  );
  assert.throws(() =>
    loadConfig({
      ...env,
      OFFTASK_OAUTH_JWKS_URL: "https://attacker.example/jwks",
    })
  );
  assert.throws(() => loadConfig({ ...env, OFFTASK_CORS_ORIGINS: "*" }));
});

test("built-in grant checker uses the privileged bounded RPC with verified identifiers and no user bearer", async () => {
  const input: GrantCheckInput = {
    resource: config.audience,
    subject,
    session_id: session,
    client_id: "registered-chatgpt",
    issued_at: 1,
    expires_at: 2,
    permissions: ["read"],
    grant_revision: "4",
  };
  let calls = 0;
  const rpc = {
    supabaseUrl: "https://db.example",
    serviceRoleKey: "internal-rpc-secret",
    audience: config.audience,
  };
  const checker = createSupabaseGrantChecker(rpc, (async (url, init) => {
    calls++;
    assert.equal(
      String(url),
      "https://db.example/rest/v1/rpc/offtask_oauth_check_grant"
    );
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer internal-rpc-secret"
    );
    assert.deepEqual(JSON.parse(String(init?.body)), {
      input: { ...input, resource: config.audience },
    });
    return Response.json(await active(input));
  }) as typeof fetch);
  assert.equal((await checker(input)).active, true);
  await checker(input);
  assert.equal(calls, 2);
  const inactive = createSupabaseGrantChecker(rpc, (async () =>
    Response.json({ active: false })) as typeof fetch);
  assert.equal((await inactive(input)).active, false);
  for (const response of [
    new Response("private details", { status: 500 }),
    Response.json({ active: true }),
    new Response("x".repeat(16_385)),
  ]) {
    await assert.rejects(
      createSupabaseGrantChecker(
        rpc,
        (async () => response) as typeof fetch
      )(input),
      errorIs("temporarily_unavailable")
    );
  }
});
