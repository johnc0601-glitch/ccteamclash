alter table public.media_assets
  add column if not exists thumbnail_path text,
  add column if not exists byte_size integer;

alter table public.media_assets
  drop constraint if exists media_assets_byte_size_nonnegative,
  add constraint media_assets_byte_size_nonnegative
    check (byte_size is null or byte_size >= 0);
