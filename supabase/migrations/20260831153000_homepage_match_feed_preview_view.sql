-- One bounded homepage read for the latest visible Matchday post per match plus counts.
-- SECURITY INVOKER keeps the existing base-table RLS policies in force.

create or replace view public.launch_homepage_match_feed_previews
with (security_invoker = true)
as
with ranked_posts as (
  select
    p.id,
    p.match_id,
    p.author_name_snapshot,
    p.body,
    p.image_path,
    p.last_activity_at,
    p.created_at,
    row_number() over (
      partition by p.match_id
      order by p.last_activity_at desc, p.created_at desc, p.id desc
    ) as row_rank
  from public.launch_match_feed_posts p
  where p.deleted_at is null
),
latest_posts as (
  select *
  from ranked_posts
  where row_rank = 1
)
select
  p.match_id,
  p.id as post_id,
  p.author_name_snapshot,
  p.body,
  p.image_path,
  p.last_activity_at,
  coalesce(c.comment_count, 0)::bigint as comment_count,
  coalesce(r.reaction_count, 0)::bigint as reaction_count
from latest_posts p
left join lateral (
  select count(*) as comment_count
  from public.launch_match_feed_comments c
  where c.post_id = p.id
    and c.deleted_at is null
) c on true
left join lateral (
  select count(*) as reaction_count
  from public.launch_match_feed_post_reactions r
  where r.post_id = p.id
) r on true;

grant select on public.launch_homepage_match_feed_previews to anon, authenticated;
