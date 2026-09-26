# Public-site analytics — local candidate, 2026-09-26

Uses vendored `@etlyn/analytics@0.5.0-alpha.0`. Only `/`, privacy, support/contact and terms pages are allowlisted. Auth, reset and `/app` paths never produce analytics events. Page URLs omit query/hash; the shared SDK bounds campaign/referrer values. Contact conversions run after Supabase accepts the message; no form content is passed to analytics. The App Store link is a click, not an installation/conversion.

Set a registered public `VITE_ANALYTICS_APPLICATION_KEY` and collector URL only when the matching collector origin/events/properties have been reviewed. Empty key disables requests. The privacy page exposes a persistent browser opt-out; DNT/GPC prevent collection. No collector registration, deployment or package publication was performed.

Validation: production build and two route-boundary tests; SDK's 19 tests cover opt-out, private-route filtering and privacy signals. Live registration, delivered events and contact/RLS acceptance remain release checks. Keep this change on `codex/landing-analytics` separate from acceptance PR #3, which still requires review.
