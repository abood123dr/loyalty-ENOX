-- Strict owner-only RLS.
-- This removes anonymous table access. Public pages must use Edge Functions
-- that return a deliberately limited payload.

alter table if exists public.stores enable row level security;
alter table if exists public.store_customers enable row level security;
alter table if exists public.stamp_scans enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.customers enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.rewards enable row level security;
alter table if exists public.wallet_passes enable row level security;

create or replace function public.user_owns_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stores
    where stores.id = target_store_id
      and stores.owner_user_id = auth.uid()
  );
$$;

drop policy if exists "anon can read active stores" on public.stores;
drop policy if exists "public can read active stores" on public.stores;
drop policy if exists "stores_select_owned_or_active_public" on public.stores;
drop policy if exists "authenticated can manage owned stores" on public.stores;
drop policy if exists "stores_write_owned" on public.stores;

create policy "stores_select_owner_only"
on public.stores for select
to authenticated
using (owner_user_id = auth.uid());

create policy "stores_insert_owner_only"
on public.stores for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "stores_update_owner_only"
on public.stores for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "stores_delete_owner_only"
on public.stores for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "anon can register active store customers" on public.store_customers;
drop policy if exists "public can register store customers" on public.store_customers;
drop policy if exists "store_customers_insert_public_active_store" on public.store_customers;
drop policy if exists "authenticated can manage owned store customers" on public.store_customers;
drop policy if exists "store_customers_manage_owned_store" on public.store_customers;

create policy "store_customers_select_owner_store"
on public.store_customers for select
to authenticated
using (public.user_owns_store(store_id));

create policy "store_customers_insert_owner_store"
on public.store_customers for insert
to authenticated
with check (public.user_owns_store(store_id));

create policy "store_customers_update_owner_store"
on public.store_customers for update
to authenticated
using (public.user_owns_store(store_id))
with check (public.user_owns_store(store_id));

create policy "store_customers_delete_owner_store"
on public.store_customers for delete
to authenticated
using (public.user_owns_store(store_id));

drop policy if exists "authenticated can manage owned stamp scans" on public.stamp_scans;
drop policy if exists "stamp_scans_manage_owned_store" on public.stamp_scans;

create policy "stamp_scans_select_owner_store"
on public.stamp_scans for select
to authenticated
using (
  public.user_owns_store(store_id)
  and exists (
    select 1
    from public.store_customers
    where store_customers.id = stamp_scans.customer_id
      and store_customers.store_id = stamp_scans.store_id
  )
);

create policy "stamp_scans_insert_owner_store"
on public.stamp_scans for insert
to authenticated
with check (
  public.user_owns_store(store_id)
  and exists (
    select 1
    from public.store_customers
    where store_customers.id = stamp_scans.customer_id
      and store_customers.store_id = stamp_scans.store_id
  )
);

create policy "stamp_scans_update_owner_store"
on public.stamp_scans for update
to authenticated
using (public.user_owns_store(store_id))
with check (
  public.user_owns_store(store_id)
  and exists (
    select 1
    from public.store_customers
    where store_customers.id = stamp_scans.customer_id
      and store_customers.store_id = stamp_scans.store_id
  )
);

create policy "stamp_scans_delete_owner_store"
on public.stamp_scans for delete
to authenticated
using (public.user_owns_store(store_id));

drop policy if exists "authenticated can manage owned notifications" on public.notifications;
drop policy if exists "notifications_manage_owned_store" on public.notifications;

create policy "notifications_select_owner_store"
on public.notifications for select
to authenticated
using (store_id is not null and public.user_owns_store(store_id));

create policy "notifications_insert_owner_store"
on public.notifications for insert
to authenticated
with check (store_id is not null and public.user_owns_store(store_id));

create policy "notifications_update_owner_store"
on public.notifications for update
to authenticated
using (store_id is not null and public.user_owns_store(store_id))
with check (store_id is not null and public.user_owns_store(store_id));

create policy "notifications_delete_owner_store"
on public.notifications for delete
to authenticated
using (store_id is not null and public.user_owns_store(store_id));

drop policy if exists "profiles_select_own_or_super_admin" on public.profiles;
drop policy if exists "profiles_read_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_non_admin_fields" on public.profiles;
drop policy if exists "profiles_update_own_non_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and is_super_admin = false);

create policy "profiles_update_own_non_admin"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and is_super_admin = false);

do $$
begin
  if to_regclass('public.customers') is not null then
    execute 'drop policy if exists "customers_manage_owned_store" on public.customers';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'customers' and column_name = 'store_id'
    ) then
      execute 'create policy "customers_owner_store_all" on public.customers for all to authenticated using (public.user_owns_store(store_id)) with check (public.user_owns_store(store_id))';
    end if;
  end if;

  if to_regclass('public.rewards') is not null then
    execute 'drop policy if exists "rewards_manage_owned_store" on public.rewards';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rewards' and column_name = 'store_id'
    ) then
      execute 'create policy "rewards_owner_store_all" on public.rewards for all to authenticated using (public.user_owns_store(store_id)) with check (public.user_owns_store(store_id))';
    end if;
  end if;

  if to_regclass('public.wallet_passes') is not null then
    execute 'drop policy if exists "wallet_passes_owner_store_all" on public.wallet_passes';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'wallet_passes' and column_name = 'store_id'
    ) then
      execute 'create policy "wallet_passes_owner_store_all" on public.wallet_passes for all to authenticated using (public.user_owns_store(store_id)) with check (public.user_owns_store(store_id))';
    end if;
  end if;

  if to_regclass('public.transactions') is not null then
    execute 'drop policy if exists "transactions_manage_owned_store" on public.transactions';
    execute 'drop policy if exists "transactions_manage_owned_customer_store" on public.transactions';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'transactions' and column_name = 'store_id'
    ) then
      execute 'create policy "transactions_owner_store_all" on public.transactions for all to authenticated using (public.user_owns_store(store_id)) with check (public.user_owns_store(store_id))';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'transactions' and column_name = 'customer_id'
    ) then
      execute 'create policy "transactions_owner_customer_store_all" on public.transactions for all to authenticated using (exists (select 1 from public.store_customers where store_customers.id = transactions.customer_id and public.user_owns_store(store_customers.store_id))) with check (exists (select 1 from public.store_customers where store_customers.id = transactions.customer_id and public.user_owns_store(store_customers.store_id)))';
    end if;
  end if;
end $$;
