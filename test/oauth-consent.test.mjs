import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  authorizationIdFromSearch,
  ConsentError,
  consentErrorMessage,
  consentRoute,
  createOAuthConsentService,
  verifiedProviderRedirect,
} from "../src/lib/oauthConsent.ts";
import {
  authReturnRoute,
  safePlannerReturn,
} from "../src/lib/goalWorkbench.ts";
import { screenForPath } from "../src/analytics-routes.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const client = "33333333-3333-4333-8333-333333333333";
const callback = "https://client.example.test/oauth/callback?registered=one";
const authorization = {
  authorization_id: id,
  redirect_uri: callback,
  client: { id: client, name: "Synthetic client" },
  user: { id: owner, email: "synthetic@example.test" },
  scope: "openid email profile",
};
const policy = {
  client_id: client,
  client_name: "Synthetic client",
  resource: "https://mcp.example.test/mcp",
  allowed_permissions: ["read", "write"],
  grant: null,
};
function fixture(overrides = {}) {
  const calls = [];
  let identity = { userId: owner, accessToken: "synthetic-first-party-token" };
  const api = createOAuthConsentService({
    providerUrl: "https://provider.example.test",
    apiKey: "synthetic-public-key",
    identity: async () => identity,
    fetch: async (url, options) => {
      calls.push({ provider: url, options });
      return new Response(
        JSON.stringify(
          options.method === "GET"
            ? authorization
            : {
                redirect_url:
                  callback +
                  (JSON.parse(options.body).action === "deny"
                    ? "&error=access_denied&state=synthetic-state"
                    : "&code=synthetic-code&state=synthetic-state"),
              },
        ),
      );
    },
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      return {
        data:
          name === "offtask_oauth_consent_details"
            ? policy
            : { grant: { revision: "2" } },
        error: null,
      };
    },
    ...overrides,
  });
  return {
    api,
    calls,
    changeOwner: () => {
      identity = { ...identity, userId: "different-owner" };
    },
  };
}

test("consent login return retains one valid opaque request ID and strips tokens/redirects", () => {
  assert.equal(authorizationIdFromSearch(`?authorization_id=${id}`), id);
  assert.equal(
    authorizationIdFromSearch(`?authorization_id=${id}&authorization_id=${id}`),
    null,
  );
  assert.equal(authorizationIdFromSearch("?authorization_id=../../user"), null);
  const route = consentRoute(id);
  assert.equal(
    safePlannerReturn(
      `${route}&access_token=private&next=https://evil.test#code=private`,
    ),
    route,
  );
  assert.equal(
    new URL(
      authReturnRoute("/login", route),
      "https://offtasks.test",
    ).searchParams.get("next"),
    route,
  );
  for (const value of [
    "//evil.test/oauth/consent",
    "/oauth/consent?authorization_id=bad",
    `${route}&authorization_id=${id}`,
    "/oauth/consent/evil",
  ])
    assert.equal(safePlannerReturn(value), "/app");
});

test("load uses only official authenticated provider endpoint then server-owned client policy", async () => {
  const { api, calls } = fixture();
  const context = await api.load(id, owner);
  assert.equal(context.policy.client_id, client);
  assert.equal(
    calls[0].provider,
    `https://provider.example.test/auth/v1/oauth/authorizations/${id}`,
  );
  assert.equal(
    calls[0].options.headers.Authorization,
    "Bearer synthetic-first-party-token",
  );
  assert.equal(calls[0].options.headers.apikey, "synthetic-public-key");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.referrerPolicy, "no-referrer");
  assert.deepEqual(calls[1], {
    rpc: "offtask_oauth_consent_details",
    args: { oauth_client_id: client },
  });
});

test("approval stages explicit chosen permissions with CAS before provider approval", async () => {
  const { api, calls } = fixture();
  const context = await api.load(id, owner);
  context.policy.grant = { permissions: ["read"], revision: "7", active: true };
  const redirect = await api.decide(
    context,
    "approve",
    ["read", "write"],
    "stable-key",
  );
  assert.deepEqual(calls[2], {
    rpc: "offtask_oauth_set_consent",
    args: {
      oauth_client_id: client,
      permissions: ["read", "write"],
      expected_revision: "7",
      authorization_id: id,
      request_key: "stable-key",
    },
  });
  assert.equal(
    calls[3].provider,
    `https://provider.example.test/auth/v1/oauth/authorizations/${id}/consent`,
  );
  assert.equal(calls[3].options.body, '{"action":"approve"}');
  assert.equal(new URL(redirect).searchParams.get("code"), "synthetic-code");
  assert.equal("actor" in calls[2].args, false);
});

