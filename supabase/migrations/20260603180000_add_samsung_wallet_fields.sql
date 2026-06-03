alter table public.store_customers
add column if not exists samsung_wallet_ref_id text,
add column if not exists samsung_wallet_save_url text;
