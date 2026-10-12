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

### Sign-in

Users sign in with either OAuth (e.g. Google) or a username and password.

- Supabase Auth only knows emails, so a username account signs up with a hidden address, `u-<username>@example.com`. Usernames are unique, enforced by `public.profiles` ([migration](supabase/migrations/20261013000000_profiles_usernames.sql)).
- In Settings, a username account can add a **recovery email**. It replaces the hidden address, and the user keeps signing in with their username.
- Username sign-in and "Forgot password?" go through the [`username-auth` Edge Function](supabase/functions/username-auth/index.ts), which maps usernames to emails on the server so emails are never exposed. It is deployed with `verify_jwt = false` because callers aren't signed in yet. Reset links only go to accounts with a recovery email, and the response is the same either way.

### Supabase dashboard settings

You have to change these yourself:

1. **Auth → Providers:** enable the OAuth provider(s) you want and enter their client ID and secret. Set `VITE_AUTH_PROVIDERS` (comma-separated) to match.
2. **Auth → Sign In / Providers → Email:** turn **off "Confirm email"**, because hidden username addresses can't receive mail. Also turn **off "Secure email change"**, otherwise adding a recovery email also needs confirming from the hidden address.
3. **Auth → URL Configuration:** set the Site URL to your deployed origin, and add `http://localhost:5173/**` and `https://<your-domain>/**` to the Redirect URLs. Reset links only work for listed URLs.
4. **Auth → SMTP:** Supabase's built-in email only delivers to your organization's team members and is heavily rate-limited. Configure custom SMTP (e.g. Resend) so other users actually receive password-reset emails.
5. **Optional:** enable leaked password protection under Auth → Password Security.

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
