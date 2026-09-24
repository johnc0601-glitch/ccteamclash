-- Self-service account deletion while preserving official league history.
--
-- The launch profile remains as a pseudonymous historical actor because official
-- roster/audit/result tables intentionally reference it with RESTRICT FKs.
-- The Auth identity and player/account linkage are removed.

alter table public.launch_profiles
  add column if not exists account_deleted_at timestamptz;

alter table public.launch_profiles
  alter column user_id drop not null;

alter table public.launch_profiles
  drop constraint if exists launch_profiles_user_id_fkey;

alter table public.launch_profiles
  add constraint launch_profiles_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;

-- Admin/service operations must be able to perform the tightly-scoped
-- anonymization used by account deletion.
create or replace function private.protect_launch_profile_access_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if not private.is_launch_commissioner() then
    if new.user_id is distinct from old.user_id
      or new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.player_id is distinct from old.player_id
      or new.captain_team_id is distinct from old.captain_team_id
      or new.created_at is distinct from old.created_at
      or new.account_deleted_at is distinct from old.account_deleted_at
    then
      raise exception 'Only the profile display name can be changed here.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.anonymize_launch_account(
  target_profile_id text,
  target_user_id uuid,
  reviewer_profile_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deletion_timestamp timestamptz := clock_timestamp();
begin
  -- Pending requests no longer need action after the login is deleted.
  update public.launch_player_applications
  set status = case when status = 'Pending' then 'Rejected' else status end,
      reviewed_at = case when status = 'Pending' then deletion_timestamp else reviewed_at end,
      reviewed_by = case when status = 'Pending' then reviewer_profile_id else reviewed_by end,
      submitted_pdga_number = '',
      submitted_pdga_rating = null,
      updated_at = deletion_timestamp
  where profile_id = target_profile_id;

  update public.launch_player_claims
  set status = case when status = 'Pending' then 'Rejected' else status end,
      reviewed_at = case when status = 'Pending' then deletion_timestamp else reviewed_at end,
      reviewed_by = case when status = 'Pending' then reviewer_profile_id else reviewed_by end,
      submitted_name = 'Deleted member',
      submitted_pdga_number = ''
  where profile_id = target_profile_id;

  -- Keep discussion/history referentially intact without retaining the person's
  -- profile name in denormalized author snapshots.
  update public.launch_match_feed_posts
  set author_name_snapshot = 'Deleted member'
  where profile_id = target_profile_id;

  update public.launch_match_feed_comments
  set author_name_snapshot = 'Deleted member'
  where profile_id = target_profile_id;

  update public.launch_story_comments
  set author_name_snapshot = 'Deleted member'
  where profile_id = target_profile_id;

  -- Reactions/read markers are disposable account preferences rather than
  -- league history.
  delete from public.launch_clubhouse_post_reactions where profile_id = target_profile_id;
  delete from public.launch_clubhouse_reads where profile_id = target_profile_id;
  delete from public.launch_match_feed_post_reactions where profile_id = target_profile_id;
  delete from public.launch_match_feed_comment_reactions where profile_id = target_profile_id;
  delete from public.launch_story_comment_reactions where profile_id = target_profile_id;

  -- Storage ownership is metadata only. League assets stay at their existing
  -- paths, but no longer belong to the deleted Auth identity.
  update storage.objects
  set owner = null,
      owner_id = null
  where owner = target_user_id
     or owner_id = target_user_id::text;

  update public.launch_profiles
  set user_id = null,
      display_name = 'Deleted member',
      role = 'Player',
      status = 'Rejected',
      player_id = null,
      captain_team_id = null,
      played_before = null,
      account_deleted_at = deletion_timestamp,
      updated_at = deletion_timestamp
  where id = target_profile_id;

  delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function private.anonymize_launch_account(text, uuid, text) from public, anon, authenticated;

create or replace function public.self_delete_launch_account(confirmation text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  actor_profile public.launch_profiles%rowtype;
  remaining_commissioners integer;
begin
  if actor_user_id is null then
    raise exception 'Sign in before deleting your account.' using errcode = '42501';
  end if;

  if confirmation <> 'DELETE' then
    raise exception 'Type DELETE to confirm account deletion.' using errcode = '22023';
  end if;

  select profile.*
  into actor_profile
  from public.launch_profiles profile
  where profile.user_id = actor_user_id
  for update;

  if actor_profile.id is null then
    raise exception 'Account profile not found.' using errcode = 'P0002';
  end if;

  if actor_profile.role = 'Commissioner' and actor_profile.status = 'Approved' then
    select count(*)
    into remaining_commissioners
    from public.launch_profiles profile
    where profile.role = 'Commissioner'
      and profile.status = 'Approved'
      and profile.id <> actor_profile.id;

    if remaining_commissioners < 1 then
      raise exception 'Assign another approved commissioner before deleting the last commissioner account.' using errcode = '42501';
    end if;
  end if;

  perform private.anonymize_launch_account(actor_profile.id, actor_user_id, null);
  return actor_profile.id;
end;
$$;

revoke all on function public.self_delete_launch_account(text) from public, anon;
grant execute on function public.self_delete_launch_account(text) to authenticated;

-- Keep commissioner-assisted deletion aligned with the same retention model.
create or replace function public.commissioner_delete_launch_account(target_profile_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_profile public.launch_profiles%rowtype;
begin
  select profile.id
  into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role = 'Commissioner'
    and profile.status = 'Approved'
  limit 1;

  if actor_profile_id is null then
    raise exception 'Approved Commissioner access is required.' using errcode = '42501';
  end if;

  if target_profile_id = actor_profile_id then
    raise exception 'Use self-service account deletion for your own account.' using errcode = '42501';
  end if;

  select profile.*
  into target_profile
  from public.launch_profiles profile
  where profile.id = target_profile_id
  for update;

  if target_profile.id is null then
    raise exception 'Account profile not found.' using errcode = 'P0002';
  end if;

  if target_profile.user_id is null then
    raise exception 'That account has already been deleted.' using errcode = '22023';
  end if;

  perform private.anonymize_launch_account(
    target_profile.id,
    target_profile.user_id,
    actor_profile_id
  );

  return target_profile.id;
end;
$$;

revoke all on function public.commissioner_delete_launch_account(text) from public, anon;
grant execute on function public.commissioner_delete_launch_account(text) to authenticated;

comment on column public.launch_profiles.account_deleted_at is
  'When set, the website login was deleted and this pseudonymous profile remains only to preserve league-history references.';
comment on function public.self_delete_launch_account(text) is
  'Deletes the caller Auth identity, anonymizes account-linked data, and preserves official league/player history.';
