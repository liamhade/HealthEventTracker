# Health Event Tracker

A mobile-first PWA for logging health events (point-in-time or spans) with descriptions, photos, and tags. See [PRD.md](PRD.md).

Frontend-only: Vite + React + TypeScript talking directly to Supabase (Auth, Postgres with RLS, Storage).

## Screens

- **Log** (`/`): the big "Log" button.
- **Calendar** (`/calendar`): Schedule-X day/week/month views. Tap an event to open it; tap an empty slot to log an event at that time.
- **List** (`/list`): events grouped by day, newest or oldest first.
- Plus event detail/edit, and **Settings** (theme, tag management, sign out).

All three main screens can be filtered by tag.

## Setup

```sh
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm run dev
```

### Supabase

The schema lives in [supabase/migrations](supabase/migrations) and has already been applied to project `yndtmgabapwkmpdlzsan`. It creates `events`, `event_images`, `tags`, and `event_tags` with owner-only RLS, plus a private `event-images` storage bucket whose files sit under `<user_id>/<event_id>/`.

You have to do these steps in the Supabase dashboard yourself:

1. **Auth → Providers**: enable the OAuth provider(s) you want (e.g. Google) and enter the client ID and secret.
2. **Auth → URL Configuration**: set the Site URL to your deployed origin, and add `http://localhost:5173` plus your deployed URL to the Redirect URLs.
3. Set `VITE_AUTH_PROVIDERS` (comma-separated, e.g. `google,apple`) to match the providers you enabled.

## Images

Photos come from the camera or the photo library. HEIC/HEIF files are converted to JPEG with `heic2any`, which loads lazily. Every image is then resized to at most 1600px and re-encoded in the browser with `browser-image-compression`. WebP is used where the browser can encode it, otherwise JPEG. Images are served through short-lived signed URLs.

## Deploy

`npm run build` writes a static site to `dist/`. Deploy it to Vercel, Netlify, or Cloudflare Pages with the same `VITE_*` env vars, and set up SPA fallback so every route serves `index.html`. Vercel and Netlify detect Vite automatically. On Cloudflare Pages, SPA fallback is the default.

To install on an iPhone, open the site in Safari, tap Share, then Add to Home Screen.

## Scripts

- `npm run dev`: dev server
- `npm run build`: typecheck and production build (includes the PWA service worker)
- `npm run lint`: oxlint
- `npm run generate-pwa-assets`: regenerate icons from `public/favicon.svg`
