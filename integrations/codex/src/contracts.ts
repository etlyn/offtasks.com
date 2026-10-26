import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type AppPermission = "read" | "write";

/** Credentials never enter the domain/tool contract. Instances are request-local. */
export interface Principal {
  userId: string;
  clientId: string;
  sessionId: string;
  permissions: AppPermission[];
}

export interface IntegrationBackend {
  read(operation: string, args: Record<string, unknown>): Promise<unknown>;
  mutate(operation: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface OfftasksServerOptions {
  backend: IntegrationBackend;
  principal: Principal;
  resourceMetadataUrl: string;
  /** Actual provider scopes only. Application permissions are a separate claim. */
  oauthScopes: string[];
  cursorSecret: string;
}

export type OfftasksServerFactory = (
  options: OfftasksServerOptions
) => McpServer;

export class IntegrationBackendError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 502
  ) {
    super(message);
    this.name = "IntegrationBackendError";
  }
}
