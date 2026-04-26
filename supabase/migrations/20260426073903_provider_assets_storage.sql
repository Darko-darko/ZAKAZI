insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'provider-assets',
  'provider-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "provider assets select public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'provider-assets');

create policy "provider assets insert own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'provider-assets'
  and (storage.foldername(name))[1] = 'providers'
  and (storage.foldername(name))[2] = public.current_provider_id()::text
);

create policy "provider assets update own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'provider-assets'
  and (storage.foldername(name))[1] = 'providers'
  and (storage.foldername(name))[2] = public.current_provider_id()::text
)
with check (
  bucket_id = 'provider-assets'
  and (storage.foldername(name))[1] = 'providers'
  and (storage.foldername(name))[2] = public.current_provider_id()::text
);

create policy "provider assets delete own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'provider-assets'
  and (storage.foldername(name))[1] = 'providers'
  and (storage.foldername(name))[2] = public.current_provider_id()::text
);
