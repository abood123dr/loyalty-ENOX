-- Restore platform administration access after strict owner RLS.
-- Store owners remain isolated to their own stores; the platform super admin
-- can manage all stores from the Super Admin console.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_super_admin = true
    );
$$;

create or replace function public.user_owns_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.stores
      where stores.id = target_store_id
        and stores.owner_user_id = auth.uid()
    );
$$;

drop policy if exists "stores_select_owner_only" on public.stores;
drop policy if exists "stores_insert_owner_only" on public.stores;
drop policy if exists "stores_update_owner_only" on public.stores;
drop policy if exists "stores_delete_owner_only" on public.stores;

create policy "stores_select_owner_or_platform_admin"
on public.stores for select
to authenticated
using (
  public.is_platform_admin()
  or owner_user_id = auth.uid()
);

create policy "stores_insert_owner_or_platform_admin"
on public.stores for insert
to authenticated
with check (
  public.is_platform_admin()
  or owner_user_id = auth.uid()
);

create policy "stores_update_owner_or_platform_admin"
on public.stores for update
to authenticated
using (
  public.is_platform_admin()
  or owner_user_id = auth.uid()
)
with check (
  public.is_platform_admin()
  or owner_user_id = auth.uid()
);

create policy "stores_delete_owner_or_platform_admin"
on public.stores for delete
to authenticated
using (
  public.is_platform_admin()
  or owner_user_id = auth.uid()
);
