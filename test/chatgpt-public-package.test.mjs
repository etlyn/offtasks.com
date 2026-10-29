import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../integrations/chatgpt-public/prepare-package.mjs", import.meta.url));
const client = "12345678-1234-4234-8234-123456789abc"; // Synthetic; never enabled.

test("the public package requires a separate client and never overwrites a destination", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "offtasks-plugin-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(root, "package");
  for (const input of ["invalid", "a7150a2d-6461-41ae-a1f8-3ad7d2dcae1b"]) {
    assert.notEqual(spawnSync(process.execPath, [script, input, target]).status, 0);
  }
  assert.deepEqual(await readdir(root), []);
  execFileSync(process.execPath, [script, client, target]);
  const mcp = JSON.parse(await readFile(join(target, "mcp.json"), "utf8"));
  const auth = mcp.mcpServers.offtasks.extensions["com.openai"].auth;
  assert.deepEqual(auth, {
    type: "oauth",
    client: { mode: "provided", clientId: client, tokenEndpointAuthMethod: "none" },
    baseScopes: ["openid", "offline_access"],
    defaultScopes: [],
    oidcScopesSupported: ["openid"],
  });
  assert.equal(mcp.mcpServers.offtasks.url, "https://offtasks-mcp-qjloputrxa-ul.a.run.app/mcp");
  const manifest = JSON.parse(await readFile(join(target, "plugin.json"), "utf8"));
  const review = manifest.extensions["com.openai"].review;
  assert.equal(review.test_cases.positive.length, 5);
  assert.equal(review.test_cases.negative.length, 3);
  assert.ok(await readFile(join(target, "skills/offtasks-planning/SKILL.md"), "utf8"));
  assert.notEqual(spawnSync(process.execPath, [script, client, target]).status, 0);
  assert.equal(JSON.parse(await readFile(join(target, "mcp.json"), "utf8")).mcpServers.offtasks.extensions["com.openai"].auth.client.clientId, client);
});
