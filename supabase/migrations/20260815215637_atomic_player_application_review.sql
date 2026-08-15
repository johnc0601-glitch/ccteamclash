create or replace function public.review_launch_player_application(
  target_application_id uuid,
  target_status text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  reviewer_profile_id text;
  application_record public.launch_player_applications%rowtype;
  profile_record public.launch_profiles%rowtype;
  claim_record public.launch_player_claims%rowtype;
  player_record public.launch_players%rowtype;
  review_timestamp timestamptz := clock_timestamp();
  new_player_id text;
begin
  select profile.id
  into reviewer_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role = 'Commissioner'
    and profile.status = 'Approved'
  limit 1;

  if reviewer_profile_id is null then
    raise exception 'Approved Commissioner access is required.' using errcode = '42501';
  end if;

  if target_status not in ('Approved', 'Rejected') then
    raise exception 'Application review status must be Approved or Rejected.' using errcode = '23514';
  end if;

  select application.*
  into application_record
  from public.launch_player_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null or application_record.status <> 'Pending' then
    raise exception 'Pending player application not found.' using errcode = 'P0002';
  end if;

  select profile.*
  into profile_record
  from public.launch_profiles profile
  where profile.id = application_record.profile_id
  for update;

  if profile_record.id is null
    or profile_record.role <> 'Player'
    or profile_record.status <> 'Pending'
  then
    raise exception 'Associated Pending Player profile not found.' using errcode = 'P0002';
  end if;

  if target_status = 'Approved' then
    if application_record.played_before then
      select claim.*
      into claim_record
      from public.launch_player_claims claim
      where claim.profile_id = profile_record.id
        and claim.status = 'Pending'
      order by claim.created_at desc, claim.id
      limit 1
      for update;

      if claim_record.id is null or claim_record.requested_player_id is null then
        raise exception 'A Pending returning-player claim with a selected player is required.'
          using errcode = 'P0002';
      end if;

      select player.*
      into player_record
      from public.launch_players player
      where player.id = claim_record.requested_player_id
      for update;

      if player_record.id is null then
        raise exception 'Claimed player not found.' using errcode = 'P0002';
      end if;

      if exists (
        select 1
        from public.launch_profiles linked_profile
        where linked_profile.id <> profile_record.id
          and linked_profile.player_id = player_record.id
          and linked_profile.status not in ('Rejected', 'Suspended')
      ) then
        raise exception 'Claimed player is already linked to another active profile.' using errcode = '23505';
      end if;

      update public.launch_profiles
      set display_name = claim_record.submitted_name,
          status = 'Approved',
          player_id = player_record.id,
          updated_at = review_timestamp
      where id = profile_record.id;

      update public.launch_player_claims
      set status = 'Approved',
          reviewed_at = review_timestamp,
          reviewed_by = reviewer_profile_id
      where id = claim_record.id;
    else
      new_player_id := 'player-application-' || application_record.id::text;

      insert into public.launch_players(
        id, name, gender, pdga_number, pdga_rating, current_team_id,
        home_area, active, created_at, updated_at
      ) values (
        new_player_id, profile_record.display_name, application_record.gender,
        '', null, null, '', true, review_timestamp, review_timestamp
      );

      update public.launch_profiles
      set status = 'Approved',
          player_id = new_player_id,
          updated_at = review_timestamp
      where id = profile_record.id;
    end if;
  else
    update public.launch_profiles
    set status = 'Rejected',
        updated_at = review_timestamp
    where id = profile_record.id;

    update public.launch_player_claims
    set status = 'Rejected',
        reviewed_at = review_timestamp,
        reviewed_by = reviewer_profile_id
    where profile_id = profile_record.id
      and status = 'Pending';
  end if;

  update public.launch_player_applications
  set status = target_status,
      reviewed_at = review_timestamp,
      reviewed_by = reviewer_profile_id,
      updated_at = review_timestamp
  where id = application_record.id;

  return application_record.id;
end;
$$;

revoke all on function public.review_launch_player_application(uuid, text)
from public, anon, authenticated;

grant execute on function public.review_launch_player_application(uuid, text)
to authenticated;
