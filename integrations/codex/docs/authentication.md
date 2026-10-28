# Authentication and private connection setup

Disabled by default. The local implementation contains the resource server,
first-party consent UI, Supabase token hook and current-grant checker. Supabase
remains the authorization server. No provider configuration, hosted migration,
deployment or real ChatGPT/Codex connection has been performed.

## Isolated provider setup

Use the owner's selected **separate staging project**. Verify OAuth 2.1 server
availability, its actual Auth version and schema/session policy contract before
applying candidate migrations or enabling clients. Preserve Etlyn's managed
identity architecture and any existing token hook.

Apply the existing planner/import chain, then these migrations in order:

- `20261026000000_codex_integration.sql`: owner-scoped domain and API guards.
- `20261026010000_codex_oauth_policy.sql`: private client policy, pending/active
  grants, consent RPCs and `offtask_mcp_access_token_hook(event jsonb)`.
- `20261026020000_codex_oauth_grant_checker.sql`: service-only fresh grant check.

They do not enable OAuth, seed a client, register callbacks or install the hook.
Register the exact client/callback supplied by the host. As an operator, add its
real UUID to `offtask_oauth_clients` with the canonical HTTPS MCP resource,
approved read/write permissions and explicit enabled state. Policies default to
disabled. Never copy production secrets into staging.

Configure the provider's authorization path as `/oauth/consent`. This page uses
an ordinary signed-in session, validates current provider authorization details
and server-owned policy, and offers read-only or read-and-write access. It has
no planner taskbar. Login return retains only the opaque authorization ID; credentials
and external URLs are discarded. The isolated REST adapter uses official Auth
endpoints without upgrading the application's older Supabase SDK.

Consent stages pending intent. Only a trusted
`oauth_provider/authorization_code` token-hook call activates it; an old session
refresh cannot elevate access. The UI does not blindly replay uncertain provider
decisions or claim that a connection is ready. Continue is an explicit link to
the previously verified registered callback plus standard OAuth response fields.
An already-consented redirect-only response cannot establish that context and
fails closed. Restart using `prompt=consent` if supported by the deployed
provider/host, or revoke the previous grant before reconnecting.

Compose the hook with any existing shared-identity hook through normal Auth
configuration. **Do not replace an existing hook blindly.** Ordinary sessions and
unrelated clients retain their claims. Verify authorization-code + PKCE, denial,
refresh and revocation with the real provider/host before enabling MCP.

## Resource tokens and explicit app access

Supabase supports `openid`, `email`, `profile` and `phone`, not custom application
OAuth scopes. Standard OIDC scopes do not grant app write access. Optional
`OFFTASK_OAUTH_SCOPES` accepts only those real scopes; leave it empty until the
deployed access-token scope claims are verified.

For an enabled client with active explicit app consent, the hook preserves the
provider subject/session, sets a dedicated audience and adds this signed claim:

```json
{
  "aud": "https://YOUR_VERIFIED_MCP_HOST/mcp",
  "client_id": "REGISTERED_CLIENT_UUID",
  "offtasks_mcp": {
    "resource": "https://YOUR_VERIFIED_MCP_HOST/mcp",
    "permissions": ["read", "write"],
    "grant_revision": "1"
  }
}
```

Permissions and epoch come from server-owned consent/policy, never user metadata.
Revocation/regrant changes the epoch so old tokens cannot revive after approval.
The verifier checks ES256/RS256 signature, issuer, single dedicated audience,
allowlisted client, UUID subject/session, expiry/issue time, permissions and grant
revision. Generic `authenticated` tokens cannot authorize MCP. OAuth credentials
also cannot bypass it through ordinary app RPCs/tables or app-data deletion.

## Fresh session and grant verification

Every MCP request calls `offtask_oauth_check_grant(input jsonb)` using a server-only
Supabase service connection. Input contains verified subject/client/session,
issue/expiry time, resource, permissions and grant revision; no raw user bearer.
No authorization response is cached.

The checker verifies current app policy/grant/epoch and live provider user,
matching OAuth session, explicit `not_after`, unrevoked consent and undeleted
client. Missing/unsupported schema raises generic unavailability; missing/revoked
records return `{"active":false}`. Only actual `service_role` can call it, and it
never modifies provider tables.

Provider storage is **not an app-owned schema**. The checker pins official Auth
source `c3348e8f1cb31454e9783e4eb9eab1e71ad9652f` and validates expected column
types. Verify the deployed version before rollout. Session timebox, inactivity
and low-AAL policies also depend on provider configuration unavailable locally;
row presence does not reproduce them. Verify their actual staging behavior and
adapt the provider/checker arrangement before enabling if needed. Local schema
fixtures and signed-token tests do not establish hosted acceptance.

An independently verified external checker can optionally replace the built-in
RPC by setting **both** `OFFTASK_GRANT_CHECK_URL` and
`OFFTASK_GRANT_CHECK_CREDENTIAL`. It receives the same verified input by HTTPS
POST with a separate server-only Bearer credential. An active response must
contain matching `subject`, `client_id`, `session_id` and current `permissions`,
after checking resource/grant revision and actual revocation state. An inactive
response may be only `{"active":false}`. Streaming responses are capped at 16 KiB;
timeout/error/malformed responses return 503 without executing tools.

## Internal credential boundary

The MCP bearer is never forwarded to PostgREST. The internal service credential
calls only the grant checker and owner-checked domain RPCs, passing verified
subject as actor. SQL restricts overrides to actual service role and rechecks
ownership/relationships. First-party clients omit actor and use `auth.uid()`.
Credentials never enter client bundles, model results, widget state, manifests,
URLs or routine logs.

## Local use, verification and rollback

Use Node 24 and the package-local Yarn lockfile; see the parent README for tests.
Prepare private `.env` from `.env.example`, outside Vite. Configure exact issuer/
JWKS, canonical HTTPS resource, client UUIDs, hosts/origins, internal service
secret and at least 32 random characters for cursor signing. The default built-in
checker needs no separate checker endpoint or credential.

After verified staging setup, run `node --env-file=.env dist/start.js` behind HTTPS
or a supported private tunnel. Static Vite hosting does not run this service.
Preserve Host/Authorization, apply rate limits and avoid authorization/body logs.
`/health` reports configuration state, not provider readiness. Keep enablement
false until real checks pass.

Verify discovery/challenge, linking, owned-record reads, stale/read-only denial,
refresh/revocation and two-client sync. Use MCP Inspector, then actual ChatGPT and
Codex independently. The `.invalid` manifest is intentionally not installable;
replace it only in a private configured copy. Refresh metadata/new conversation
after schema changes. A plugin does not attach itself to an existing chat.

Rollback starts by disabling the adapter/client policy and revoking dedicated
grants. Retain ordinary sessions and app data. Do not undo shared identity or
drop populated tables. App-only deletion removes app access grants and data while
preserving shared provider identities.

## Primary references verified 2026-10-26

- [OpenAI OAuth](https://developers.openai.com/plugins/build/auth)
- [Connection/testing](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Supabase OAuth flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
- [Supabase token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)
- [Pinned session source](https://github.com/supabase/auth/blob/c3348e8f1cb31454e9783e4eb9eab1e71ad9652f/internal/models/sessions.go)
- [Pinned consent source](https://github.com/supabase/auth/blob/c3348e8f1cb31454e9783e4eb9eab1e71ad9652f/internal/models/oauth_consent.go)

SDK 1.32.2 and MCP Apps 1.7.5 are pinned together. Local checks remain distinct
from real provider, host and native-device acceptance.
