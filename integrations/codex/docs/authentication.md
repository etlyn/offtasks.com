# Authentication and private connection setup

The source defaults to disabled. The existing shared Supabase project now has
the additive migrations, OAuth server and tested token hook configured. Cloud
Run is enabled for one registered Codex client; individual users must consent.
A disposable account verified the provider flow, but real user, ChatGPT and
two-client acceptance remain separate.

## Provider setup

The owner chose the existing shared project instead of separate staging. Verify
OAuth 2.1, actual Auth schema/session policy, exact client callbacks and any
existing token hook before changing shared identity settings or enabling clients.
Preserve Etlyn's managed identity architecture.

Apply the existing planner/import chain, then these migrations in order:

- `20261026000000_codex_integration.sql`: owner-scoped domain and API guards.
- `20261026010000_codex_oauth_policy.sql`: private client policy, pending/active
  grants, consent RPCs and `offtask_mcp_access_token_hook(event jsonb)`.
- `20261026020000_codex_oauth_grant_checker.sql`: service-only fresh grant check.
- `20261028000000_codex_bind_provider_approval.sql`: require matching provider
  approval before pending permissions can activate.
- `20261028010000_codex_resume_authorization.sql`: reconstruct a returning
  owner’s approved provider request without exposing an authorization code.

These migrations alone do not enable OAuth, seed clients, register callbacks or
install the hook. The current deployment configured those separately for one
Codex client. Register the exact client/callback supplied by any additional host. As an operator, add its
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
`oauth_provider/authorization_code` token-hook call with a matching, unexpired
provider-approved owner/client authorization can activate it; an old session
refresh or unrelated unapproved request cannot elevate access. The UI does not blindly replay uncertain provider
decisions or claim that a connection is ready. Continue is an explicit link to
the previously verified registered callback plus standard OAuth response fields.
For an already-consented redirect-only response, the app retrieves matching
owner/client/callback details from server-owned provider state, verifies the
callback and state, and asks the user to review Offtasks permissions again.
Mismatched or expired requests fail closed.

The shared project had no existing access-token hook when this one was installed.
**Do not replace an existing hook blindly.** Ordinary sessions and unrelated
clients retain their claims. Real-provider authorization-code + PKCE, refresh,
revocation and returning consent passed with a disposable account; denial and
other boundaries have local tests. Actual target-host acceptance remains open.

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
types. The deployed session timebox and inactivity limits were disabled at rollout;
row presence alone does not reproduce policies if those settings change. Recheck
the provider version, session configuration and this checker before such changes.
Local schema fixtures and signed-token tests do not establish host acceptance.

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

For a verified private configuration, run `node --env-file=.env dist/start.js` behind HTTPS
or a supported private tunnel. Static Vite hosting does not run this service.
Preserve Host/Authorization, apply rate limits and avoid authorization/body logs.
`/health` reports configuration state, not provider or host readiness. Keep a
new deployment disabled until its provider checks pass.

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
