drop policy if exists "members upload match feed images" on storage.objects;
create policy "members upload match feed images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'match-feed'
  and array_length(storage.foldername(name), 1) >= 1
  and (select private.is_launch_match_feed_open((storage.foldername(name))[1]))
);