test("denial never saves permissions or revokes an existing grant", async () => {
  const { api, calls } = fixture();
  const context = await api.load(id, owner);
  await api.decide(context, "deny", ["read"], "denial-key");
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.body, '{"action":"deny"}');
  assert.equal(
    calls.some((call) => /set_consent|revoke/.test(call.rpc ?? "")),
    false,
  );
});

test("server read-only policy blocks write choice independently of OIDC scope", async () => {
  const { api } = fixture({
    rpc: async () => ({
      data: { ...policy, allowed_permissions: ["read"] },
      error: null,
    }),
  });
  const context = await api.load(id, owner);
  await assert.rejects(
    api.decide(context, "approve", ["read", "write"], "key"),
    { reason: "invalid" },
  );
  assert.equal(context.authorization.scope, "openid email profile");
});

test("wrong provider user/client and policy mismatch cannot reach approval", async () => {
  for (const body of [
    { ...authorization, user: { id: "foreign" } },
    { ...authorization, authorization_id: "foreign" },
  ]) {
    const { api, calls } = fixture({
      fetch: async () => new Response(JSON.stringify(body)),
    });
    await assert.rejects(api.load(id, owner), ConsentError);
    assert.equal(calls.length, 0);
  }
  const { api } = fixture({
    rpc: async () => ({
      data: { ...policy, client_id: "foreign" },
      error: null,
    }),
  });
  await assert.rejects(api.load(id, owner), { reason: "invalid" });
});

test("account changes between load and consent cause no write", async () => {
  const { api, calls, changeOwner } = fixture();
  const context = await api.load(id, owner);
  changeOwner();
  await assert.rejects(api.decide(context, "approve", ["read"], "key"), {
    reason: "account",
  });
  assert.equal(calls.length, 2);
});

test("CAS conflict prevents provider approval and exposes no raw backend message", async () => {
  const { api, calls } = fixture({
    rpc: async (name) =>
      name.endsWith("details")
        ? { data: policy, error: null }
        : { data: null, error: { message: "revision_conflict private-value" } },
  });
  const context = await api.load(id, owner);
  await assert.rejects(api.decide(context, "approve", ["read"], "key"), {
    reason: "changed",
  });
  assert.equal(calls.filter((call) => call.provider).length, 1);
  assert.doesNotMatch(
    consentErrorMessage(new Error("private-token")),
    /private-token/,
  );
});

test("failed/uncertain provider approval never auto-replays or revokes an older grant", async () => {
  const { api, calls } = fixture({
    fetch: async (_url, options) =>
      options.method === "GET"
        ? new Response(JSON.stringify(authorization))
        : Promise.reject(new Error("network failed private-value")),
  });
  const context = await api.load(id, owner);
  await assert.rejects(api.decide(context, "approve", ["read"], "key"), {
    reason: "uncertain",
  });
  assert.deepEqual(
    calls.filter((call) => call.rpc).map((call) => call.rpc),
    [
      "offtask_oauth_consent_details",
      "offtask_oauth_set_consent",
      "offtask_oauth_cancel_pending",
    ],
  );
  assert.deepEqual(calls.at(-1).args, {
    oauth_client_id: client,
    authorization_id: id,
    expected_revision: "2",
    request_key: "key:cancel",
  });
});

test("provider auto-consented redirect-only response fails closed without client/callback identity", async () => {
  const { api, calls } = fixture({
    fetch: async () =>
      new Response(
        JSON.stringify({ redirect_url: "https://evil.test/?code=private" }),
      ),
  });
  await assert.rejects(api.load(id, owner), { reason: "previous" });
  assert.equal(calls.length, 0);
});

test("redirect validation binds exact registered host/path/query and standard response fields", () => {
  assert.equal(
    verifiedProviderRedirect(
      callback + "&error=access_denied&state=a",
      callback,
    ),
    callback + "&error=access_denied&state=a",
  );
  assert.equal(
    verifiedProviderRedirect(
      "http://127.0.0.1:1455/auth/callback?code=a&state=b",
      "http://127.0.0.1:1455/auth/callback",
    ),
    "http://127.0.0.1:1455/auth/callback?code=a&state=b",
  );
  for (const value of [
    "https://evil.test/oauth/callback?registered=one",
    "https://client.example.test/other?registered=one",
    callback + "&next=https://evil.test",
    callback + "#token=private",
    callback + "&code=a&code=b",
    "https://client.example.test/oauth/callback?registered=two",
    "javascript:alert(1)",
    "http://client.example.test/oauth/callback?registered=one",
  ])
    assert.throws(
      () => verifiedProviderRedirect(value, callback),
      ConsentError,
    );
});

