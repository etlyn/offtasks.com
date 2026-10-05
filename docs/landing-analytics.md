# Public-site analytics

Uses vendored `@etlyn/analytics@0.5.0-alpha.0`. Only `/`, privacy, support/contact and terms pages are allowlisted. Auth, reset and `/app` paths never produce analytics events. Page URLs omit query/hash; the shared SDK bounds campaign/referrer values. Contact conversions run after Supabase accepts the message; no form content is passed to analytics. The App Store link is a click, not an installation/conversion.

Set a registered public `VITE_ANALYTICS_APPLICATION_KEY` and collector URL only when the matching collector origin/events/properties have been reviewed. Empty key disables requests. The privacy page exposes a persistent browser opt-out; DNT/GPC prevent collection. Main integration includes the bounded collector adapter; an empty application key continues to disable requests. Collector registration and delivery must be verified separately.

Validation: production build and two route-boundary tests; SDK's 19 tests cover opt-out, private-route filtering and privacy signals. Live registration, delivered events and contact/RLS acceptance remain release checks. The October 4 main integration also retains product-owned acceptance assets and the isolated planner import contracts. TypeScript uses [bundler module resolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html) so the SDK package exports resolve as they do in Vite.
