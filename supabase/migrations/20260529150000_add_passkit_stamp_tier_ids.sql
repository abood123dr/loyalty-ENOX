alter table public.stores
add column if not exists passkit_stamp_tier_ids jsonb default '{}'::jsonb;
