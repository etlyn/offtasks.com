## Offtasks Website and Web App

The Offtasks public landing, legal, and support pages, plus the existing
authenticated task planner, built with React and Vite and maintained by Etlyn.

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

### Project Structure

```
src/
  App.tsx            # Public, guest, and authenticated routes
  components/        # Reusable UI building blocks
  screens/           # Landing, legal, account, and dashboard screens
  lib/               # Supabase client and data helpers
  providers/         # React context providers
scripts/             # Static SPA route copies for deployment
supabase/            # Shared Offtasks migrations and Edge Functions
```

Dark mode is driven by a lightweight theme switch that toggles the Tailwind `dark` class on the document root. Icons have been standardised on [`lucide-react`](https://lucide.dev/icons/).

### Supabase Schema

Both clients continue using the same Supabase contracts. This repository owns
the migrations and Edge Functions in `supabase/`, including `delete-account`.
Coordinate backend changes with `etlyn/offtasks-mobile`; extracting the native
app does not migrate or change the live Supabase project.

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
```

Enable Row Level Security on these tables and add policies that grant users access to rows where `user_id = auth.uid()`.

### Available Scripts

- `npm run dev` – start the Vite dev server
- `npm run build` – create a production build
- `npm run preview` – preview the production build locally

The existing GitHub Pages workflow builds `main` and publishes `build/` to the
`public` branch. Its existing `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` secret names are retained and mapped to Vite
variables. Domain and Vercel configuration remain unchanged. The native Xcode
Cloud workflow must be reconnected to the new mobile repository separately.

### Troubleshooting

- If Supabase configuration is missing during startup, verify `.env.local` contains `VITE_PUBLIC_SUPABASE_URL` and `VITE_PUBLIC_SUPABASE_ANON_KEY`.
- Guest login relies on Supabase auto-confirming email/password users. If email confirmation is enforced, either disable it for this project or manually confirm the generated guest account in Supabase Auth.
