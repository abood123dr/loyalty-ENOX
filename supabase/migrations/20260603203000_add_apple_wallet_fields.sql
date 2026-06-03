alter table public.store_customers
add column if not exists apple_wallet_serial_number text,
add column if not exists apple_wallet_pass_url text,
add column if not exists apple_wallet_auth_token text,
add column if not exists apple_wallet_added_at timestamptz;
