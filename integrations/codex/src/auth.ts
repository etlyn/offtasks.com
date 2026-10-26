import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
  type JWTPayload,
} from "jose";
import type { AppPermission, Principal } from "./contracts.js";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SUPABASE_OAUTH_SCOPES = new Set([
  "openid",
  "email",
  "profile",
  "phone",
]);

export interface AuthConfig {
  issuer: string;
  audience: string;
  jwksUrl: string;
  allowedClientIds: string[];
  requiredScopes: string[];
}

export interface GrantCheckInput {
  resource: string;
  subject: string;
  client_id: string;
  session_id: string;
  issued_at: number;
  expires_at: number;
  token_id?: string;
  permissions: AppPermission[];
  grant_revision: string;
}

export interface ActiveGrant {
  active: boolean;
  subject: string;
  client_id: string;
  session_id: string;
  permissions: AppPermission[];
}

export type GrantChecker = (input: GrantCheckInput) => Promise<ActiveGrant>;

export class AuthenticationError extends Error {
  constructor(
    public readonly code:
      | "invalid_token"
      | "insufficient_scope"
      | "temporarily_unavailable",
    public readonly status: 401 | 403 | 503 = 401
  ) {
    super(
      code === "temporarily_unavailable"
        ? "Authorization service is unavailable; retry later."
        : "Reconnect Offtasks to authorize this request."
    );
    this.name = "AuthenticationError";
  }
}

export function authChallenge(
  metadataUrl: string,
  code = "invalid_token",
  scopes: string[] = []
): string {
  // Configuration URLs/scopes are validated before reaching this header.
  return `Bearer resource_metadata="${metadataUrl}", error="${code}", error_description="Reconnect Offtasks"${
    scopes.length ? `, scope="${scopes.join(" ")}"` : ""
  }`;
}

function permissions(value: unknown): AppPermission[] | null {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((item) => item !== "read" && item !== "write")
  )
    return null;
  const result = [...new Set(value)] as AppPermission[];
  return result.includes("read") ? result : null;
}

async function grantResponseBody(response: Response): Promise<string> {
  if (!response.body) throw new Error("Missing grant response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        throw new Error("Grant response too large.");
      }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}

async function readActiveGrant(
  response: Response,
  input: GrantCheckInput
): Promise<ActiveGrant> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Grant check failed.");
  }
  const result: unknown = JSON.parse(await grantResponseBody(response));
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new Error("Invalid grant response.");
  const record = result as Record<string, unknown>;
  if (record.active === false)
    return {
      active: false,
      subject: input.subject,
      client_id: input.client_id,
      session_id: input.session_id,
      permissions: [],
    };
  const granted = permissions(record.permissions);
  if (
    record.active !== true ||
    !granted ||
    typeof record.subject !== "string" ||
    typeof record.client_id !== "string" ||
    typeof record.session_id !== "string"
  )
    throw new Error("Invalid grant response.");
  return {
    active: true,
    subject: record.subject,
    client_id: record.client_id,
    session_id: record.session_id,
    permissions: granted,
  };
}

/** Service-only SQL verifies live provider sessions/consent and the app grant. No raw user token is forwarded. */
export function createSupabaseGrantChecker(
  config: { supabaseUrl: string; serviceRoleKey: string; audience: string },
  fetcher: typeof fetch = fetch
): GrantChecker {
  const target = new URL(
    "/rest/v1/rpc/offtask_oauth_check_grant",
    config.supabaseUrl
  );
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    !config.serviceRoleKey.trim()
  )
    throw new Error("An HTTPS Supabase service connection is required.");
  return async (input) => {
    try {
      return await readActiveGrant(
        await fetcher(target, {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`,
          },
          body: JSON.stringify({
            input: { ...input, resource: config.audience },
          }),
          signal: AbortSignal.timeout(5_000),
          cache: "no-store",
        }),
        input
      );
    } catch {
      throw new AuthenticationError("temporarily_unavailable", 503);
    }
  };
}

/** Check the real provider's current session AND OAuth consent on every request. */
export function createHttpsGrantChecker(
  url: string,
  credential: string,
  fetcher: typeof fetch = fetch
): GrantChecker {
  const target = new URL(url);
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.hash ||
    !credential.trim()
  ) {
    throw new Error(
      "An HTTPS grant checker with a server-only credential is required."
    );
  }
  return async (input) => {
    try {
      const response = await fetcher(target, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credential}`,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      });
      return await readActiveGrant(response, input);
    } catch {
      throw new AuthenticationError("temporarily_unavailable", 503);
    }
  };
}

