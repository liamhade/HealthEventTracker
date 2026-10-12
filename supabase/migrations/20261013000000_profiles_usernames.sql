-- Usernames for password accounts.
-- Auth identifies users by email, so username accounts sign up with a synthetic address. Once a
-- user adds a recovery email, that address replaces the synthetic one, so the username -> user
-- mapping has to live here instead of being derived from the email.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- Create the profile when a username account signs up. A duplicate username raises a unique
-- violation, which aborts the sign-up.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (id, username)
    values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Backfill username accounts created before this migration.
insert into public.profiles (id, username)
select id, lower(raw_user_meta_data ->> 'username')
from auth.users
where raw_user_meta_data ? 'username'
on conflict do nothing;
