alter table public.stores
  add column if not exists card_logo_url text,
  add column if not exists stamp_active_color text default '#FFFFFF',
  add column if not exists stamp_inactive_color text default '#FFFFFF33',
  add column if not exists stamp_icon text default 'check',
  add column if not exists stamp_strip_url text;
