/**
 * Isolated Supabase OAuth-server consumer contract. The pinned SDK predates it.
 * Official auth-js methods use these same authenticated REST endpoints:
 * https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/GoTrueClient.ts
 * No OAuth permission is derived from query parameters or user metadata.
 */
export type ConsentPermission = "read" | "write";
export interface ConsentIdentity {
  userId: string;
  accessToken: string;
}
export interface AuthorizationDetails {
  authorization_id: string;
  redirect_uri: string;
  client: { id: string; name: string };
  user: { id: string; email: string };
  scope: string;
}
export interface ConsentPolicy {
  client_id: string;
  client_name: string;
  resource: string;
  allowed_permissions: ConsentPermission[];
  grant: {
    permissions: ConsentPermission[];
    revision: string;
    active: boolean;
    pending_authorization_id?: string | null;
  } | null;
}
export interface ConsentContext {
  authorization: AuthorizationDetails;
  policy: ConsentPolicy;
  ownerId: string;
}
export class ConsentError extends Error {
  readonly reason:
    | "invalid"
    | "unavailable"
    | "account"
    | "changed"
    | "uncertain"
    | "previous";
  constructor(reason: ConsentError["reason"]) {
    super(reason);
    this.name = "ConsentError";
    this.reason = reason;
  }
}
// Supabase Auth generates this opaque value with SecureAlphanumeric(32).
const authorizationIdPattern = /^[A-Za-z0-9]{32}$/;
export const validAuthorizationId = (value: unknown): value is string =>
  typeof value === "string" && authorizationIdPattern.test(value);
export const consentRoute = (id: string) =>
  `/oauth/consent?${new URLSearchParams({ authorization_id: id })}`;
export function authorizationIdFromSearch(search: string): string | null {
  const ids = new URLSearchParams(search).getAll("authorization_id");
  return ids.length === 1 && validAuthorizationId(ids[0]) ? ids[0] : null;
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ConsentError("invalid");
  return value as Record<string, unknown>;
};
const text = (value: unknown, max = 512) => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new ConsentError("invalid");
  return value;
};
async function readProviderJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 65536) {
    await response.body?.cancel();
    throw new ConsentError("invalid");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ConsentError("invalid");
  const decoder = new TextDecoder();
  let size = 0,
    body = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new ConsentError("invalid");
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(body + decoder.decode()) as unknown;
  } finally {
    reader.releaseLock();
  }
}
function callbackUrl(value: unknown) {
  const raw = text(value, 8192);
  const url = new URL(raw);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new ConsentError("invalid");
  return url;
}
/** Only the provider's registered callback, plus standard OAuth response fields. */
export function verifiedProviderRedirect(
  value: unknown,
  registeredUri: string,
): string {
  try {
    const target = callbackUrl(value);
    const registered = callbackUrl(registeredUri);
    if (
      target.origin !== registered.origin ||
      target.pathname !== registered.pathname
    )
      throw new ConsentError("invalid");
    for (const key of new Set(registered.searchParams.keys())) {
      if (
        JSON.stringify(target.searchParams.getAll(key)) !==
        JSON.stringify(registered.searchParams.getAll(key))
      )
        throw new ConsentError("invalid");
    }
    for (const key of new Set(target.searchParams.keys())) {
      if (registered.searchParams.has(key)) continue;
      if (
        !["code", "state", "error", "error_description", "error_uri"].includes(
          key,
        ) ||
        target.searchParams.getAll(key).length !== 1
      )
        throw new ConsentError("invalid");
    }
    return target.href;
  } catch {
    throw new ConsentError("invalid");
  }
}
function parseAuthorization(
  value: unknown,
  authorizationId: string,
  ownerId: string,
): AuthorizationDetails {
  const body = object(value);
  // The provider can auto-consent and return only a redirect. We cannot verify its
  // registered callback/client from that response, so never follow it blindly.
  if (body.redirect_url && !body.authorization_id)
    throw new ConsentError("previous");
  const client = object(body.client),
    user = object(body.user);
  if (body.authorization_id !== authorizationId || user.id !== ownerId)
    throw new ConsentError("account");
  const redirect = text(body.redirect_uri, 8192);
  callbackUrl(redirect);
  const scope = typeof body.scope === "string" ? body.scope : "";
  if (scope.length > 1024 || /[^\x20-\x7e]/.test(scope))
    throw new ConsentError("invalid");
  const clientId = text(client.id);
  return {
    authorization_id: authorizationId,
    redirect_uri: redirect,
    client: {
      id: clientId,
      name:
        typeof client.name === "string" && client.name.trim()
          ? text(client.name, 256)
          : clientId,
    },
    user: {
      id: ownerId,
      email: typeof user.email === "string" ? user.email.slice(0, 320) : "",
    },
    scope,
  };
}
function parsePermissions(value: unknown): ConsentPermission[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => item !== "read" && item !== "write") ||
    !value.includes("read")
  )
    throw new ConsentError("invalid");
  return [...new Set(value)] as ConsentPermission[];
}
function parsePolicy(value: unknown, clientId: string): ConsentPolicy {
  const body = object(value);
  if (body.client_id !== clientId) throw new ConsentError("invalid");
  const resource = callbackUrl(body.resource);
  if (resource.search || resource.hash) throw new ConsentError("invalid");
  const grant = body.grant === null ? null : object(body.grant);
  if (
    grant?.pending_authorization_id != null &&
    !validAuthorizationId(grant.pending_authorization_id)
  )
    throw new ConsentError("invalid");
  return {
    client_id: clientId,
    client_name: text(body.client_name, 256),
    resource: resource.href,
    allowed_permissions: parsePermissions(body.allowed_permissions),
    grant: grant
      ? {
          permissions:
            grant.active === false &&
            Array.isArray(grant.permissions) &&
            grant.permissions.length === 0
              ? []
              : parsePermissions(grant.permissions),
          revision: text(grant.revision, 64),
          active: grant.active === true,
          pending_authorization_id: grant.pending_authorization_id as
            | string
            | null
            | undefined,
        }
      : null,
  };
}
export const consentErrorMessage = (error: unknown): string => {
  const reason = error instanceof ConsentError ? error.reason : "unavailable";
  if (reason === "account")
    return "Your account changed. Restart the connection from your client.";
  if (reason === "changed")
    return "Access settings changed. Restart the connection to review the current request.";
  if (reason === "uncertain")
    return "Approval could not be confirmed. Restart the connection from your client before trying again.";
  if (reason === "previous")
    return "This request was already handled. Restart the connection from your client to review access.";
  if (reason === "invalid")
    return "This connection request is invalid or expired. Start again from your client.";
  return "This connection is unavailable. No approval was confirmed. Start again from your client.";
};

