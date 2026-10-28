import test from "node:test";
import assert from "node:assert/strict";
import { createChatGPTConnection, parseChatGPTStatus } from "../src/lib/chatgptConnection.ts";

test("only a configured ChatGPT plugin URL is offered to users", () => {
  const parse = (install_url) => parseChatGPTStatus({ status: "disconnected", install_url }).installUrl;
  assert.equal(parse("https://chatgpt.com/plugins/offtasks-123"), "https://chatgpt.com/plugins/offtasks-123");
  for (const url of [null, "http://chatgpt.com/plugins/offtasks", "https://chatgpt.com.evil.test/plugins/offtasks", "https://user@chatgpt.com/plugins/offtasks", "https://chatgpt.com/plugins/offtasks?redirect=evil", "https://chatgpt.com/plugins/../settings"]) {
    assert.equal(parse(url), null);
  }
});

test("unknown or incomplete authorization fails closed", () => {
  for (const value of [null, [], { status: "unknown" }, { status: "authorized", permissions: ["write"], revision: "1" }, { status: "authorized", permissions: ["read"], revision: "x" }, { status: "reconnect" }]) {
    assert.throws(() => parseChatGPTStatus(value), /unavailable/);
  }
  assert.deepEqual(parseChatGPTStatus({ status: "authorized", permissions: ["read", "write", "other"], revision: "42" }), {
    status: "authorized", installUrl: null, permissions: ["read", "write"], revision: "42",
  });
});

test("older deployments are unavailable and other errors do not become a connection", async () => {
  const connection = createChatGPTConnection({
    status: async () => ({ data: null, error: { code: "PGRST202" } }),
    revoke: async () => ({ data: null, error: null }),
  });
  assert.equal((await connection.read()).status, "unavailable");
  const failed = createChatGPTConnection({ status: async () => ({ data: null, error: { code: "other" } }), revoke: async () => ({ data: null, error: null }) });
  await assert.rejects(failed.read(), /unavailable/);
});

test("revocation carries the initiating owner, revision, and retry key, and responds to cancellation", async () => {
  let received;
  const connection = createChatGPTConnection({
    status: async () => ({ data: { status: "disconnected" }, error: null }),
    revoke: async (owner, revision, requestKey, signal) => {
      received = { owner, revision, requestKey, signal };
      return { data: null, error: null };
    },
  });
  const controller = new AbortController();
  controller.abort();
  await connection.revoke("owner-a", "7", "retry-key", controller.signal);
  assert.deepEqual({ owner: received.owner, revision: received.revision, requestKey: received.requestKey }, { owner: "owner-a", revision: "7", requestKey: "retry-key" });
  assert.equal(received.signal.aborted, true);
});
