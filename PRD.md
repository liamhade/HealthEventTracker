# Health Event Tracker

# Goal

The purpose of this project is to create a web-based application that I can easily use from my iPhone to track my health events. The app doesn't need to be hyper tailored to "health" tracking neccessarily, but that is what I'll use it for.

Users can log "events", which are objects that have:

- a `title`
- a `description`, which can contain text, images, or both
- zero or more `tags`, chosen from a user-managed set of options that users can create, rename, or remove
- a `start_time`, and an optional `end_time`. An event with no `end_time` is a point-in-time event (the default). An event with an `end_time` is a `span`.

The design should be minimal, sleak, and user-friendly. The color pallete should be white and light-blue for `light mode`, and black and dark-green for `dark mode`.

# Non-Goals

# Requirements

- The platform supports multiple users logging in.
- Users can take a picture with their device (or pick one from their photo library) and attach it to the `description`. An event can have multiple images.
- iPhone photos are supported: HEIC images are converted to JPEG/WebP and resized in the browser before upload.
- Events can have multiple tags.
- Multiple events can overlap in time
- Three main screens
	1. The `log` screen, which is essentially the hero page that just has a button that says log.
	2. The `calendar` view, which shows your events in a G-cal style in a calendar
	3. A `list` view which displays the events in chronological order.

# Tech Stack

The app is a frontend-only React app talking directly to Supabase. There is no custom backend service.

- **Frontend**: Vite + React + TypeScript, installable on the iPhone home screen as a PWA (`vite-plugin-pwa`)
- **Styling**: Tailwind CSS, with light and dark themes defined as theme tokens
- **Data fetching**: TanStack Query
- **Calendar**: Schedule-X
- **Dates**: date-fns
- **Image handling**: `browser-image-compression` (plus `heic2any` if needed) to convert and resize photos before upload
- **Backend**: Supabase
  - **Auth**: Supabase Auth (OAuth)
  - **DB**: Postgres, with Row Level Security so each user can only access their own rows
  - **Storage**: Supabase Storage for event images
  - **Server code (later)**: Supabase Edge Functions for things that can't run in the browser, such as LLM calls that need a secret API key
- **Hosting**: Vercel, Netlify, or Cloudflare Pages

## Data Model

- `events`: `id`, `user_id`, `title`, `description_text` (nullable), `start_time`, `end_time` (nullable; null means a point-in-time event)
- `event_images`: `id`, `event_id`, `storage_path`, `position`
- `tags`: `id`, `user_id`, `name`
- `event_tags`: `event_id`, `tag_id` (join table)

# Future Features

- LLM integration to look for insights in the data.
- Ability to import data from a health device. 

# Design Choices

# Open Questions