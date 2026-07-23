insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-gallery',
  'event-gallery',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads event gallery" on storage.objects;
create policy "Public reads event gallery"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'event-gallery');

drop policy if exists "Admin uploads event gallery" on storage.objects;
create policy "Admin uploads event gallery"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-gallery'
  and auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid
);

drop policy if exists "Admin updates event gallery" on storage.objects;
create policy "Admin updates event gallery"
on storage.objects for update
to authenticated
using (
  bucket_id = 'event-gallery'
  and auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid
)
with check (
  bucket_id = 'event-gallery'
  and auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid
);

drop policy if exists "Admin deletes event gallery" on storage.objects;
create policy "Admin deletes event gallery"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-gallery'
  and auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid
);
