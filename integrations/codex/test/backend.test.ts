import assert from "node:assert/strict";
import { test } from "node:test";
import { createSupabaseBackend } from "../src/backend.js";
import { IntegrationBackendError, type Principal } from "../src/contracts.js";

const principal: Principal = {
  userId: "11111111-1111-4111-8111-111111111111",
  clientId: "host",
  sessionId: "22222222-2222-4222-8222-222222222222",
  permissions: ["read", "write"],
};
test("privileged internal RPC derives actor from principal and never forwards the MCP bearer", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const backend = createSupabaseBackend(
    {
      supabaseUrl: "https://db.example",
      serviceRoleKey: "server-only-rpc-key",
    },
    principal,
    (async (url, init) => {
      calls.push({ url: String(url), init: init! });
      return Response.json({ data: { revision: 3 } });
    }) as typeof fetch
  );
  await backend.read("list_goals", { actor: "forged", user_id: "forged" });
  await backend.mutate("update_task", { request_key: "retry-original" });
  assert.equal(
    calls[0]?.url,
    "https://db.example/rest/v1/rpc/offtask_integration_read"
  );
  assert.equal(
    calls[1]?.url,
    "https://db.example/rest/v1/rpc/offtask_integration_mutate"
  );
  assert.equal(
    (calls[0]?.init.headers as Record<string, string>).Authorization,
    "Bearer server-only-rpc-key"
  );
  assert.equal(JSON.parse(String(calls[0]?.init.body)).actor, principal.userId);
  assert.equal(
    JSON.parse(String(calls[1]?.init.body)).args.request_key,
    "retry-original"
  );
});
test("read-only principal cannot mutate and failures do not expose database details", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return new Response("private schema detail", { status: 409 });
  }) as typeof fetch;
  const backend = createSupabaseBackend(
    { supabaseUrl: "https://db.example", serviceRoleKey: "private" },
    { ...principal, permissions: ["read"] },
    fetcher
  );
  await assert.rejects(
    backend.mutate("update_task", {}),
    (error: unknown) =>
      error instanceof IntegrationBackendError && error.code === "forbidden"
  );
  assert.equal(calls, 0);
  await assert.rejects(
    backend.read("get_task_context", {}),
    (error: unknown) =>
      error instanceof IntegrationBackendError &&
      error.code === "revision_conflict" &&
      !error.message.includes("private schema")
  );
});

test("real PostgREST SQLSTATE 500 responses preserve allowlisted domain conflicts and missing records", async () => {
  for (const [sqlState, message, expected, status] of [
    [
      "40001",
      "revision_conflict: private table detail",
      "revision_conflict",
      409,
    ],
    ["40001", "request_key_conflict", "request_key_conflict", 409],
    ["P0002", "not_found", "not_found", 404],
    ["42501", "forbidden", "forbidden", 403],
    ["28000", "unauthenticated", "unauthenticated", 401],
    [
      "22023",
      "validation_failed: dependency unavailable",
      "validation_failed",
      400,
    ],
  ] as const) {
    const backend = createSupabaseBackend(
      { supabaseUrl: "https://db.example", serviceRoleKey: "private" },
      principal,
      (async () =>
        Response.json(
          {
            code: sqlState,
            message,
            details: "private schema",
            hint: "private credential",
          },
          { status: 500 }
        )) as typeof fetch
    );
    await assert.rejects(
      backend.mutate("update_task", {}),
      (error: unknown) =>
        error instanceof IntegrationBackendError &&
        error.code === expected &&
        error.status === status &&
        !error.message.includes("private")
    );
  }
});

test("deployment/auth failures and arbitrary database messages do not become user errors", async () => {
  for (const [status, body] of [
    [404, { code: "PGRST202", message: "Could not find the private RPC" }],
    [
      401,
      { code: "PGRST301", message: "private service credential is invalid" },
    ],
    [403, { code: "42501", message: "permission denied for private function" }],
    [500, { code: "XX000", message: "not_found: pretend domain error" }],
    [500, { code: "40001", message: "private database exception" }],
    [500, { code: "40001", message: "revision_conflict_suffix: private" }],
  ] as const) {
    const backend = createSupabaseBackend(
      { supabaseUrl: "https://db.example", serviceRoleKey: "private" },
      principal,
      (async () => Response.json(body, { status })) as typeof fetch
    );
    await assert.rejects(
      backend.read("get_goal_context", {}),
      (error: unknown) =>
        error instanceof IntegrationBackendError &&
        error.code === "upstream_unavailable" &&
        !error.message.includes("private")
    );
  }
});

test("rate limits/timeouts stay safe and upstream response streams are bounded", async () => {
  const config = {
    supabaseUrl: "https://db.example",
    serviceRoleKey: "private",
  };
  await assert.rejects(
    createSupabaseBackend(
      config,
      principal,
      (async () => new Response("", { status: 429 })) as typeof fetch
    ).read("list_goals", {}),
    (error: unknown) =>
      error instanceof IntegrationBackendError && error.code === "rate_limit"
  );
  await assert.rejects(
    createSupabaseBackend(config, principal, (async () => {
      throw new Error("private timeout detail");
    }) as typeof fetch).read("list_goals", {}),
    (error: unknown) =>
      error instanceof IntegrationBackendError &&
      error.code === "upstream_unavailable" &&
      !error.message.includes("private")
  );
  let cancelled = false;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2_000_001));
      },
      cancel() {
        cancelled = true;
      },
    })
  );
  await assert.rejects(
    createSupabaseBackend(
      config,
      principal,
      (async () => response) as typeof fetch
    ).read("list_goals", {}),
    (error: unknown) =>
      error instanceof IntegrationBackendError &&
      error.code === "response_too_large"
  );
  assert.equal(cancelled, true);
  const oversizedError = createSupabaseBackend(
    config,
    principal,
    (async () =>
      new Response("x".repeat(17_000), { status: 500 })) as typeof fetch
  );
  await assert.rejects(
    oversizedError.read("list_goals", {}),
    (error: unknown) =>
      error instanceof IntegrationBackendError &&
      error.code === "upstream_unavailable"
  );
});
