create table if not exists public.launch_match_feed_posts (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_schedule_matches(id) on delete cascade,
  profile_id text not null references public.launch_profiles(id) on delete restrict,
  author_name_snapshot text not null default 'Member',
  body text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  last_activity_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text references public.launch_profiles(id) on delete set null,
  constraint launch_match_feed_posts_content_check check (length(btrim(body)) > 0 or image_path is not null)
);

create index if not exists launch_match_feed_posts_match_activity_idx on public.launch_match_feed_posts(match_id, last_activity_at desc);

create table if not exists public.launch_match_feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.launch_match_feed_posts(id) on delete cascade,
  profile_id text not null references public.launch_profiles(id) on delete restrict,
  author_name_snapshot text not null default 'Member',
  parent_comment_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by text references public.launch_profiles(id) on delete set null,
  constraint launch_match_feed_comments_body_check check (length(btrim(body)) > 0),
  constraint launch_match_feed_comments_identity_unique unique (id, post_id),
  constraint launch_match_feed_comments_parent_fk foreign key (parent_comment_id, post_id) references public.launch_match_feed_comments(id, post_id) on delete cascade
);

create index if not exists launch_match_feed_comments_post_created_idx on public.launch_match_feed_comments(post_id, created_at asc);

create table if not exists public.launch_match_feed_post_reactions (
  post_id uuid not null references public.launch_match_feed_posts(id) on delete cascade,
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id),
  constraint launch_match_feed_post_reactions_type_check check (reaction_type in ('like','love','laugh','fire'))
);

create table if not exists public.launch_match_feed_comment_reactions (
  comment_id uuid not null references public.launch_match_feed_comments(id) on delete cascade,
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, profile_id),
  constraint launch_match_feed_comment_reactions_type_check check (reaction_type in ('like','love','laugh','fire'))
);

alter table public.launch_match_feed_posts enable row level security;
alter table public.launch_match_feed_comments enable row level security;
alter table public.launch_match_feed_post_reactions enable row level security;
alter table public.launch_match_feed_comment_reactions enable row level security;

create or replace function private.touch_launch_match_feed_post_activity()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  update public.launch_match_feed_posts set last_activity_at = now() where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end;
$$;

create or replace function private.touch_launch_match_feed_comment_activity()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare target_post_id uuid;
begin
  select post_id into target_post_id from public.launch_match_feed_comments where id = coalesce(new.comment_id, old.comment_id);
  update public.launch_match_feed_posts set last_activity_at = now() where id = target_post_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists launch_match_feed_comment_activity on public.launch_match_feed_comments;
create trigger launch_match_feed_comment_activity after insert or update or delete on public.launch_match_feed_comments for each row execute function private.touch_launch_match_feed_post_activity();
drop trigger if exists launch_match_feed_post_reaction_activity on public.launch_match_feed_post_reactions;
create trigger launch_match_feed_post_reaction_activity after insert or update or delete on public.launch_match_feed_post_reactions for each row execute function private.touch_launch_match_feed_post_activity();
drop trigger if exists launch_match_feed_comment_reaction_activity on public.launch_match_feed_comment_reactions;
create trigger launch_match_feed_comment_reaction_activity after insert or update or delete on public.launch_match_feed_comment_reactions for each row execute function private.touch_launch_match_feed_comment_activity();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('match-feed', 'match-feed', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