test("inactive pending-only grant can be reviewed without claiming active permissions", async () => {
  const { api } = fixture({
    rpc: async () => ({
      data: {
        ...policy,
        grant: {
          permissions: [],
          pending_permissions: ["read"],
          revision: "2",
          active: false,
        },
      },
      error: null,
    }),
  });
  const context = await api.load(id, owner);
  assert.equal(context.policy.grant.active, false);
  assert.deepEqual(context.policy.grant.permissions, []);
});

test("oversized provider streams are cancelled before unbounded allocation", async () => {
  let cancelled = false;
  const { api } = fixture({
    fetch: async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.enqueue(new Uint8Array(40000));
          },
          cancel() {
            cancelled = true;
          },
        }),
      ),
  });
  await assert.rejects(api.load(id, owner), { reason: "invalid" });
  assert.equal(cancelled, true);
});

test("contradictory provider callback outcome does not claim approval", async () => {
  const { api } = fixture({
    fetch: async (_url, options) =>
      new Response(
        JSON.stringify(
          options.method === "GET"
            ? authorization
            : { redirect_url: callback + "&error=access_denied" },
        ),
      ),
  });
  const context = await api.load(id, owner);
  await assert.rejects(api.decide(context, "approve", ["read"], "key"), {
    reason: "uncertain",
  });
});

test("Deny clears only this request's pending revision without revoking active access", async () => {
  const { api, calls } = fixture();
  const context = await api.load(id, owner);
  context.policy.grant = {
    permissions: ["read"],
    active: true,
    revision: "7",
    pending_authorization_id: id,
  };
  await api.decide(context, "deny", ["read"], "deny-key");
  assert.deepEqual(calls[2], {
    rpc: "offtask_oauth_cancel_pending",
    args: {
      oauth_client_id: client,
      authorization_id: id,
      expected_revision: "7",
      request_key: "deny-key:cancel",
    },
  });
  assert.equal(calls[3].options.body, '{"action":"deny"}');
  assert.equal(
    calls.some((call) => /revoke/.test(call.rpc ?? "")),
    false,
  );
});

test("Deny leaves a different authorization's pending intent alone", async () => {
  const { api, calls } = fixture();
  const context = await api.load(id, owner);
  context.policy.grant = {
    permissions: ["read"],
    active: true,
    revision: "7",
    pending_authorization_id: owner,
  };
  await api.decide(context, "deny", ["read"], "deny-key");
  assert.equal(
    calls.some((call) => call.rpc === "offtask_oauth_cancel_pending"),
    false,
  );
});

test("cleanup CAS conflict never suppresses the provider's uncertain outcome or retries", async () => {
  const { api, calls } = fixture({
    fetch: async (_url, options) =>
      options.method === "GET"
        ? new Response(JSON.stringify(authorization))
        : Promise.reject(new Error("network")),
    rpc: async (name) =>
      name.endsWith("details")
        ? { data: policy, error: null }
        : name.endsWith("cancel_pending")
          ? { data: null, error: { message: "revision_conflict" } }
          : { data: { grant: { revision: "7" } }, error: null },
  });
  const context = await api.load(id, owner);
  await assert.rejects(api.decide(context, "approve", ["read"], "key"), {
    reason: "uncertain",
  });
  assert.equal(
    calls.some((call) => /revoke/.test(call.rpc ?? "")),
    false,
  );
});

test("route is separate from taskbar; static deep link and no-auto-redirect affordance remain wired", async () => {
  const screen = await readFile(
    new URL("../src/screens/OAuthConsent.tsx", import.meta.url),
    "utf8",
  );
  const routes = await readFile(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  const copies = await readFile(
    new URL("../scripts/create-spa-route-copies.mjs", import.meta.url),
    "utf8",
  );
  assert.match(routes, /path="\/oauth\/consent" element={<OAuthConsentScreen/);
  assert.match(copies, /"oauth\/consent"/);
  assert.match(screen, /href={result.redirect}/);
  assert.doesNotMatch(
    screen,
    /window.location|location.assign|DashboardScreen|Taskbar/,
  );
  assert.match(screen, /if \(!context \|\| locked.current\) return/);
  assert.equal(screenForPath("/oauth/consent"), null);
  assert.equal(screenForPath(`/oauth/consent?authorization_id=${id}`), null);
});
