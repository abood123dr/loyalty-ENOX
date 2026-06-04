-- Enterprise tenant isolation hardening.
-- This migration is intentionally defensive: optional product tables are only
-- hardened when they already exist in the database.

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
      where id = auth.uid()
        and is_super_admin = true
    );
$$;

create or replace function public.owns_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stores
    where id = target_store_id
      and (
        public.is_platform_admin()
        or owner_user_id = auth.uid()
        or lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

alter table if exists public.stores enable row level security;
alter table if exists public.store_customers enable row level security;
alter table if exists public.stamp_scans enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.customers enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.rewards enable row level security;

drop policy if exists "stores_select_owned_or_active_public" on public.stores;
create policy "stores_select_owned_or_active_public"
on public.stores for select
using (
  (auth.role() = 'anon' and is_active = true)
  or public.is_platform_admin()
  or owner_user_id = auth.uid()
  or lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "stores_write_owned" on public.stores;
create policy "stores_write_owned"
on public.stores for all
to authenticated
using (
  public.is_platform_admin()
  or owner_user_id = auth.uid()
  or lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_platform_admin()
  or owner_user_id = auth.uid()
  or lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "store_customers_insert_public_active_store" on public.store_customers;
create policy "store_customers_insert_public_active_store"
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

drop policy if exists "store_customers_manage_owned_store" on public.store_customers;
create policy "store_customers_manage_owned_store"
on public.store_customers for all
to authenticated
using (public.owns_store(store_id))
with check (public.owns_store(store_id));

drop policy if exists "stamp_scans_manage_owned_store" on public.stamp_scans;
create policy "stamp_scans_manage_owned_store"
on public.stamp_scans for all
to authenticated
using (
  public.owns_store(store_id)
  and exists (
    select 1
    from public.store_customers
    where store_customers.id = stamp_scans.customer_id
      and store_customers.store_id = stamp_scans.store_id
  )
)
with check (
  public.owns_store(store_id)
  and exists (
    select 1
    from public.store_customers
    where store_customers.id = stamp_scans.customer_id
      and store_customers.store_id = stamp_scans.store_id
  )
);

drop policy if exists "notifications_manage_owned_store" on public.notifications;
create policy "notifications_manage_owned_store"
on public.notifications for all
to authenticated
using (store_id is null or public.owns_store(store_id))
with check (store_id is null or public.owns_store(store_id));

drop policy if exists "profiles_read_own_or_admin" on public.profiles;
create policy "profiles_read_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_platform_admin());

drop policy if exists "profiles_update_own_non_admin" on public.profiles;
create policy "profiles_update_own_non_admin"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and is_super_admin = false);

do $$
begin
  if to_regclass('public.customers') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'customers' and column_name = 'store_id'
     ) then
    execute 'drop policy if exists "customers_manage_owned_store" on public.customers';
    execute 'create policy "customers_manage_owned_store" on public.customers for all to authenticated using (public.owns_store(store_id)) with check (public.owns_store(store_id))';
  end if;

  if to_regclass('public.rewards') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'rewards' and column_name = 'store_id'
     ) then
    execute 'drop policy if exists "rewards_manage_owned_store" on public.rewards';
    execute 'create policy "rewards_manage_owned_store" on public.rewards for all to authenticated using (public.owns_store(store_id)) with check (public.owns_store(store_id))';
  end if;

  if to_regclass('public.transactions') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'transactions' and column_name = 'store_id'
     ) then
    execute 'drop policy if exists "transactions_manage_owned_store" on public.transactions';
    execute 'create policy "transactions_manage_owned_store" on public.transactions for all to authenticated using (public.owns_store(store_id)) with check (public.owns_store(store_id))';
  elsif to_regclass('public.transactions') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'transactions' and column_name = 'customer_id'
     ) then
    execute 'drop policy if exists "transactions_manage_owned_customer_store" on public.transactions';
    execute 'create policy "transactions_manage_owned_customer_store" on public.transactions for all to authenticated using (exists (select 1 from public.store_customers where store_customers.id = transactions.customer_id and public.owns_store(store_customers.store_id))) with check (exists (select 1 from public.store_customers where store_customers.id = transactions.customer_id and public.owns_store(store_customers.store_id)))';
  end if;
end $$;
