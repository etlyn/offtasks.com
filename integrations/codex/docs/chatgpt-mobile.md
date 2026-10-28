# ChatGPT on mobile: rollout and remaining work

## Connection

The Offtasks account screen reports the Offtasks-side authorization for the
operator-configured ChatGPT client. It does not infer success from opening a
link. A guest must sign in before account data can be shared; guest data is
imported only through the existing explicit import flow. Authorization belongs
to the Offtasks user and client, while installation and connection state belong
to ChatGPT. Recheck the real host on every supported surface rather than
assuming a connection always survives a device or account change.

The existing production client is for Codex. ChatGPT requires its own exact
registered callback and allowlisted client. Supabase does not advertise RFC
9207 issuer identification, so do not substitute a guessed stable callback.
After ChatGPT provides the callback, register the public OAuth client with PKCE,
enable only its corresponding `host_kind=chatgpt` policy, and configure a
verified ChatGPT plugin listing URL only when that listing actually exists.
Dynamic registration remains disabled. Test consent, refresh, account switching,
reconnect and revocation with disposable accounts before enabling the client
for users. Submit and review the plugin before advertising a public install.

Migrations `20261028020000` through `20261028040000` and the corresponding MCP
service changes are additive candidates; source control is not evidence that
they are deployed. Apply the database functions before deploying a service
that calls them, and verify the exact migration and service revisions.

## Task and goal behavior

Undated tasks go to Later. A date is a calendar day, not a notification; the
model should ask for clarification when a requested date or time zone is
ambiguous. Task updates and goal edits use current revisions and stable retry
keys. Synced tasks embedded in notes are visible but read-only: the current
mobile note outbox can otherwise overwrite a remote edit made while a device
is offline. Do not claim those edits work until the note sync contract supports
conflict-safe changes and has multi-device tests.

## Reminders

Existing reminders are stored and scheduled locally on each phone. A remote
assistant cannot reliably schedule one while the app is closed. Do not expose a
reminder-writing tool that claims success until the following path works:

1. Store an account-owned reminder with a resolved time zone, UTC fire time,
   task identity, revision and idempotent operation key. Handle updates,
   cancellation, completion and deletion without resurrecting old reminders.
2. Register notification-capable devices to the correct account only after
   explicit device permission. Protect push tokens, remove them on sign-out or
   account deletion, and handle rejected or expired tokens.
3. Use a durable, retryable server scheduler and the appropriate Apple/Android
   push service. Provision Apple push capability and credentials separately;
   never put a signing key in the app, repository, chat or widget.
4. Reconcile existing device-local reminders and offline edits without dropping
   them or sending duplicate local and remote alerts. Define a clear fallback
   when network access or notification permission is unavailable.
5. Show the true state to ChatGPT and Offtasks. A saved reminder is not proof
   of notification delivery. Test a closed app, multiple devices, account
   switching, revocation, time-zone changes, retries and failure recovery on
   real devices before promising delivery.
