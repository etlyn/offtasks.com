import { SUPABASE_OAUTH_SCOPES, type AuthConfig } from "./auth.js";

export interface RuntimeConfig extends AuthConfig {
  enabled: boolean;
  resourceMetadataUrl: string;
  allowedHosts: string[];
  allowedOrigins: string[];
  supabaseUrl: string;
  serviceRoleKey: string;
  cursorSecret: string;
  grantCheckUrl: string;
  grantCheckCredential: string;
  bindHost: string;
  port: number;
}

function list(value: string | undefined): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function secureUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL.`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  )
    throw new Error(
      `${label} must be an absolute HTTPS URL without credentials, query or fragment.`
    );
  return url;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env
): RuntimeConfig {
  if (
    env.OFFTASK_MCP_ENABLED &&
    !["true", "false"].includes(env.OFFTASK_MCP_ENABLED)
  )
    throw new Error("OFFTASK_MCP_ENABLED must be true or false.");
  const enabled = env.OFFTASK_MCP_ENABLED === "true";
  const audience = env.OFFTASK_MCP_RESOURCE ?? "";
  const issuer = env.OFFTASK_OAUTH_ISSUER ?? "";
  const config: RuntimeConfig = {
    enabled,
    issuer,
    audience,
    jwksUrl:
      env.OFFTASK_OAUTH_JWKS_URL ??
      (issuer ? `${issuer.replace(/\/$/, "")}/.well-known/jwks.json` : ""),
    allowedClientIds: list(env.OFFTASK_OAUTH_CLIENT_IDS),
    requiredScopes: list(env.OFFTASK_OAUTH_SCOPES),
    resourceMetadataUrl: audience
      ? new URL("/.well-known/oauth-protected-resource", audience).href
      : "",
    allowedHosts: list(env.OFFTASK_ALLOWED_HOSTS),
    allowedOrigins: list(env.OFFTASK_CORS_ORIGINS),
    supabaseUrl: env.OFFTASK_SUPABASE_URL ?? "",
    serviceRoleKey: env.OFFTASK_SUPABASE_SERVICE_ROLE_KEY ?? "",
    cursorSecret: env.OFFTASK_CURSOR_SECRET ?? "",
    grantCheckUrl: env.OFFTASK_GRANT_CHECK_URL ?? "",
    grantCheckCredential: env.OFFTASK_GRANT_CHECK_CREDENTIAL ?? "",
    bindHost: env.OFFTASK_BIND_HOST ?? "127.0.0.1",
    port: Number(env.PORT ?? env.OFFTASK_PORT ?? "4100"),
  };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65_535)
    throw new Error("A valid server port is required.");
  if (!enabled) return config;
  const resource = secureUrl(audience, "OFFTASK_MCP_RESOURCE");
  const authIssuer = secureUrl(issuer, "OFFTASK_OAUTH_ISSUER");
  const jwks = secureUrl(config.jwksUrl, "OFFTASK_OAUTH_JWKS_URL");
  secureUrl(config.supabaseUrl, "OFFTASK_SUPABASE_URL");
  if (config.grantCheckUrl)
    secureUrl(config.grantCheckUrl, "OFFTASK_GRANT_CHECK_URL");
  if (jwks.origin !== authIssuer.origin)
    throw new Error("JWKS must use the configured issuer origin.");
  if (
    !config.allowedClientIds.length ||
    config.allowedClientIds.some((id) => /[\s"\\]/.test(id))
  )
    throw new Error("An explicit OAuth client allowlist is required.");
  if (config.requiredScopes.some((scope) => !SUPABASE_OAUTH_SCOPES.has(scope)))
    throw new Error(
      "Supabase supports only openid/email/profile/phone OAuth scopes; app permissions are separate."
    );
  if (
    config.cursorSecret.length < 32 ||
    !config.serviceRoleKey ||
    !!config.grantCheckUrl !== !!config.grantCheckCredential
  )
    throw new Error(
      "Server-only RPC and 32-character cursor secrets are required; optional external checker needs both URL and credential."
    );
  if (!config.allowedHosts.length) config.allowedHosts = [resource.host];
  if (
    !config.allowedHosts.includes(resource.host) ||
    config.allowedHosts.some((host) => !/^[a-zA-Z0-9.:[\]-]+$/.test(host))
  )
    throw new Error(
      "Host allowlist must include the canonical resource host and contain no wildcards."
    );
  for (const origin of config.allowedOrigins) {
    const parsed = secureUrl(origin, "OFFTASK_CORS_ORIGINS");
    if (parsed.origin !== origin)
      throw new Error("CORS entries must be exact HTTPS origins.");
  }
  return config;
}
