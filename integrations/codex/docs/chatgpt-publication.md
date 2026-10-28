# Public ChatGPT rollout

The private development plugin is not an installable public listing. The web
and mobile Connect controls remain unavailable until a verified public ChatGPT
listing is configured in the ChatGPT client policy. Do not use a personal
development-plugin URL for all users.

Before submission, use OpenAI's current [submission guide](https://developers.openai.com/plugins/deploy/submission)
and [UI reference](https://developers.openai.com/plugins/reference). The public
listing requires a verified publisher, a dedicated widget origin, a domain
verification challenge, automated scans, review of privacy and terms, a working
sample account, test cases, a video, and OpenAI approval. The first-load widget
failure observed in the personal host must also be diagnosed and retested on
desktop and mobile. The service does not create or deliver reminders.

The public portal may issue a different OAuth callback from the personal
development plugin. Register only the exact callback it provides, with PKCE,
and preserve existing account access. Migration `20261028050000` supports
separate private and public ChatGPT clients: account status aggregates the
owner's grants, and disconnect revokes all of them using a revision-bound,
idempotent operation. The migration does not register or enable a client; check
the actual deployed migration before configuring any additional policy. Keep
the public client outside the MCP allowlist and disabled in Offtasks until the
real callback and policy have been reviewed and tested. Dynamic registration
is intentionally disabled. Never put credentials, access tokens, or real user
data in the submission package or test video.

The MCP server can answer OpenAI's domain verification challenge at
`/.well-known/openai-apps-challenge` when `OFFTASK_OPENAI_DOMAIN_CHALLENGE` is
set to the exact value issued by the portal. The endpoint returns 404 when it is
unset. Configure it only for the domain being verified, check the returned
content exactly, and remove it when verification no longer requires it. A
portal-issued challenge and a dedicated widget origin still need verification.

## Proposed review cases

Run these with a dedicated account containing non-sensitive sample data; these
are proposed cases, not claims of review acceptance or completed host tests.

| Scenario | Prompt | Expected behavior |
| --- | --- | --- |
| Open tasks | Show my open tasks. | `list_tasks` returns only the review account's open tasks and the widget starts at the first page. |
| Later | Show tasks without a scheduled date. | `list_tasks` shows the relevant Later items without modifying them. |
| Goals | Show my goals. | `list_goals` returns the review account's goals. |
| Plan | Help me organize my selected goal. | `get_goal_context` obtains current context; changes require the user's approval. |
| Create task | Add “Review the plan” to Later. | `create_task` makes one account-owned task; retries do not duplicate it. |
| Ambiguous request | Update a task without identifying which one. | Ask the user to identify the task; do not guess or write. |
| Another user's data | Show another user's private tasks. | Decline or return no unauthorized records. |
| Unsupported reminder | Set a push reminder for tomorrow. | Explain that reminder creation and delivery are not available; do not claim it was scheduled. |

After approval and publication, configure the exact public listing URL and the
matching client policy, then test connection, reconnect, revocation, permissions,
and widget behavior using independent accounts and both ChatGPT surfaces.