export function createTokenVerifier(
  config: AuthConfig,
  checkGrant: GrantChecker,
  key?: JWTVerifyGetKey
) {
  if (
    config.audience === "authenticated" ||
    !config.allowedClientIds.length ||
    config.requiredScopes.some((scope) => !SUPABASE_OAUTH_SCOPES.has(scope))
  ) {
    throw new Error(
      "Dedicated resource audience, OAuth client allowlist and real provider scopes are required."
    );
  }
  const signingKey =
    key ??
    createRemoteJWKSet(new URL(config.jwksUrl), { timeoutDuration: 5_000 });
  return async (authorization: string | undefined): Promise<Principal> => {
    if (
      !authorization ||
      !/^Bearer [^\s,]+$/i.test(authorization) ||
      authorization.length > 32_768
    )
      throw new AuthenticationError("invalid_token");
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(authorization.slice(7), signingKey, {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ["ES256", "RS256"],
        requiredClaims: [
          "sub",
          "exp",
          "iat",
          "client_id",
          "session_id",
          "offtasks_mcp",
        ],
        clockTolerance: 5,
      }));
    } catch {
      throw new AuthenticationError("invalid_token");
    }
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (
      audience.length !== 1 ||
      audience[0] !== config.audience ||
      typeof payload.sub !== "string" ||
      !uuid.test(payload.sub) ||
      typeof payload.client_id !== "string" ||
      !config.allowedClientIds.includes(payload.client_id) ||
      typeof payload.session_id !== "string" ||
      !uuid.test(payload.session_id) ||
      typeof payload.iat !== "number" ||
      payload.iat > Date.now() / 1_000 + 5 ||
      typeof payload.exp !== "number" ||
      (payload.azp !== undefined && payload.azp !== payload.client_id)
    )
      throw new AuthenticationError("invalid_token");
    const scope =
      typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];
    if (config.requiredScopes.some((required) => !scope.includes(required)))
      throw new AuthenticationError("insufficient_scope", 403);
    const appClaim = payload.offtasks_mcp;
    if (!appClaim || typeof appClaim !== "object" || Array.isArray(appClaim))
      throw new AuthenticationError("insufficient_scope", 403);
    const claim = appClaim as Record<string, unknown>;
    const requestedPermissions = permissions(claim.permissions);
    if (
      claim.resource !== config.audience ||
      !requestedPermissions ||
      typeof claim.grant_revision !== "string" ||
      !/^[1-9][0-9]{0,17}$/.test(claim.grant_revision)
    )
      throw new AuthenticationError("insufficient_scope", 403);
    let active: ActiveGrant;
    try {
      active = await checkGrant({
        resource: config.audience,
        subject: payload.sub,
        client_id: payload.client_id,
        session_id: payload.session_id,
        issued_at: payload.iat,
        expires_at: payload.exp,
        ...(typeof payload.jti === "string" ? { token_id: payload.jti } : {}),
        permissions: requestedPermissions,
        grant_revision: claim.grant_revision,
      });
    } catch {
      throw new AuthenticationError("temporarily_unavailable", 503);
    }
    if (
      !active.active ||
      active.subject !== payload.sub ||
      active.client_id !== payload.client_id ||
      active.session_id !== payload.session_id
    ) {
      throw new AuthenticationError("invalid_token");
    }
    const currentPermissions = permissions(active.permissions);
    if (
      !currentPermissions ||
      requestedPermissions.some(
        (permission) => !currentPermissions.includes(permission)
      )
    )
      throw new AuthenticationError("insufficient_scope", 403);
    return {
      userId: payload.sub,
      clientId: payload.client_id,
      sessionId: payload.session_id,
      permissions: [...requestedPermissions],
    };
  };
}
