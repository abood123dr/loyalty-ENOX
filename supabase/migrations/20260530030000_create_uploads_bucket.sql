insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public can read uploads'
  ) then
    create policy "public can read uploads"
    on storage.objects for select
    using (bucket_id = 'uploads');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public can upload images'
  ) then
    create policy "public can upload images"
    on storage.objects for insert
    with check (bucket_id = 'uploads');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public can update uploads'
  ) then
    create policy "public can update uploads"
    on storage.objects for update
    using (bucket_id = 'uploads')
    with check (bucket_id = 'uploads');
  end if;
end $$;
