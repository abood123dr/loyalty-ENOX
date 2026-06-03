-- Tight tenant isolation so each store owner can only access their own store data.
-- Super admins keep platform-wide access through email or auth metadata role.

drop policy if exists "public can read active stores" on public.stores;
drop policy if exists "public can register store customers" on public.store_customers;
drop policy if exists "authenticated can manage stores" on public.stores;
drop policy if exists "authenticated can manage store customers" on public.store_customers;
drop policy if exists "authenticated can manage stamp scans" on public.stamp_scans;
drop policy if exists "authenticated can manage notifications" on public.notifications;

create policy "anon can read active stores"
on public.stores for select
to anon
using (is_active = true);

create policy "authenticated can manage owned stores"
on public.stores for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
  or owner_user_id = auth.uid()
  or lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
  or owner_user_id = auth.uid()
  or lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "anon can register active store customers"
on public.store_customers for insert
to anon
with check (
  exists (
    select 1
    from public.stores
    where stores.id = store_customers.store_id
      and stores.is_active = true
  )
);

create policy "authenticated can manage owned store customers"
on public.store_customers for all
to authenticated
using (
  exists (
    select 1
    from public.stores
    where stores.id = store_customers.store_id
      and (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
        or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or stores.owner_user_id = auth.uid()
        or lower(coalesce(stores.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = store_customers.store_id
      and (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
        or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or stores.owner_user_id = auth.uid()
        or lower(coalesce(stores.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create policy "authenticated can manage owned stamp scans"
on public.stamp_scans for all
to authenticated
using (
  exists (
    select 1
    from public.stores
    where stores.id = stamp_scans.store_id
      and (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
        or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or stores.owner_user_id = auth.uid()
        or lower(coalesce(stores.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
)
with check (
  exists (
    select 1
    from public.stores
    where stores.id = stamp_scans.store_id
      and (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
        or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or stores.owner_user_id = auth.uid()
        or lower(coalesce(stores.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create policy "authenticated can manage owned notifications"
on public.notifications for all
to authenticated
using (
  store_id is null
  or exists (
    select 1
    from public.stores
    where stores.id = notifications.store_id
      and (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
        or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or stores.owner_user_id = auth.uid()
        or lower(coalesce(stores.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
)
with check (
  store_id is null
  or exists (
    select 1
    from public.stores
    where stores.id = notifications.store_id
      and (
        lower(coalesce(auth.jwt() ->> 'email', '')) = 'lamhatc1@gmail.com'
        or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
        or stores.owner_user_id = auth.uid()
        or lower(coalesce(stores.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);
