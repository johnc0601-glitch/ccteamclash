-- Cursor-paged public Matchday posts. SECURITY INVOKER preserves base-table RLS.

create or replace function public.get_match_feed_post_page(
  p_match_id text,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 11
)
returns table (
  id uuid,
  match_id text,
  profile_id text,
  author_name_snapshot text,
  body text,
  image_path text,
  created_at timestamptz,
  updated_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.match_id,
    p.profile_id,
    p.author_name_snapshot,
    p.body,
    p.image_path,
    p.created_at,
    p.updated_at,
    p.edited_at,
    p.deleted_at
  from public.launch_match_feed_posts p
  where p.match_id = p_match_id
    and (
      p_before_created_at is null
      or p.created_at < p_before_created_at
      or (p.created_at = p_before_created_at and p.id < p_before_id)
    )
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 11), 1), 25);
$$;

grant execute on function public.get_match_feed_post_page(text, timestamptz, uuid, integer) to anon, authenticated;
