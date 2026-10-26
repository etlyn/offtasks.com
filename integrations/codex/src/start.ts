import { createServer } from "node:http";
import {
  createHttpsGrantChecker,
  createSupabaseGrantChecker,
  createTokenVerifier,
} from "./auth.js";
import { createSupabaseBackend } from "./backend.js";
import { loadConfig } from "./config.js";
import { createMcpHttpHandler } from "./runtime.js";
import { createOfftasksServer } from "./tools.js";

const config = loadConfig();
const verifyToken = config.enabled
  ? createTokenVerifier(
      config,
      config.grantCheckUrl
        ? createHttpsGrantChecker(
            config.grantCheckUrl,
            config.grantCheckCredential
          )
        : createSupabaseGrantChecker(config)
    )
  : async () => {
      throw new Error("Integration disabled.");
    };
const server = createServer(
  createMcpHttpHandler(config, {
    verifyToken,
    createBackend: (principal) => createSupabaseBackend(config, principal),
    createServer: createOfftasksServer,
  })
);
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.listen(config.port, config.bindHost, () => {
  console.info(
    `Offtasks MCP listening on ${config.bindHost}:${config.port}; integration ${
      config.enabled ? "enabled" : "disabled"
    }.`
  );
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => server.close());
