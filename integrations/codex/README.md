# Offtasks Codex / ChatGPT integration

The MCP service defaults to disabled in source. On October 28, 2026, the owner
chose the existing shared Supabase project instead of separate staging. The
additive migrations through `20261028010000`, deletion function, consent route
and OAuth policy were deployed. The later ChatGPT connection and task migrations
require their own rollout. Cloud Run is enabled for one pre-registered Codex
client; each user must sign in and explicitly choose Offtasks permissions. A
real user connection and ChatGPT/widget acceptance are separate checks.

## What is implemented

- Twelve MCP tools: projects/goals/tasks/context, goal and plan save, ordinary
  and selected plan task creation, task updates/results, and MCP Apps task and
  plan widgets. Synced tasks embedded in notes are listed read-only; edit them
  in Offtasks until conflict-safe note updates are supported. Undated ordinary
  tasks go to Later. Scheduling a date does not create a reminder.
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

Build creates `dist/`, `public/plan-widget.html` and `public/tasks-widget.html`;
these generated files are not source-controlled.
The generated HTML bundles the official MCP Apps bridge without CDN dependencies,
credentials or private records. `scripts/check-widget.mjs` optionally checks a
synthetic Chrome host; set `OFFTASK_PLAYWRIGHT_MODULE` to a locally installed
`playwright/index.mjs`. This is not actual ChatGPT acceptance.
`scripts/check-tasks-widget.mjs` exercises the task view with the same synthetic
host and checks narrow light/dark layout, pagination and disconnect clearing.

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
requests still require verified authorization when enabled. For new environments,
validate provider configuration before enabling an explicitly registered client.
Store internal keys in a secret manager limited to the dedicated runtime identity.

Prepare a private `.env` from `.env.example` in this package, not web's Vite
environment. Never prefix internal service/checker credentials with `VITE_`.
After verifying a private configuration:

```sh
node --env-file=.env dist/start.js
```

Disabled mode exposes no live MCP capability or misleading discovery.
There is no insecure development-token or authentication bypass.

## Remaining provider-dependent verification — do not skip

Supabase's standard OIDC scopes do not confer app write access. The deployed
checker uses a pinned provider storage contract and fails closed if that schema
is absent or unsupported. A disposable-account production exercise verified
ordinary sign-in, consent, PKCE exchange, local MCP read against the real
provider, refresh, revocation and re-consent. It did not establish a real
user's Codex/ChatGPT connection or native two-client acceptance. See
[authentication.md](docs/authentication.md).

## Production rollout and remaining gates

The existing `nqsclqtpnosuhoobgyxc` database has the planner/import, integration,
OAuth policy, grant checker, provider approval and returning-authorization
migrations; the app-only `delete-account` function is also deployed. The shared
Supabase OAuth server and access-token hook are configured, dynamic client
registration is disabled, and an explicit Codex public client uses a fixed
loopback callback. The live MCP endpoint is
`https://offtasks-mcp-qjloputrxa-ul.a.run.app/mcp`. Requests without valid
authorization receive a 401 challenge. Its Cloud Run identity can read only the
dedicated runtime secrets through Secret Manager.

No separate staging database was created. The temporary probe account and client
were removed after provider verification; use disposable accounts or approved
data for further validation. Actual Codex account approval, ChatGPT host and
widget behavior, and two-client app synchronization remain separate acceptance
checks. Additional hosts require a reviewed registration and explicit client
policy; a healthy process alone is not host acceptance.

## Connection and metadata refresh

Connect each intended host separately:

- ChatGPT is not yet registered or connected. First register its exact client
  and callback and add a matching explicit server policy; then create a private
  custom MCP server, review its tools and test in a **new** conversation. Check
  widget support in that actual host; text tools remain independent.
- Codex on the configured Mac: run `codex mcp login offtasks`, sign in, select
  access and continue back to Codex. The configured public client and fixed
  callback are specific to this server URL and local callback port. A different
  host or callback requires its own reviewed registration.
- Portable `plugin.json`/`mcp.json` are provided. The `.invalid` endpoint is
  deliberately not installable. Replace it only in a private configured copy;
  manifests never contain secrets.
- After tool/resource changes: rebuild/restart, refresh the connection metadata
  and use a new conversation. One installation does not configure every desktop
  or mobile surface or attach this existing conversation automatically.

The native Account screen can show the server's ChatGPT authorization state and
revoke that grant. `20261028020000_chatgpt_connection_status.sql` deliberately
does not classify or enable an existing client as ChatGPT. An operator must
register the exact ChatGPT OAuth callback, enable the corresponding allowlisted
client as `host_kind=chatgpt`, and set a verified public ChatGPT plugin listing
URL before the mobile Connect action is shown. A private custom MCP connection
is not a public listing. "Authorized" reports the Offtasks grant and provider
session, not whether the host has retained the plugin. Reconnect when necessary.
Guest items remain on their device unless the user explicitly imports them.

Existing Offtasks reminders are scheduled locally on the phone. The MCP service
does not yet offer reminder creation or promise delivery on a closed phone:
shared durable reminders and a verified push-delivery path are required first.

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
