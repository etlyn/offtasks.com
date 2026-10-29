import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// An operator supplies a separately registered public client. Never package a
// secret, access token, reviewer credential, or the personal dev client.
const [, , clientId, destination] = process.argv;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId ?? "") || !destination) {
  throw new Error("Usage: node prepare-package.mjs PUBLIC_OAUTH_CLIENT_UUID NEW_OUTPUT_DIRECTORY");
}
if (clientId.toLowerCase() === "a7150a2d-6461-41ae-a1f8-3ad7d2dcae1b") {
  throw new Error("Use the public client, not the existing personal development client.");
}
const output = resolve(destination);
await mkdir(output); // Fails if the output already exists; never overwrite it.
for (const entry of ["plugin.json", "skills", "assets"]) {
  await cp(new URL(entry, import.meta.url), `${output}/${entry}`, { recursive: true, errorOnExist: true, force: false });
}
const mcp = {
  $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  mcpServers: {
    offtasks: {
      type: "streamable-http",
      url: "https://offtasks-mcp-qjloputrxa-ul.a.run.app/mcp",
      extensions: {
        "com.openai": {
          // Offtasks authorization uses the subject. Request offline access for
          // refresh, and verify the actual request: discovery may add scopes.
          auth: {
            type: "oauth",
            client: { mode: "provided", clientId, tokenEndpointAuthMethod: "none" },
            baseScopes: ["openid", "offline_access"],
            defaultScopes: [],
            oidcScopesSupported: ["openid"],
          },
        },
      },
    },
  },
};
await writeFile(`${output}/mcp.json`, `${JSON.stringify(mcp, null, 2)}\n`, { flag: "wx" });
// Ensure the copied metadata is parseable before handing the directory back.
JSON.parse(await readFile(`${output}/plugin.json`, "utf8"));
console.log(`Prepared ${output}. Review it before creating a ZIP or submitting.`);
