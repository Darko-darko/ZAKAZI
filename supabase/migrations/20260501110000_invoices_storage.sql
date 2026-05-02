-- Privatan bucket za PDF fakture - pristupa se preko signed URL-ova
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'invoices',
  'invoices',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Provider moze da cita samo svoje fakture
-- Path format: invoices/<provider_id>/<invoice_id>.pdf
create policy "invoices select own provider"
on storage.objects for select
to authenticated
using (
  bucket_id = 'invoices'
  and (storage.foldername(name))[1] = 'invoices'
  and (storage.foldername(name))[2] = public.current_provider_id()::text
);
