-- Profiles: one row per auth user, holding app-level data.
--
-- Security model
--   * RLS is on. A signed-in user can read and update only their own row.
--   * Clients can change ONLY display_name (column-level grant). `plan` is
--     server-controlled, so a user cannot upgrade themselves to 'pro'.
--   * Rows are created by a trigger on signup. Clients cannot insert or delete.
--   * Account deletion is done by the delete-account edge function (service role),
--     which removes the auth user; this table cascades.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 80),
  constraint profiles_plan_valid check (plan in ('free', 'pro'))
);

comment on table public.profiles is 'App-level user data. One row per auth user.';
comment on column public.profiles.plan is 'Entitlement tier. Writable only by server-side code (service role).';

alter table public.profiles enable row level security;

-- Supabase grants broad table privileges by default; narrow them explicitly.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Keep updated_at honest.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when a user signs up. SECURITY DEFINER so it can insert
-- despite there being no client insert policy. Not callable as an API function.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 80),
      ''
    )
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
