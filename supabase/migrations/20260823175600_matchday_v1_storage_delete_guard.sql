drop policy if exists "owners or commissioners delete match feed images" on storage.objects;

create policy "owners cleanup unreferenced open feed images or commissioners remove feed images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'match-feed'
  and (
    (select private.is_launch_commissioner())
    or (
      owner_id = (select auth.uid())::text
      and array_length(storage.foldername(name), 1) >= 1
      and (select private.is_launch_match_feed_open((storage.foldername(name))[1]))
      and not exists (
        select 1
        from public.launch_match_feed_posts post
        where post.image_path = name
      )
    )
  )
);
