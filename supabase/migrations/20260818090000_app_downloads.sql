-- =============================================================================
-- Refund Reminder — App downloads storage
-- Public bucket that hosts the Android APK for the "Get the Android app" button.
-- Path convention: refundly.apk (a single, stable object overwritten each release).
--
-- The bucket is PUBLIC, so anyone can *download* the APK without signing in.
-- Uploads/deletes are NOT granted to app users here — they are done manually
-- from the Supabase dashboard (which acts with project privileges), so no
-- write policy on storage.objects is needed.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'app-downloads',
  'app-downloads',
  true,
  52428800 -- 50 MB (Free-plan per-file max; APK is ~28 MB, leaves headroom)
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;
