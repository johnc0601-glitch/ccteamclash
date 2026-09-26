CREATE OR REPLACE FUNCTION public.complete_launch_player_setup(target_played_before boolean, target_player_id text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_profile public.launch_profiles%rowtype;
  selected_player public.launch_players%rowtype;
  resolved_player_id text;
  setup_timestamp timestamptz := clock_timestamp();
begin
  select profile.*
  into actor_profile
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status not in ('Rejected', 'Suspended')
  limit 1
  for update;

  if actor_profile.id is null then
    raise exception 'A league profile is required to finish player setup.' using errcode = '42501';
  end if;

  if actor_profile.player_id is not null then
    return actor_profile.player_id;
  end if;

  if target_played_before then
    if target_player_id is null or btrim(target_player_id) = '' then
      raise exception 'Choose the player record you used in a previous Coastal Clash season.' using errcode = '23514';
    end if;

    select player.*
    into selected_player
    from public.launch_players player
    where player.id = target_player_id;

    if selected_player.id is null then
      raise exception 'Previous player record not found.' using errcode = 'P0002';
    end if;

    if exists (
      select 1
      from public.launch_profiles linked_profile
      where linked_profile.id <> actor_profile.id
        and linked_profile.player_id = selected_player.id
        and linked_profile.status not in ('Rejected', 'Suspended')
    ) then
      raise exception 'That previous player record is already connected to another account.' using errcode = '23505';
    end if;

    -- A selected public player name is not proof of identity.
    -- Reuse the existing commissioner claim queue without granting team access.
    if exists (
      select 1 from public.launch_player_claims claim
      where claim.profile_id = actor_profile.id and claim.status = 'Pending'
    ) then
      raise exception 'Your player claim is already awaiting commissioner review.' using errcode = '23514';
    end if;

    insert into public.launch_player_claims (
      id, profile_id, requested_player_id, submitted_name,
      submitted_pdga_number, status, created_at
    ) values (
      'claim-' || gen_random_uuid()::text, actor_profile.id, selected_player.id,
      actor_profile.display_name, coalesce(selected_player.pdga_number, ''), 'Pending', setup_timestamp
    );
    update public.launch_profiles
    set played_before = true, updated_at = setup_timestamp
    where id = actor_profile.id;
    return null;
  else
    if exists (
      select 1 from public.launch_player_claims claim
      where claim.profile_id = actor_profile.id and claim.status = 'Pending'
    ) then
      raise exception 'Your player claim is already awaiting commissioner review.' using errcode = '23514';
    end if;
    -- Do not silently create a second identity when this exact name already
    -- belongs to an established historical/PDGA player that is still unlinked.
    if exists (
      select 1
      from public.launch_players existing
      where existing.active = true
        and lower(regexp_replace(btrim(existing.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(actor_profile.display_name), '\s+', ' ', 'g'))
        and (
          nullif(btrim(existing.pdga_number), '') is not null
          or exists (select 1 from public.historical_player_matchups h where h.player_id = existing.id)
        )
        and not exists (
          select 1 from public.launch_profiles linked_profile
          where linked_profile.player_id = existing.id
            and linked_profile.status not in ('Rejected','Suspended')
        )
    ) then
      raise exception 'A previous Coastal Clash player with this name already exists. Choose the previous player record or contact the commissioner.' using errcode = '23505';
    end if;

    resolved_player_id := coalesce(actor_profile.player_id, 'player-account-' || (select auth.uid())::text);

    insert into public.launch_players(
      id, name, gender, pdga_number, pdga_rating, current_team_id,
      home_area, active, created_at, updated_at
    ) values (
      resolved_player_id, actor_profile.display_name, 'Unknown', '', null, null,
      '', true, setup_timestamp, setup_timestamp
    )
    on conflict (id) do update
    set name = excluded.name,
        active = true,
        updated_at = excluded.updated_at;
  end if;

  update public.launch_profiles
  set player_id = resolved_player_id,
      played_before = target_played_before,
      status = 'Approved',
      updated_at = setup_timestamp
  where id = actor_profile.id;

  return resolved_player_id;
end;
$function$;

-- Claim approval is atomic and only available to an approved commissioner.
create or replace function public.approve_verified_player_claim(
  target_claim_id text, target_player_id text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  reviewer_id text;
  claim public.launch_player_claims%rowtype;
  claimant public.launch_profiles%rowtype;
  player public.launch_players%rowtype;
begin
  select id into reviewer_id from public.launch_profiles
  where user_id = (select auth.uid()) and status = 'Approved' and role = 'Commissioner';
  if reviewer_id is null then
    raise exception 'Commissioner access is required.' using errcode = '42501';
  end if;
  select * into claim from public.launch_player_claims where id = target_claim_id for update;
  if claim.id is null or claim.status <> 'Pending' then
    raise exception 'A pending player claim is required.' using errcode = '23514';
  end if;
  select * into claimant from public.launch_profiles where id = claim.profile_id for update;
  if claimant.id is null or claimant.status in ('Rejected', 'Suspended') or claimant.player_id is not null then
    raise exception 'This account cannot be linked through this claim.' using errcode = '23514';
  end if;
  select * into player from public.launch_players
  where id = coalesce(nullif(btrim(target_player_id), ''), claim.requested_player_id) for update;
  if player.id is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.launch_profiles other
    where other.id <> claimant.id and other.player_id = player.id
      and other.status not in ('Rejected', 'Suspended')
  ) then
    raise exception 'That player is already connected to another account.' using errcode = '23505';
  end if;
  update public.launch_profiles set player_id = player.id, played_before = true,
    status = 'Approved', updated_at = clock_timestamp() where id = claimant.id;
  update public.launch_player_claims set requested_player_id = player.id, status = 'Approved',
    reviewed_by = reviewer_id, reviewed_at = clock_timestamp() where id = claim.id;
  return player.id;
end;
$$;
revoke all on function public.complete_launch_player_setup(boolean,text) from public, anon;
grant execute on function public.complete_launch_player_setup(boolean,text) to authenticated;
revoke all on function public.approve_verified_player_claim(text,text) from public, anon;
grant execute on function public.approve_verified_player_claim(text,text) to authenticated;

-- Keep original authorship and destination immutable while retaining edits and moderation.
create or replace function private.guard_clubhouse_post_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.author_profile_id is distinct from old.author_profile_id
     or new.season_id is distinct from old.season_id
     or new.team_id is distinct from old.team_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Clubhouse post identity cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create or replace function private.guard_clubhouse_comment_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.author_profile_id is distinct from old.author_profile_id
     or new.post_id is distinct from old.post_id
     or new.parent_comment_id is distinct from old.parent_comment_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Clubhouse comment identity cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_clubhouse_post_identity() from public, anon, authenticated;
revoke all on function private.guard_clubhouse_comment_identity() from public, anon, authenticated;
drop trigger if exists guard_clubhouse_post_identity on public.launch_clubhouse_posts;
create trigger guard_clubhouse_post_identity before update on public.launch_clubhouse_posts
for each row execute function private.guard_clubhouse_post_identity();
drop trigger if exists guard_clubhouse_comment_identity on public.launch_clubhouse_comments;
create trigger guard_clubhouse_comment_identity before update on public.launch_clubhouse_comments
for each row execute function private.guard_clubhouse_comment_identity();
