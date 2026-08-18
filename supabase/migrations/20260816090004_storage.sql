-- =============================================================================
-- Refund Reminder — Storage (PRD §44)
-- Private bucket for product images. Path convention: <user-id>/orders/<order-id>/product.webp
-- Access is restricted so a user can only touch objects under their own folder.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  5242880, -- 5 MB (PRD §44)
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- The first path segment must equal the caller's uid.
drop policy if exists "product images select own" on storage.objects;
create policy "product images select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product images insert own" on storage.objects;
create policy "product images insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product images update own" on storage.objects;
create policy "product images update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product images delete own" on storage.objects;
create policy "product images delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
