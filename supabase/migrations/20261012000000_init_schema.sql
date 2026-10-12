-- Health Event Tracker: initial schema
-- Tables: events, event_images, tags, event_tags
-- Every row is scoped to its owner through Row Level Security.

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description_text text,
  start_time timestamptz not null,
  -- null means a point-in-time event; otherwise the event is a span
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_time is null or end_time >= start_time)
);

create index events_user_start_idx on public.events (user_id, start_time desc);

-- ---------------------------------------------------------------------------
-- event_images
-- ---------------------------------------------------------------------------
create table public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index event_images_event_idx on public.event_images (event_id, position);

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  created_at timestamptz not null default now()
);

create unique index tags_user_name_unique on public.tags (user_id, lower(name));

-- ---------------------------------------------------------------------------
-- event_tags (join table)
-- ---------------------------------------------------------------------------
create table public.event_tags (
  event_id uuid not null references public.events (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (event_id, tag_id)
);

create index event_tags_tag_idx on public.event_tags (tag_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_images enable row level security;
alter table public.tags enable row level security;
alter table public.event_tags enable row level security;

-- events: owner only
create policy "events_select_own" on public.events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "events_insert_own" on public.events
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "events_update_own" on public.events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "events_delete_own" on public.events
  for delete to authenticated using (user_id = (select auth.uid()));

-- tags: owner only
create policy "tags_select_own" on public.tags
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tags_insert_own" on public.tags
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tags_update_own" on public.tags
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "tags_delete_own" on public.tags
  for delete to authenticated using (user_id = (select auth.uid()));

-- event_images: allowed when the parent event belongs to the user
create policy "event_images_select_own" on public.event_images
  for select to authenticated using (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
  );
create policy "event_images_insert_own" on public.event_images
  for insert to authenticated with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
  );
create policy "event_images_update_own" on public.event_images
  for update to authenticated
  using (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
  );
create policy "event_images_delete_own" on public.event_images
  for delete to authenticated using (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
  );

-- event_tags: both the event and the tag must belong to the user
create policy "event_tags_select_own" on public.event_tags
  for select to authenticated using (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
  );
create policy "event_tags_insert_own" on public.event_tags
  for insert to authenticated with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
    and exists (select 1 from public.tags t
                where t.id = tag_id and t.user_id = (select auth.uid()))
  );
create policy "event_tags_delete_own" on public.event_tags
  for delete to authenticated using (
    exists (select 1 from public.events e
            where e.id = event_id and e.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket for event images, files live under <user_id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "event_images_storage_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "event_images_storage_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "event_images_storage_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "event_images_storage_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
