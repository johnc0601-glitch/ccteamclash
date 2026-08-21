insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('course-photos','course-photos',true,2097152,array['image/png','image/jpeg','image/webp']),
  ('story-images','story-images',true,3145728,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads course photos" on storage.objects;
create policy "public reads course photos"
on storage.objects for select to public
using (bucket_id = 'course-photos');

drop policy if exists "commissioner uploads course photos" on storage.objects;
create policy "commissioner uploads course photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'course-photos' and private.is_launch_commissioner());

drop policy if exists "commissioner updates course photos" on storage.objects;
create policy "commissioner updates course photos"
on storage.objects for update to authenticated
using (bucket_id = 'course-photos' and private.is_launch_commissioner())
with check (bucket_id = 'course-photos' and private.is_launch_commissioner());

drop policy if exists "commissioner deletes course photos" on storage.objects;
create policy "commissioner deletes course photos"
on storage.objects for delete to authenticated
using (bucket_id = 'course-photos' and private.is_launch_commissioner());

drop policy if exists "public reads story images" on storage.objects;
create policy "public reads story images"
on storage.objects for select to public
using (bucket_id = 'story-images');

drop policy if exists "commissioner uploads story images" on storage.objects;
create policy "commissioner uploads story images"
on storage.objects for insert to authenticated
with check (bucket_id = 'story-images' and private.is_launch_commissioner());

drop policy if exists "commissioner updates story images" on storage.objects;
create policy "commissioner updates story images"
on storage.objects for update to authenticated
using (bucket_id = 'story-images' and private.is_launch_commissioner())
with check (bucket_id = 'story-images' and private.is_launch_commissioner());

drop policy if exists "commissioner deletes story images" on storage.objects;
create policy "commissioner deletes story images"
on storage.objects for delete to authenticated
using (bucket_id = 'story-images' and private.is_launch_commissioner());
