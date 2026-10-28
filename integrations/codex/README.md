# Offtasks Codex / ChatGPT integration

The MCP service is **disabled by default**. On October 28, 2026, the owner chose
the existing shared Supabase project instead of a separate staging project. The
additive database migrations and app-only deletion function are deployed; Cloud
Run hosts a disabled service. OAuth server, client policy and the shared token
hook remain unconfigured, so this is not yet a connected or usable integration.

## What is implemented

- Ten MCP tools: projects/goals/tasks/context, plan save, selected task creation,
  task updates/results and an optional MCP Apps plan widget.
- One personal owner-scoped project; stable goal metadata preserves existing
  category strings. PRDs reuse protected note records; ordinary Notes cannot
  silently overwrite their revision-checked edits.
- Atomic SQL writes, CAS revisions, payload-bound retry keys, unique plan-item
  task links, dependency checks and append-only progress/audit.
- Existing open/done completion plus separate work stages. Codex assignment is
  intent only, never a runner, scheduler, fake human owner or model API key.
- Web/mobile goal workspaces: Brief/Plan, stale requirements, execution
  target/filter and result history. Ordinary Calendar/Later flows stay intact.
- Signed resource-token checks, per-request authorization, OAuth metadata and
  challenges, bounded transport and no bearer forwarding.
- A first-party consent page, disabled-by-default client policies, provider
  access-token hook and service-only current-grant/session checker. Pending
  consent cannot elevate an old session; grant epochs invalidate old tokens.
- Bounded typed results and signed account/selection/revision-bound context
  continuation. Fetch **every** fragment and concatenate before interpreting
  complete requirements.

## Run locally

Use Node 24 and Yarn 1.22.22. From the web repository:

```sh
yarn install --frozen-lockfile
yarn test:codex
yarn typecheck
yarn test:database
yarn test:delete-account
yarn test:password-recovery
yarn build
```

The private package has its own pinned dependencies and lockfile:

```sh
cd integrations/codex
yarn install --frozen-lockfile
yarn typecheck
yarn test
yarn build
```

Build creates `dist/` and `public/plan-widget.html`; neither is source-controlled.
The generated HTML bundles the official MCP Apps bridge without CDN dependencies,
credentials or private records. `scripts/check-widget.mjs` optionally checks a
synthetic Chrome host; set `OFFTASK_PLAYWRIGHT_MODULE` to a locally installed
`playwright/index.mjs`. This is not actual ChatGPT acceptance.

The included Dockerfile builds the widget and Node service with the package's
pinned lockfile, prunes development dependencies, and runs as an unprivileged
user. `.gcloudignore` and `.dockerignore` exclude live `.env` files and generated
dependencies from uploads. A Cloud Run service can start disabled while its
provider, restricted service account and secret references are configured:

```sh
gcloud run deploy offtasks-mcp --source . --project YOUR_PROJECT --region YOUR_REGION \
  --service-account YOUR_DEDICATED_SERVICE_ACCOUNT --min-instances 0 \
  --max-instances 2 --allow-unauthenticated --set-env-vars OFFTASK_MCP_ENABLED=false
```

Allowing unauthenticated network access makes OAuth discovery reachable; MCP
requests still require verified authorization when enabled. Keep the flag false
until the documented provider and real-host checks pass. Store internal keys in
a secret manager with access limited to the dedicated runtime service account.

Prepare a private `.env` from `.env.example` in this package, not web's Vite
environment. Never prefix internal service/checker credentials with `VITE_`.
After verifying a private configuration:

```sh
node --env-file=.env dist/start.js
```

Disabled mode exposes no live MCP capability or misleading discovery.
There is no insecure development-token or authentication bypass.

## Remaining provider-dependent verification — do not skip

The consent UI, provider hook and SQL checker are implemented and tested locally.
They have **not** been configured or exercised against a real Supabase provider.
Supabase's standard OIDC scopes do not confer app write access. The checker uses
a pinned provider storage contract and fails closed if that schema is absent or
unsupported. Verify the deployed provider version and session policies, compose
the hook with any existing shared-identity hook, and exercise actual consent,
code exchange, refresh and revocation before enabling. See
[authentication.md](docs/authentication.md).

## Production rollout and remaining gates

The existing `nqsclqtpnosuhoobgyxc` database has the planner/import, integration,
OAuth-policy, grant-checker and provider-approval-binding migrations. The
`delete-account` function is deployed. The hosted service currently runs with
`OFFTASK_MCP_ENABLED=false` at `https://offtasks-mcp-qjloputrxa-ul.a.run.app`;
its 503 response is intentional and is not proof of provider readiness.

No separate staging database was created. Before enabling the service, register
the actual host's exact callback and client, verify the shared site's consent
route and allowed origins, install the compatible shared-identity token hook,
configure restricted runtime secrets and resource/issuer/client values, and
exercise authorization, refresh and revocation against the real provider. Use
an explicitly disposable account or approved data for validation. Do not modify
other users' data. A healthy process alone is not host acceptance.

## Connection and metadata refresh

After provider and host acceptance:

- ChatGPT: Plugins → plus → Add custom MCP server. Enter the verified `/mcp`
  endpoint or secure tunnel, configure provider authentication, review tools and
  install privately. Test in a **new** conversation. Check widget support in that
  actual host; text tools remain independent.
- Codex: connect independently, for example
  `codex mcp add offtasks --url https://YOUR_VERIFIED_HOST/mcp`, then
  `codex mcp login offtasks`. For a predefined client, supply its real client ID
  and register the exact callback the client displays; never guess it.
- Portable `plugin.json`/`mcp.json` are provided. The `.invalid` endpoint is
  deliberately not installable. Replace it only in a private configured copy;
  manifests never contain secrets.
- After tool/resource changes: rebuild/restart, refresh the connection metadata
  and use a new conversation. One installation does not configure every desktop
  or mobile surface or attach this existing conversation automatically.

Primary references:
[connection/testing](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Acceptance and evidence

Local tests cover genuinely signed JWTs with injected authority, actual SDK HTTP
clients, real SQL functions in disposable PGlite and an SDK→SQL workflow.
Mocks establish adapter/bridge behavior, not live OAuth/provider readiness.

Before declaring the integration ready, separately record:

- A real account reads a current goal and complete PRD through the target host.
- Plan saves reject stale source revisions; applying twice creates tasks once.
- Progress retries create one result and leave completion for user review.
- Foreign IDs, stale plans, expired/revoked grants and read-only writes fail.
- Web and simulator/physical native refresh show the same plan/target/result.
- Actual ChatGPT handles refresh, conflicts, disconnect and message handoff;
  unsupported hosts retain the text-only flow.

## Rollback

Disable the adapter/route and revoke dedicated grants first. Keep ordinary
sessions and user data. Stop integration writes before reverting clients.
Do not drop populated tables, reset shared identity, erase guest data or undo
unrelated migrations. A destructive data rollback requires backups and separate
approval.

See [authentication](docs/authentication.md). In a source checkout, also see
the [architecture note](../../docs/codex-integration-architecture.md).