export interface ConsentDependencies {
  providerUrl: string;
  apiKey: string;
  identity: () => Promise<ConsentIdentity | null>;
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  fetch?: typeof globalThis.fetch;
}
export function createOAuthConsentService(deps: ConsentDependencies) {
  const provider = callbackUrl(deps.providerUrl);
  if (
    provider.search ||
    (provider.pathname !== "/" && provider.pathname !== "")
  )
    throw new ConsentError("invalid");
  const providerOrigin = provider.origin;
  const ensureOwner = async (owner: string) => {
    const identity = await deps.identity();
    if (!identity || identity.userId !== owner || !identity.accessToken)
      throw new ConsentError("account");
    return identity;
  };
  const providerRequest = async (
    owner: string,
    id: string,
    action?: "approve" | "deny",
  ) => {
    if (!validAuthorizationId(id)) throw new ConsentError("invalid");
    const identity = await ensureOwner(owner);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await (deps.fetch ?? globalThis.fetch)(
        `${providerOrigin}/auth/v1/oauth/authorizations/${id}${action ? "/consent" : ""}`,
        {
          method: action ? "POST" : "GET",
          headers: {
            apikey: deps.apiKey,
            Authorization: `Bearer ${identity.accessToken}`,
            ...(action ? { "Content-Type": "application/json" } : {}),
          },
          ...(action ? { body: JSON.stringify({ action }) } : {}),
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        },
      );
      if (!response.ok)
        throw new ConsentError(
          response.status === 401 || response.status === 403
            ? "account"
            : "unavailable",
        );
      const result = await readProviderJson(response);
      await ensureOwner(owner);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  };
  const rpc = async (
    owner: string,
    name: string,
    args: Record<string, unknown>,
  ) => {
    await ensureOwner(owner);
    const { data, error } = await deps.rpc(name, args);
    await ensureOwner(owner);
    if (error)
      throw new ConsentError(
        /revision_conflict|request_key_conflict/.test(error.message ?? "")
          ? "changed"
          : "unavailable",
      );
    return data;
  };
  return {
    async load(
      authorizationId: string,
      ownerId: string,
    ): Promise<ConsentContext> {
      const authorization = parseAuthorization(
        await providerRequest(ownerId, authorizationId),
        authorizationId,
        ownerId,
      );
      const policy = parsePolicy(
        await rpc(ownerId, "offtask_oauth_consent_details", {
          oauth_client_id: authorization.client.id,
        }),
        authorization.client.id,
      );
      return { authorization, policy, ownerId };
    },
    async decide(
      context: ConsentContext,
      decision: "approve" | "deny",
      permissions: ConsentPermission[],
      requestKey: string,
    ): Promise<string> {
      const { authorization, policy, ownerId } = context;
      const cancelPending = async (revision: string) => {
        try {
          await rpc(ownerId, "offtask_oauth_cancel_pending", {
            oauth_client_id: authorization.client.id,
            authorization_id: authorization.authorization_id,
            expected_revision: revision,
            request_key: `${requestKey}:cancel`,
          });
        } catch {
          // Expiry still closes pending intent. A changed/activated/other grant
          // must never be revoked or overwritten as cleanup for this request.
        }
      };
      let savedPendingRevision: string | null = null;
      if (decision === "approve") {
        const chosen = parsePermissions(permissions);
        if (
          chosen.some(
            (permission) => !policy.allowed_permissions.includes(permission),
          )
        )
          throw new ConsentError("invalid");
        const saved = object(
          await rpc(ownerId, "offtask_oauth_set_consent", {
            oauth_client_id: authorization.client.id,
            permissions: chosen,
            expected_revision: policy.grant?.revision ?? null,
            authorization_id: authorization.authorization_id,
            request_key: requestKey,
          }),
        );
        savedPendingRevision = text(object(saved.grant).revision, 64);
      } else if (
        policy.grant?.pending_authorization_id ===
        authorization.authorization_id
      ) {
        await cancelPending(policy.grant.revision);
      }
      try {
        const result = object(
          await providerRequest(
            ownerId,
            authorization.authorization_id,
            decision,
          ),
        );
        const redirect = verifiedProviderRedirect(
          result.redirect_url,
          authorization.redirect_uri,
        );
        const query = new URL(redirect).searchParams;
        if (
          decision === "approve"
            ? !query.get("code") || query.has("error")
            : query.get("error") !== "access_denied" || query.has("code")
        )
          throw new ConsentError("invalid");
        return redirect;
      } catch (error) {
        if (savedPendingRevision) await cancelPending(savedPendingRevision);
        if (error instanceof ConsentError && error.reason === "account")
          throw error;
        // A request may have reached the provider. Never silently replay it,
        // claim connection, or revoke an older grant in response to ambiguity.
        throw new ConsentError("uncertain");
      }
    },
  };
}
