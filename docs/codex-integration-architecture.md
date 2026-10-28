# Offtasks MCP integration — architecture and acceptance

Implementation baseline: October 26, 2026. Source repositories were clean at
web `0ef46c7` and native `abc743d` before this work. The supplied implementation
brief is a product specification, not permission to operate unrelated records.

## Phase zero: actual owners

| Concern | Existing implementation | Integration |
| --- | --- | --- |
| Backend | This repo's `supabase/migrations`, Postgres/PostgREST and Deno app-only deletion function | Additive schema and atomic, owner-checked integration RPCs |
| Web | React/Vite, `src/screens/Dashboard.tsx`, `/app`; Vercel and GitHub Pages | Small Goals workbench using the same authenticated RPCs |
| Native | Separate `offtasks-mobile` repo; `Goals.screen.tsx`, `Dashboard.screen.tsx`, Supabase task repository and planner outbox | Goal-scoped Brief/Plan and Codex controls; ordinary planning stays unchanged |
| Identity | Supabase Auth PKCE, per-product sessions; shared Etlyn identity | Provider-supported OAuth, no replacement identity issuer |
| Authorization | `user_id = auth.uid()` owner RLS | One personal project per owner; no new organizations or fake Codex user |
| Goals | `planner_items(kind='goal', id=lower(label), value=JSON string)` | Rename-safe sidecar ID and linked document metadata; preserve old payloads |
| Requirements | Native notes in `planner_items` | Linked PRD note plus acceptance criteria/revision; UI-only authoring |
| Plans/results | Absent | Versioned plan/item links and append-only task work updates |
| Tasks | `tasks` UUIDs, `isComplete`, priority, date, scheduling `target_group` | Revision, optional execution target, dependencies and separate work stage |

`target_group` is scheduling, never a workflow status. Existing open/done
semantics stay intact; new work stages distinguish ready, in-progress, blocked
and awaiting-review without checking off the task. Result notes do not complete
tasks. Embedded note tasks remain one record in their parent note and are not
duplicated as standalone integration tasks in this initial release.

## Request boundary

`integrations/codex` is a separately runnable, private Node MCP package, not a
static Vite route. `/mcp` uses the official SDK's stateless Streamable HTTP.
Every request receives fresh verified identity and backend instances. The MCP
token must have the configured issuer, dedicated resource audience, permitted
OAuth client, expiry, integration permissions and an active session/grant check.
An ordinary Supabase `authenticated` audience is not an MCP resource token.

The resource token is never forwarded to PostgREST. A server-only internal
credential invokes `offtask_integration_read(operation,args,actor)` and
`offtask_integration_mutate(operation,args,actor)` with the **verified** subject.
Only the service role may supply that actor override; all operations still
resolve every object and relationship under the owner. Normal app clients omit
actor and use their existing user-bound session. Credentials never enter model
results, widget state, URLs or routine logs.

Read tools and the optional widget share domain handlers. UI result data is
escaped text. Tool context is bounded with explicit continuation and revision
binding; mutations require a stable request key and expected revisions. Applying
selected plan items is separate from saving a plan and never rewrites linked
tasks. SQL transaction/idempotency records are authoritative, not process caches.

## Provider and release gates

Current official Supabase documentation supports an OAuth 2.1 server but does
not support arbitrary application OAuth scopes. Standard OIDC scopes are not
write permission. Do not advertise invented scopes: configure actual provider
scopes separately from signed Offtasks permissions, client policy and active
grant/session verification. The OAuth policy migration, provider token hook,
first-party `/oauth/consent` page and service-only grant checker implement those
boundaries. The October 28 provider-binding migration also requires an approved,
matching authorization before pending permissions can activate.

On October 28 the owner chose the existing shared Supabase project, rather than
creating staging. Additive planner/import, integration and OAuth migrations and
the app-only deletion function are deployed. Cloud Run, the shared OAuth
server and token hook are enabled for a single registered Codex client. A
disposable account verified real provider consent, PKCE, local MCP read,
refresh, revocation and reconnect; actual user/host and two-client acceptance
remain. No model API key or agent scheduler is required. Assignment never grants
repository access or starts execution.

## Validation and rollback

Run the integration package's tests/typecheck/build, web typecheck/database/auth/
deletion tests/build, and native typecheck/focused tests. Disposable PGlite
checks establish SQL behavior, not hosted authorization. Real acceptance must
read an authorized goal, save a plan, materialize tasks once, append one result,
reject stale/foreign/revoked calls and observe changes in both clients. Widget
bridge behavior must also be exercised in a supported ChatGPT host; Codex text
support does not prove widget rendering.

Keep new client policies disabled until their boundaries are verified. Rollback starts by
disabling the adapter and revoking its OAuth grants, not deleting user work.
Additive integration records remain for inspection. Do not drop populated
tables or roll back shared identity/migrations without a backup and separate
approval. The existing app and app-only deletion retain their identity boundary.

## Primary contracts verified during discovery

- `supabase/migrations/20260912000000_device_planner_sync.sql`
- `supabase/migrations/20260927000000_validate_device_import.sql`
- `supabase/functions/delete-account/delete-account.ts`
- `src/lib/supabase.ts`, `src/App.tsx`, `src/types/supabase.ts`
- Native `src/lib/plannerSync.ts`, `src/lib/taskRepository.ts` and note task projection
- [OpenAI MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [OpenAI authentication](https://developers.openai.com/plugins/build/auth)
- [MCP Apps UI](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Supabase MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Supabase OAuth flows/scopes](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)

This note separates implementation, local tests, provider configuration,
deployment and actual host/two-client acceptance. None implies the others.
