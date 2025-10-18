## Offtasks Web App

Collaborative task planning dashboard built with Next.js 12, Tailwind CSS, Supabase, and lucide-react icons. The repository has been reorganised to follow a conventional `src/`-based layout with clear separation between components, domain features, shared hooks, and platform utilities.

### Prerequisites
- Node.js 16.x or newer (18.x works fine)
- npm 8+ or pnpm/yarn (examples below use npm)
- Supabase project with email/password auth enabled

### Quick Start
1. Install dependencies.
	```bash
	npm install
	```
2. Copy `.env.example` to `.env.local` and populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (find both under **Project Settings → API** in Supabase).
	```bash
	cp .env.example .env.local
	```
3. Start the development server.
	```bash
	npm run dev
	```
4. Visit `http://localhost:3000`.

### Project Structure

```
src/
  components/        # Reusable UI building blocks (Task modal, lists, layout, etc.)
  features/tasks/    # Task-specific orchestration such as the Supabase initialiser
  hooks/             # Shared client-side hooks (date helpers)
  lib/               # Supabase client + data helpers
  pages/             # Next.js routes (includes API routes)
  providers/         # React context providers (App state)
  styles/            # Global Tailwind entrypoint
  types/             # Shared TypeScript contracts
```

Dark mode is driven by a lightweight theme switch that toggles the Tailwind `dark` class on the document root. Icons have been standardised on [`lucide-react`](https://lucide.dev/icons/).

### Supabase Schema
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
```

Enable Row Level Security on both tables and add policies that grant users access to rows where `user_id = auth.uid()`.

### Available Scripts
- `npm run dev` – start the Next.js dev server
- `npm run build` – create a production build
- `npm run start` – run the production build locally
- `npm run lint` – run ESLint

### Troubleshooting
- If you see `Missing NEXT_PUBLIC_SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) during startup, verify `.env.local` is present and correctly populated.
- Guest login relies on Supabase auto-confirming email/password users. If email confirmation is enforced, either disable it for this project or manually confirm the generated guest account in Supabase Auth.
