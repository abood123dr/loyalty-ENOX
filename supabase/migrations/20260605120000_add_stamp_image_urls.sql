alter table if exists public.stores
  add column if not exists stamp_image_url text,
  add column if not exists stamp_empty_image_url text;
