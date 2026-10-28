import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import { after, before, test } from "node:test";
import { once } from "node:events";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
} from "jose";
import { createTokenVerifier } from "../src/auth.js";
import type { RuntimeConfig } from "../src/config.js";
import { createMcpHttpHandler } from "../src/runtime.js";
import type { Principal } from "../src/contracts.js";

let server: Server;
let base: string;
let privateKey: CryptoKey;
let config: RuntimeConfig;
let grantsActive = true;
const first = "11111111-1111-4111-8111-111111111111";
const second = "33333333-3333-4333-8333-333333333333";
const session = "22222222-2222-4222-8222-222222222222";
const principals: Principal[] = [];
before(async () => {
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  const key = createLocalJWKSet({
    keys: [
      { ...(await exportJWK(pair.publicKey)), kid: "transport", alg: "ES256" },
    ],
  });
  config = {
    enabled: true,
    issuer: "https://auth.example/auth/v1",
    audience: "https://mcp.example/mcp",
    jwksUrl: "https://auth.example/keys",
    allowedClientIds: ["approved"],
    requiredScopes: [],
    resourceMetadataUrl:
      "https://mcp.example/.well-known/oauth-protected-resource",
    allowedHosts: [],
    allowedOrigins: ["https://chatgpt.com"],
    supabaseUrl: "https://db.example",
    serviceRoleKey: "internal-only",
    cursorSecret: "secret".repeat(8),
    grantCheckUrl: "https://checker.example",
    grantCheckCredential: "internal-only",
    bindHost: "127.0.0.1",
    port: 4100,
  };
  const verifyToken = createTokenVerifier(
    config,
    async (input) => ({
      active: grantsActive,
      subject: input.subject,
      client_id: input.client_id,
      session_id: input.session_id,
      permissions: input.permissions,
    }),
    key
  );
  server = createServer(
    createMcpHttpHandler(config, {
      verifyToken,
      createBackend: (principal) => ({
        read: async () => ({ owner: principal.userId }),
        mutate: async () => ({}),
      }),
      createServer: ({ principal, backend }) => {
        principals.push(principal);
        const mcp = new McpServer({ name: "isolation-test", version: "1.0.0" });
        mcp.registerTool(
          "context",
          { description: "Read current owner context.", inputSchema: {} },
          async () => ({
            content: [
              {
                type: "text",
                text: JSON.stringify(await backend.read("context", {})),
              },
            ],
          })
        );
        return mcp;
      },
    })
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  base = `http://127.0.0.1:${address.port}`;
  config.allowedHosts.push(new URL(base).host);
});
after(async () => {
  server.closeAllConnections();
  server.close();
  await once(server, "close");
});

async function bearer(subject = first): Promise<string> {
  return new SignJWT({
    client_id: "approved",
    session_id: session,
    offtasks_mcp: {
      resource: config.audience,
      permissions: ["read"],
      grant_revision: "1",
    },
  })
    .setProtectedHeader({ alg: "ES256", kid: "transport", typ: "at+jwt" })
    .setSubject(subject)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

test("protected-resource discovery is accurate and unauthenticated calls challenge OAuth", async () => {
  const metadata = await fetch(`${base}/.well-known/oauth-protected-resource`);
  assert.equal(metadata.status, 200);
  assert.deepEqual(await metadata.json(), {
    resource: config.audience,
    authorization_servers: [config.issuer],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://www.offtasks.com",
  });
  assert.equal(metadata.headers.get("cache-control"), "no-store");
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 401);
  assert.match(
    response.headers.get("www-authenticate") ?? "",
    /resource_metadata="https:\/\/mcp.example\/\.well-known\/oauth-protected-resource"/
  );
});

test("the optional domain challenge is exact, host-bound, and absent by default", async () => {
  const path = `${base}/.well-known/openai-apps-challenge`;
  assert.equal((await fetch(path)).status, 404);
  config.domainVerificationToken = "synthetic-verification-token";
  try {
    const response = await fetch(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/plain/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "synthetic-verification-token");
    // Node's fetch may normalize the Host header; issue a raw HTTP request so
    // the handler actually receives the untrusted value.
    const untrustedHostStatus = await new Promise<number>((resolve, reject) => {
      request(path, { headers: { Host: "untrusted.example" } }, (response) => {
        response.resume();
        resolve(response.statusCode!);
      }).on("error", reject).end();
    });
    assert.equal(untrustedHostStatus, 403);
  } finally {
    delete config.domainVerificationToken;
  }
});

test("real SDK clients discover and call with request-local isolated principals", async () => {
  const clients = [
    new Client({ name: "first", version: "1.0.0" }),
    new Client({ name: "second", version: "1.0.0" }),
  ];
  try {
    await Promise.all(
      clients.map(async (client, index) =>
        client.connect(
          new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
            requestInit: {
              headers: {
                Authorization: `Bearer ${await bearer(
                  index === 0 ? first : second
                )}`,
              },
            },
          })
        )
      )
    );
    const listed = await clients[0]!.listTools();
    assert.equal(listed.tools[0]?.name, "context");
    const result = await Promise.all(
      clients.map((client) =>
        client.callTool({ name: "context", arguments: {} })
      )
    );
    assert.deepEqual(
      result.map(
        (item) =>
          JSON.parse(
            (item.content as { type: string; text: string }[])[0]!.text
          ).owner
      ),
      [first, second]
    );
    assert.ok(principals.length >= 5);
    assert.notEqual(principals[0], principals[1]);
    assert.ok(principals.every((principal) => !("token" in principal)));
  } finally {
    await Promise.all(clients.map((client) => client.close()));
  }
});

