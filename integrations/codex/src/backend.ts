import type { Principal, IntegrationBackend } from "./contracts.js";
import { IntegrationBackendError } from "./contracts.js";

export interface RpcConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

async function boundedBody(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new IntegrationBackendError(
          "response_too_large",
          "Offtasks returned too much context; request a smaller page."
        );
      }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}

/** Domain SQLSTATE + exact message prefix, never PostgreSQL details/hints. */
function domainError(
  body: string
): { code: string; status: number } | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return undefined;
  const value = parsed as Record<string, unknown>;
  if (typeof value.code !== "string" || typeof value.message !== "string")
    return undefined;
  const prefix = /^([a-z_]+)(?::|$)/.exec(value.message)?.[1];
  const allowed: Record<string, Record<string, number>> = {
    "40001": { revision_conflict: 409, request_key_conflict: 409 },
    P0002: { not_found: 404 },
    "22023": { validation_failed: 400 },
    "42501": { forbidden: 403 },
    "28000": { unauthenticated: 401 },
  };
  const status = prefix ? allowed[value.code]?.[prefix] : undefined;
  return status && prefix ? { code: prefix, status } : undefined;
}

/** Dedicated internal credential, not the MCP-audience user bearer. SQL rechecks actor ownership. */
export function createSupabaseBackend(
  config: RpcConfig,
  principal: Principal,
  fetcher: typeof fetch = fetch
): IntegrationBackend {
  const actor = principal.userId;
  const call = async (
    kind: "read" | "mutate",
    operation: string,
    args: Record<string, unknown>
  ): Promise<unknown> => {
    if (!principal.permissions.includes(kind === "read" ? "read" : "write"))
      throw new IntegrationBackendError(
        "forbidden",
        "This connection does not permit that operation.",
        403
      );
    try {
      const response = await fetcher(
        new URL(
          kind === "mutate" && operation === "create_task"
            ? "/rest/v1/rpc/offtask_integration_create_task"
            : kind === "read" && operation === "list_tasks"
            ? "/rest/v1/rpc/offtask_integration_list_tasks"
            : `/rest/v1/rpc/offtask_integration_${kind}`,
          config.supabaseUrl
        ),
        {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
          headers: {
            "Content-Type": "application/json",
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`,
          },
          body: JSON.stringify(
            (kind === "mutate" && operation === "create_task") ||
              (kind === "read" && operation === "list_tasks")
              ? { args, actor }
              : { operation, args, actor }
          ),
        }
      );
      if (!response.ok) {
        let known: ReturnType<typeof domainError>;
        try {
          known = domainError(await boundedBody(response, 16_384));
        } catch {
          /* Malformed/oversized error bodies stay unavailable. */
        }
        // A 401/403 uses our internal RPC credential. Missing RPC/schema-cache
        // 404s are deployment failures, not a missing user record or OAuth flow.
        const codes: Record<number, string> = {
          400: "validation_failed",
          409: "revision_conflict",
          429: "rate_limit",
        };
        throw new IntegrationBackendError(
          known?.code ?? codes[response.status] ?? "upstream_unavailable",
          "Offtasks could not complete this request. Refresh current context before retrying a change.",
          known?.status ?? response.status
        );
      }
      const text = await boundedBody(response, 2_000_000);
      return JSON.parse(text) as unknown;
    } catch (error) {
      if (error instanceof IntegrationBackendError) throw error;
      throw new IntegrationBackendError(
        "upstream_unavailable",
        "Offtasks is unavailable. Retry using the same request key for a change."
      );
    }
  };
  return {
    read: (operation, args) => call("read", operation, args),
    mutate: (operation, args) => call("mutate", operation, args),
  };
}
