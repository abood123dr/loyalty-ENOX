alter table public.store_customers
add column if not exists google_wallet_object_id text,
add column if not exists google_wallet_save_url text;
