# Public ChatGPT plugin preparation

This is a submission draft, not a published plugin. It uses the owner's chosen
verified individual publisher name and the existing Offtasks icon. Its five
positive and three negative review cases are proposals: run them against a
dedicated sample account and record a reviewer-accessible video before review.
Do not use the owner's account or include credentials in the package.

A portal draft needs a client ID before it can show its callback. One possible
bootstrap is to register a separate public client with the temporary exact URI
`https://www.offtasks.com/oauth/chatgpt-public-pending`, with no enabled
Offtasks client policy or MCP allowlist entry. Once the portal reveals its exact
callback, replace the temporary URI; do not enable access until the policy and
authorization paths have been reviewed and tested.

Migration `20261028050000` implements status and revocation for separate
development/public clients, but it does not itself enable the public client.
Confirm that it is deployed, and preserve the private connection, before any
public policy or allowlist change. Supabase supports multiple exact redirect
URIs but recommends separate clients per environment. The portal also needs a
verified MCP domain challenge and a dedicated UI origin; the MCP server supports
the challenge through `OFFTASK_OPENAI_DOMAIN_CHALLENGE` once the portal issues
the exact value.

With the public client UUID, create a new output directory:

```sh
node integrations/chatgpt-public/prepare-package.mjs PUBLIC_OAUTH_CLIENT_UUID /absolute/new/output-directory
```

Review the generated files and create a ZIP of the *contents* of that directory
for the OpenAI portal. The script rejects the existing development client and
never overwrites an existing directory. It does not register or enable clients,
upload a ZIP, authenticate a reviewer, submit for review, or publish a listing.
Keep the live Connect action gated until OpenAI approves a public listing and
the matching OAuth policy is configured and verified for independent accounts.

The package configures an `openid`-only identity scope override. Offtasks
permissions are approved separately during the first-party consent flow. In an
October 28, 2026 portal test, the actual authorization request still included
`email`, `offline_access`, `profile`, and `phone` despite these overrides. The
reason is unconfirmed; OpenAI may retain existing connection settings or add
provider-advertised scopes. Do not claim reduced identity access until the
actual request, sign-in, refresh, and revocation have been verified.

Validation caveat (October 28, 2026): OpenAI's package guide documents the
`extensions.com.openai.auth` server field used here, but the linked Agent
Plugins 1.0.0 MCP JSON schema rejects that field as an additional property.
The root plugin manifest passes its schema; the MCP configuration follows the
OpenAI guide but does not pass the published portable MCP schema. Confirm the
portal's actual ingestion and resolve any finding before submission.

Sources: [OpenAI package guide](https://developers.openai.com/plugins/build/plugins),
[submission guide](https://developers.openai.com/plugins/deploy/submission), and
[Supabase OAuth client guidance](https://supabase.com/docs/guides/auth/oauth-server/getting-started).
