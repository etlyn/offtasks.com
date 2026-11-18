## Offtasks Website and Web App

The Offtasks public landing, legal, and support pages, plus the signed-in
planner (Calendar, Later, Notes, Goals, search and statistics), built with
React and Vite and maintained by Etlyn. The planner follows the mobile app's
structure and look, and reads and writes the same account data.

The native iOS and Android app now lives in
[etlyn/offtasks-mobile](https://github.com/etlyn/offtasks-mobile), with its own
Git history, dependencies, native projects, and CI. Mobile releases no longer
build from this repository.

Acceptance suites are product-owned in [qa/manifest.json](qa/manifest.json).
Use the standalone E2E website to import a branch snapshot, perform tests and
generate reports. See [QA ownership and import instructions](qa/README.md).

### Prerequisites

- Node.js 24 (`nvm use`)
- Yarn 1.22.22 (via `npx yarn@1.22.22` or an existing installation)
- Supabase project with email/password auth enabled

### Quick Start

1. Install dependencies.
   ```bash
   nvm use
   npx --yes yarn@1.22.22 install --frozen-lockfile
   ```
2. Copy `.env.example` to `.env.local` and populate `VITE_PUBLIC_SUPABASE_URL` and `VITE_PUBLIC_SUPABASE_ANON_KEY` (find both under **Project Settings → API** in Supabase). Use the public anonymous key, never a service-role key.
   ```bash
   cp .env.example .env.local
   ```
3. Start the development server.
   ```bash
   npm run dev
   ```
4. Open the URL printed by Vite.

To work on the interface without an account, run the site against the local
sample backend instead. It keeps example tasks, notes and goals in memory and
never contacts the real service:

```bash
yarn dev:sample
```

Then open http://127.0.0.1:9500 and sign in with the sample account from
`scripts/sample-data.mjs`. `POST http://127.0.0.1:54399/__sample/reset` restores
the examples; send `{"empty": true}` for an account with nothing in it.

### Project Structure

```
src/
  App.tsx            # Public, guest, and authenticated routes
  screens/           # Landing, legal, sign-in, consent, and the planner shell (Dashboard.tsx)
  planner/           # Planner pages, shared pieces, and the data rules shared with mobile
  components/        # Goals workspace, public page pieces, ChatGPT connection
  styles/            # base.css (tokens and controls), planner.css, public.css
  lib/               # Supabase client, theme, goal and sign-in helpers
  providers/         # React context providers
scripts/             # Static SPA route copies, and the local sample backend
supabase/            # Shared Offtasks migrations and Edge Functions
```

### Design

The interface is written in plain CSS on a small set of tokens in
`src/styles/base.css`. Colours, type sizes, radii, shadows and motion come from
the mobile app (the "Offtasks Mobile" variables in the Offtasks Figma file), so
a change there should be mirrored here. Sizes use `rem` and breakpoints use
`em`, so the layout follows the reader's text size. Below 900px the planner is
laid out like the phone app (menu and search in the header, a floating dock with
the plus beside it); from 900px the dock moves into the header.

Light is the default appearance. Dark is chosen in the account panel, kept in
this browser, and saved to the account's `user_preferences.theme_mode` so the
phone and the web agree. Icons come from [`lucide-react`](https://lucide.dev/icons/).

### What the planner shares with mobile

- Tasks live in `tasks`. A task sits on the day in its `date`; tasks without a
  date are in Later. Completing a task sets `isComplete` and `completed_at` and
  never moves it. A goal is attached through the task's `label`.
- Notes and saved goal names live in `planner_items`. A note may carry its own
  tasks and a paper colour; removing a note or goal marks the row `deleted`.
  Goal briefs are notes whose id starts with `offtask-prd:`; they are edited
  from Goals and never listed in Notes.
- A goal's colour and emoji are kept per browser, as they are per device on
  mobile. Goal logos are saved to the account.
- Return to Later is an explicit, per-browser choice. Only when it is on do
  unfinished tasks from past days lose their date.
- Reminders are local notifications on the phone and are not part of the web.

### Supabase Schema

Both clients continue using the same Supabase contracts. This repository owns
the migrations and Edge Functions in `supabase/`, including `delete-account`.
Coordinate backend changes with `etlyn/offtasks-mobile`; extracting the native
app does not migrate or change the live Supabase project.

`delete-account` is an **app-only deletion** flow. It deletes Offtasks-owned
rows for the signed-in user, returns a success payload describing retained
identity, and expects the client to sign out locally afterward. It does **not**
delete the shared Supabase Auth user, because Auth is shared across Etlyn apps.
Global identity deletion remains future shared-backend work and requires a
separate, explicitly re-authenticated flow.

Create the following tables in Supabase (adjust types as needed):

```sql
-- Tasks that power the main kanban columns
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  isComplete boolean not null default false,
  date date not null default now(),
  priority int not null default 0,
  target_group text not null default 'today' check (target_group in ('today','tomorrow','upcoming','close')),
  inserted_at timestamp with time zone default timezone('utc', now())
);

-- Lightweight profile record (created on first login)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Per-user UI preferences shared by web and mobile
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hide_completed boolean not null default false,
  advanced_mode boolean not null default false,
  theme_mode text not null default 'Light' check (theme_mode in ('Light', 'Dark')),
  auto_arrange boolean not null default false,
  updated_at timestamp with time zone not null default timezone('utc', now())
);

-- Device-synced notes and goals shared by web and mobile
create table if not exists public.planner_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note', 'goal')),
  id text not null,
  value jsonb not null,
  deleted boolean not null default false,
  primary key (user_id, kind, id)
);
```

Enable Row Level Security on these tables and add policies that grant users access to rows where `user_id = auth.uid()`.

### Available Scripts

- `npm run dev` – start the Vite dev server
- `yarn dev:sample` – start the site against the local sample backend
- `npm run build` – create a production build
- `npm run preview` – preview the production build locally
- `yarn test:planner` – check the planner's date, note, goal and search rules

The existing GitHub Pages workflow builds `main` and publishes `build/` to the
`public` branch. Its existing `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` secret names are retained and mapped to Vite
variables. Domain and Vercel configuration remain unchanged. The native Xcode
Cloud workflow must be reconnected to the new mobile repository separately.

### Troubleshooting

- If Supabase configuration is missing during startup, verify `.env.local` contains `VITE_PUBLIC_SUPABASE_URL` and `VITE_PUBLIC_SUPABASE_ANON_KEY`.
- Managed sign-in and recovery use the shared Etlyn Apps provider with email confirmation enabled; verify the configured callback when testing recovery.
- Sign-in and registration also offer Continue with Google, using the same shared identity. Google returns to the exact existing `/app` callback on the initiating host; validated planner/consent navigation stays in tab-local storage. That callback view exchanges the PKCE code once, while password recovery keeps its existing handler. Ordinary sign-in has no MFA gate. Run `yarn test:google-auth` for the callback contracts.
- Password resets for accounts with two-factor authentication require a code from a verified authenticator or registered phone before saving. The reset page offers a security-check retry and support link when verification is unavailable; an email reset link does not disable MFA.
- Run `yarn test:password-recovery` for recovery-session and MFA-gating regression checks.

### Isolated planner database validation

Run `yarn test:database` for PostgreSQL migration/RLS/import tests in an ephemeral PGlite database. The harness reproduces the documented pre-existing tasks table and `auth.uid()` role contract, then applies the real planner migrations. It checks tenant isolation, anonymous denial, atomic rollback, duplicate retry, edit preservation and embedded note-task persistence. It does not exercise hosted Supabase/PostgREST, mobile networking or production policies.

Migration `20260927000000_validate_device_import.sql` rejects null/non-object payloads and missing/non-array collections before writes. Apply it through the normal migration flow after isolated validation; it has not been applied to a hosted database by these tests.
