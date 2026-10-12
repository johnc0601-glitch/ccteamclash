-- Manually curated latest episode metadata, independent of the seven-day NEW flag.
alter table public.launch_podcast_status
  add column if not exists latest_episode_title text,
  add column if not exists latest_episode_url text;

alter table public.launch_podcast_status
  add constraint launch_podcast_episode_title_length
  check (latest_episode_title is null or char_length(latest_episode_title) <= 140);

alter table public.launch_podcast_status
  add constraint launch_podcast_episode_url_valid
  check (
    latest_episode_url is null or
    (char_length(latest_episode_url) <= 500 and
     latest_episode_url ~ '^https://open[.]spotify[.]com/episode/[[:alnum:]]+([?][^[:space:]]*)?$')
  );

grant update (latest_episode_title, latest_episode_url) on public.launch_podcast_status to authenticated;
