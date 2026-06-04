create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  full_name text,
  is_super_admin boolean not null default false
);

alter table public.profiles enable row level security;

create or replace function public.is_profile_super_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and is_super_admin = true
  );
$$;

drop policy if exists "profiles_select_own_or_super_admin" on public.profiles;
create policy "profiles_select_own_or_super_admin"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_profile_super_admin(auth.uid())
);

drop policy if exists "profiles_update_own_non_admin_fields" on public.profiles;
create policy "profiles_update_own_non_admin_fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and is_super_admin = false
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (
  id = auth.uid()
  and is_super_admin = false
);

insert into public.profiles (id, email, is_super_admin)
select id, email, true
from auth.users
where lower(email) = 'lamhatc1@gmail.com'
on conflict (id) do update
set email = excluded.email,
    is_super_admin = true,
    updated_at = now();
