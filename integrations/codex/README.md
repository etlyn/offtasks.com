# Offtasks Codex / ChatGPT integration

Private local implementation, **disabled by default**. This is not an installed
plugin, configured authorization server, hosted database rollout or public
release. The owner chose separate staging, then deferred setup until local work
is finished. Production data and provider settings remain unchanged.

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

Prepare a private `.env` from `.env.example` in this package, not web's Vite
environment. Never prefix internal service/checker credentials with `VITE_`.
With verified staging configuration later:

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

No staging project, live migration, hosted endpoint, host registration,
ChatGPT/Codex connection or native release has been created by local tests.
These remain provider configuration and acceptance gates, not just an API key
to paste into a completed service.

## Later isolated staging rollout

1. Create the separate Supabase staging project. Inspect its task/auth/role
   schema; never point development exercises at production.
2. Apply the existing planner/import migrations and reviewed additive integration
   migration in order through normal project tooling. Verify RLS for two real
   owners, protected documents and OAuth API-bypass guards.
3. Apply the OAuth policy/checker migrations, verify their provider contract,
   configure the consent path and compose the token hook. Enable only explicitly
   registered staging clients; configure actual issuer/JWKS, resource audience
   and exact host callbacks. Do not create a replacement Etlyn identity issuer.
4. Deploy the separate Node service privately behind HTTPS or a supported secure
   tunnel. The static Vite/Vercel/Pages deployment does **not** run this service.
5. Inspect discovery and calls with MCP Inspector, then authorize a private host
   connection. A healthy process is not provider or host acceptance.
6. Complete the real acceptance loop below before considering rollout.

## Connection and metadata refresh

After the staged service works:

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

Before declaring staging complete, separately record:

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
