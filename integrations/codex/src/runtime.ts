import { type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { authChallenge, AuthenticationError } from "./auth.js";
import type { RuntimeConfig } from "./config.js";
import type {
  IntegrationBackend,
  OfftasksServerFactory,
  Principal,
} from "./contracts.js";

interface Dependencies {
  verifyToken: (authorization: string | undefined) => Promise<Principal>;
  createBackend: (principal: Principal) => IntegrationBackend;
  createServer: OfftasksServerFactory;
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

async function body(req: IncomingMessage): Promise<unknown> {
  if (
    !req.headers["content-type"]?.toLowerCase().startsWith("application/json")
  )
    throw new Error("content_type");
  let length = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    length += bytes.length;
    if (length > 262_144) throw new Error("too_large");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

/** Stateless transport and server per request: no cross-account/session authorization cache. */
export function createMcpHttpHandler(
  config: RuntimeConfig,
  deps: Dependencies
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    const host = req.headers.host?.toLowerCase();
    if (
      !host ||
      (config.allowedHosts.length &&
        !config.allowedHosts.some((allowed) => allowed.toLowerCase() === host))
    ) {
      json(res, 403, { error: "untrusted_host" });
      return;
    }
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      json(res, 403, { error: "untrusted_origin" });
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, Accept, MCP-Protocol-Version"
      );
      res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate");
    }
    let path: string;
    try {
      path = new URL(req.url ?? "/", `http://${host}`).pathname;
    } catch {
      json(res, 400, { error: "invalid_request" });
      return;
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "GET" && path === "/") {
      json(res, 200, {
        name: "Offtasks MCP",
        enabled: config.enabled,
        transport: "streamable-http",
        endpoint: "/mcp",
      });
      return;
    }
    if (req.method === "GET" && path === "/health") {
      json(res, config.enabled ? 200 : 503, {
        enabled: config.enabled,
        readiness: "configuration_only_not_provider_acceptance",
      });
      return;
    }
    if (
      req.method === "GET" &&
      [
        "/.well-known/oauth-protected-resource",
        "/.well-known/oauth-protected-resource/mcp",
      ].includes(path)
    ) {
      if (!config.enabled) {
        json(res, 503, { error: "integration_disabled" });
        return;
      }
      json(res, 200, {
        resource: config.audience,
        authorization_servers: [config.issuer],
        ...(config.requiredScopes.length
          ? { scopes_supported: config.requiredScopes }
          : {}),
        bearer_methods_supported: ["header"],
        resource_documentation: "https://www.offtasks.com",
      });
      return;
    }
    if (path !== "/mcp") {
      json(res, 404, { error: "not_found" });
      return;
    }
    if (!config.enabled) {
      json(res, 503, { error: "integration_disabled" });
      return;
    }
    try {
      const principal = await deps.verifyToken(req.headers.authorization);
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        json(res, 405, { error: "stateless_transport_requires_post" });
        return;
      }
      let parsed: unknown;
      try {
        parsed = await body(req);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        json(res, message === "too_large" ? 413 : 400, {
          error: "invalid_request",
        });
        return;
      }
      const server = deps.createServer({
        backend: deps.createBackend(principal),
        principal,
        resourceMetadataUrl: config.resourceMetadataUrl,
        oauthScopes: [...config.requiredScopes],
        cursorSecret: config.cursorSecret,
      });
      // Omitting sessionIdGenerator selects the SDK's stateless mode.
      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
      });
      const close = () => {
        void transport.close();
        void server.close();
      };
      res.once("close", close);
      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, parsed);
      } catch {
        if (!res.headersSent) json(res, 500, { error: "mcp_unavailable" });
        else if (!res.writableEnded) res.end();
      } finally {
        res.off("close", close);
        await transport.close();
        await server.close();
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        if (error.status !== 503)
          res.setHeader(
            "WWW-Authenticate",
            authChallenge(
              config.resourceMetadataUrl,
              error.code,
              config.requiredScopes
            )
          );
        else res.setHeader("Retry-After", "5");
        json(res, error.status, { error: error.code, message: error.message });
        return;
      }
      json(res, 503, { error: "authorization_unavailable" });
    }
  };
}
