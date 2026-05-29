-- Core SaaS schema for loyalty-ENOX.
-- Run this in Supabase SQL editor before using the app.

create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  logo_url text,
  cover_url text,
  description text,
  phone text,
  email text,
  city text,
  latitude double precision,
  longitude double precision,
  geofence_radius integer default 200,
  geofence_enabled boolean default false,
  geofence_message text,
  owner_user_id uuid,
  owner_name text,
  owner_email text,
  is_active boolean default true,
  subscription_plan text default 'starter',
  subscription_status text default 'trial',
  trial_end_date date,
  card_bg_color text default '#7C3AED',
  card_text_color text default '#FFFFFF',
  card_logo_url text,
  stamp_active_color text default '#FFFFFF',
  stamp_inactive_color text default '#FFFFFF33',
  stamp_icon text default 'check',
  stamp_strip_url text,
  stamps_required integer default 10,
  reward_description text default 'مشروبك العاشر مجانا!',
  lock_card_design boolean default true,
  passkit_program_id text,
  passkit_tier_id text,
  passkit_template_id text,
  passkit_enabled boolean default false
);

create table if not exists public.store_customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  store_id uuid not null references public.stores(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  current_stamps integer default 0,
  total_stamps_earned integer default 0,
  total_rewards_redeemed integer default 0,
  last_stamp_date timestamptz,
  wallet_pass_id text,
  wallet_pass_url text,
  wallet_type text default 'none',
  is_active boolean default true,
  notes text,
  unique (store_id, phone)
);

create table if not exists public.stamp_scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.store_customers(id) on delete cascade,
  stamps_added integer default 1,
  scanned_by uuid,
  branch_name text,
  is_reward boolean default false,
  note text
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_id uuid references public.stores(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'manual',
  target text default 'all',
  sent_count integer default 0,
  status text default 'draft'
);

create table if not exists public.passkit_integrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_id uuid not null references public.stores(id) on delete cascade,
  region text not null default 'eu',
  program_id text not null,
  tier_id text,
  template_id text,
  enabled boolean default true,
  unique (store_id)
);

create index if not exists idx_store_customers_store_id on public.store_customers(store_id);
create index if not exists idx_stamp_scans_store_id on public.stamp_scans(store_id);
create index if not exists idx_notifications_store_id on public.notifications(store_id);

alter table public.stores enable row level security;
alter table public.store_customers enable row level security;
alter table public.stamp_scans enable row level security;
alter table public.notifications enable row level security;
alter table public.passkit_integrations enable row level security;

-- Public customer registration needs to read active stores by slug and insert a customer.
drop policy if exists "public can read active stores" on public.stores;
create policy "public can read active stores"
on public.stores for select
using (is_active = true);

drop policy if exists "public can register store customers" on public.store_customers;
create policy "public can register store customers"
on public.store_customers for insert
with check (true);

-- Authenticated users can read/update. Tighten these policies later with JWT claims
-- once store_owner users are provisioned server-side with app_metadata.store_id.
drop policy if exists "authenticated can manage stores" on public.stores;
create policy "authenticated can manage stores"
on public.stores for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can manage store customers" on public.store_customers;
create policy "authenticated can manage store customers"
on public.store_customers for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can manage stamp scans" on public.stamp_scans;
create policy "authenticated can manage stamp scans"
on public.stamp_scans for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can manage notifications" on public.notifications;
create policy "authenticated can manage notifications"
on public.notifications for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can manage passkit integrations" on public.passkit_integrations;
create policy "authenticated can manage passkit integrations"
on public.passkit_integrations for all
to authenticated
using (true)
with check (true);
