# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Vite dev server on http://localhost:5173. It needs `.env.local` (copy `.env.example`).
- `npm run build`: runs `tsc -b`, then `vite build`, which includes the PWA service worker. The typecheck happens here; there is no separate typecheck script.
- `npm run lint`: oxlint, configured in `.oxlintrc.json`. Four warnings are known and accepted: `only-export-components` on the context hooks in `src/hooks/auth.tsx` and `src/hooks/theme.tsx`, and `react(purity)` on `new Date()` in `LogPage`.
- `npm run generate-pwa-assets`: regenerates the PWA icons from `public/favicon.svg`.

There is no test suite.

## Architecture

The app is a frontend-only React 19 + Vite + TypeScript PWA that talks directly to Supabase, with no custom backend. The product spec is in `PRD.md`. Data access is protected by Postgres Row Level Security, not by app code.

### Data layer
- `src/lib/api.ts` is the only module that queries tables or Storage. Events are fetched with their relations embedded (`*, tags(id, name), event_images(...)`, where PostgREST resolves `tags` through the `event_tags` join table). Results are paged past Supabase's 1000-row limit.
- `saveEvent` handles both create and update. It inserts or updates the event row, then diffs images and tags against the previous version: removed images are deleted (row, then a best-effort Storage delete), new ones are uploaded, positions are re-numbered, and tag links are added or removed. The steps are not transactional.
- `src/hooks/queries.ts` wraps the API in TanStack Query. All screens share the single `['events']` query. `useEvent(id)` reads from that cached list rather than fetching on its own, and mutations invalidate it.
- `src/lib/database.types.ts` holds the Supabase-generated types. Regenerate it after schema changes; the Supabase MCP's `generate_typescript_types` can do this.

### Schema (`supabase/migrations/`)
- The tables are `events`, `event_images`, `tags`, `event_tags`, and `profiles`. Every policy restricts rows to their owner. The child tables (`event_images`, `event_tags`) check ownership through the parent `events` row.
- Images live in the private `event-images` bucket at `<user_id>/<event_id>/<uuid>.<ext>`. The Storage policies check the first folder segment against `auth.uid()`, and the page displays images through signed URLs (`useSignedUrls`).
- `events.end_time = null` means a point-in-time event; a non-null value makes it a span.

### Auth (spread across several files)
- **OAuth**: providers come from `VITE_AUTH_PROVIDERS`. The browser client uses the PKCE flow (`src/lib/supabase.ts`).
- **Username + password**: Supabase Auth only knows emails, so sign-up uses a synthetic `u-<username>@example.com` address (`src/lib/username.ts`). The `profiles` table, populated by a trigger on `auth.users` from `raw_user_meta_data.username`, is the source of truth for usernames and keeps them unique.
- **Recovery email**: adding one in Settings runs `auth.updateUser({ email })`, which replaces the synthetic address. After that the username can't be turned back into an email on the client, so **username sign-in and password reset always go through the `username-auth` Edge Function** (`supabase/functions/username-auth`, called from `src/lib/usernameAuth.ts`). The function looks up the email with the service role and never returns it. It is deployed with `verify_jwt = false` because callers aren't signed in yet.
- **Reset links** use the implicit flow, so they arrive with tokens in the URL hash, which the PKCE client would reject. `src/lib/supabase.ts` takes the hash *before* `createClient` runs. `AuthProvider` then calls `setSession` and sets `recovering`, and `App.tsx` shows `SetNewPasswordPage` until a new password is saved.
- Changing the auth flow depends on Supabase dashboard settings: "Confirm email" and "Secure email change" must be off, the Redirect URLs must be configured, and custom SMTP is needed for real reset emails. The README lists these.

### UI
- The routes in `App.tsx` are three tab screens inside `TabLayout` (Log `/`, Calendar `/calendar`, List `/list`), plus full-screen pushed routes for event detail, new and edit, and Settings.
- `CalendarPage` is lazy-loaded because Schedule-X is heavy. Schedule-X v4 uses Temporal (`temporal-polyfill`, pinned to the exact version its peer dependency requires, and loaded globally in `main.tsx`). Its callbacks are captured once at creation, which is why navigation goes through a ref. Point events are drawn with a fake 30-minute duration so they can be tapped.
- Images are processed in the browser before upload (`src/lib/images.ts`). HEIC is converted with `heic2any`, which is imported dynamically, then resized to 1600px and encoded as WebP, falling back to JPEG where canvas can't encode WebP.

### Styling
- Tailwind v4 with no config file. The theme tokens are CSS variables in `src/index.css`: `:root` holds the light theme (white and light blue) and `.dark` the dark theme (black and dark green). They are exposed through `@theme inline` as utilities such as `bg-surface`, `text-muted`, and `bg-accent`. Use these tokens, not raw colors.
- Dark mode is driven by the `.dark` class on `<html>`, set by `ThemeProvider` and by an inline script in `index.html` that prevents a flash of the wrong theme. Schedule-X's `--sx-*` variables are remapped to the same tokens under `.app-calendar`.
- The design targets an iPhone PWA. Form controls stay at a 16px font size, because iOS zooms into anything smaller. The `pt-safe` and `pb-safe` utility classes pad for the safe-area insets.

## Deployment

The app is deployed to Vercel from GitHub `main`. `vercel.json` pins the Vite build and output settings and adds an SPA rewrite to `index.html`. Vercel needs the `VITE_*` env vars; they are build-time values, so redeploy after changing them. The Supabase project is linked through `.mcp.json` (project ref `yndtmgabapwkmpdlzsan`). Migrations and Edge Functions are applied with the Supabase MCP tools, not the CLI.

## Conventions

- The code style has no semicolons, uses single quotes, and wraps at about 120 characters. There is no Prettier config, so pass these options explicitly if you run Prettier.
- On Windows, set `encoding='utf-8'` explicitly when editing files with Python. The default cp1252 can crash on characters like `–` or `→`, and the file is truncated before the error is raised.