test("revoked grants stop the next HTTP call and disabled mode exposes no discovery/tools", async () => {
  grantsActive = false;
  try {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await bearer()}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(response.status, 401);
  } finally {
    grantsActive = true;
  }
  config.enabled = false;
  try {
    assert.equal(
      (await fetch(`${base}/.well-known/oauth-protected-resource`)).status,
      503
    );
    assert.equal((await fetch(`${base}/mcp`, { method: "POST" })).status, 503);
  } finally {
    config.enabled = true;
  }
});

test("untrusted origins/hosts, malformed bodies and unsupported methods are rejected", async () => {
  const malformedTarget = await new Promise<number>((resolve, reject) => {
    const target = new URL(base);
    request(
      {
        hostname: target.hostname,
        port: target.port,
        path: "http://[",
        headers: { Host: target.host },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode!);
      }
    )
      .on("error", reject)
      .end();
  });
  assert.equal(malformedTarget, 400);
  assert.equal(
    (
      await fetch(`${base}/`, {
        headers: { Origin: "https://attacker.example" },
      })
    ).status,
    403
  );
  const untrustedHostStatus = await new Promise<number>((resolve, reject) => {
    request(
      `${base}/`,
      { headers: { Host: "attacker.example" } },
      (response) => {
        response.resume();
        resolve(response.statusCode!);
      }
    )
      .on("error", reject)
      .end();
  });
  assert.equal(untrustedHostStatus, 403);
  const auth = `Bearer ${await bearer()}`;
  assert.equal(
    (await fetch(`${base}/mcp`, { headers: { Authorization: auth } })).status,
    405
  );
  assert.equal(
    (
      await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: "{bad",
      })
    ).status,
    400
  );
  assert.equal(
    (
      await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ oversized: "x".repeat(263_000) }),
      })
    ).status,
    413
  );
  const cors = await fetch(`${base}/mcp`, {
    method: "OPTIONS",
    headers: { Origin: "https://chatgpt.com" },
  });
  assert.equal(cors.status, 204);
  assert.equal(
    cors.headers.get("access-control-allow-origin"),
    "https://chatgpt.com"
  );
});
