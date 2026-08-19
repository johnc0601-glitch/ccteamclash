create or replace function public.captain_review_launch_player_application(
  target_application_id uuid,
  target_status text,
  target_gender text,
  target_player_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer record;
  application_record public.launch_player_applications%rowtype;
  profile_record public.launch_profiles%rowtype;
  review_timestamp timestamptz := clock_timestamp();
  resolved_gender text;
  resolved_player_type text;
  roster_category text;
begin
  select profile.id, profile.role, profile.captain_team_id
  into reviewer
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role in ('Captain', 'Commissioner')
  limit 1;

  if reviewer.id is null then
    raise exception 'Approved Captain or Commissioner access is required.' using errcode = '42501';
  end if;

  if target_status not in ('Approved', 'Rejected') then
    raise exception 'Review status must be Approved or Rejected.' using errcode = '23514';
  end if;

  select application.* into application_record
  from public.launch_player_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'Season registration not found.' using errcode = 'P0002';
  end if;

  if application_record.status <> 'Pending'
     and not (reviewer.role = 'Commissioner' and application_record.status = 'Rejected' and target_status = 'Approved') then
    raise exception 'This season registration is not awaiting review.' using errcode = '23514';
  end if;

  if reviewer.role = 'Captain' and reviewer.captain_team_id is distinct from application_record.requested_team_id then
    raise exception 'Captains may only review registrations for their assigned team.' using errcode = '42501';
  end if;

  select profile.* into profile_record
  from public.launch_profiles profile
  where profile.id = application_record.profile_id
  for update;

  if profile_record.id is null
     or profile_record.status in ('Rejected', 'Suspended')
     or profile_record.player_id is null
     or profile_record.played_before is null then
    raise exception 'Player Setup must be complete before season review.' using errcode = 'P0002';
  end if;

  if target_status = 'Rejected' then
    update public.launch_player_applications
    set status = 'Rejected', reviewed_at = review_timestamp, reviewed_by = reviewer.id, updated_at = review_timestamp
    where id = application_record.id;
    return application_record.id;
  end if;

  resolved_gender := coalesce(nullif(target_gender, ''), application_record.gender);
  resolved_player_type := coalesce(nullif(target_player_type, ''), application_record.player_type, 'Adult');

  if resolved_gender not in ('Male', 'Female') then
    raise exception 'Male or Female is required before approval.' using errcode = '23514';
  end if;

  if resolved_player_type not in ('Adult', 'Junior') then
    raise exception 'Player type must be Adult or Junior.' using errcode = '23514';
  end if;

  update public.launch_player_applications
  set gender = resolved_gender,
      player_type = resolved_player_type,
      updated_at = review_timestamp
  where id = application_record.id;

  roster_category := case
    when resolved_player_type = 'Junior' then 'Junior'
    when resolved_gender = 'Female' then 'Women'
    else 'Men'
  end;

  update public.launch_players
  set gender = resolved_gender,
      current_team_id = application_record.requested_team_id,
      active = true,
      updated_at = review_timestamp
  where id = profile_record.player_id;

  insert into public.launch_season_roster_memberships(
    season_id, team_id, player_id, roster_category, status, added_by,
    added_at, created_at, updated_at
  ) values (
    application_record.season_id, application_record.requested_team_id,
    profile_record.player_id, roster_category, 'Active', reviewer.id,
    review_timestamp, review_timestamp, review_timestamp
  )
  on conflict (season_id, player_id) do update
  set team_id = excluded.team_id,
      roster_category = excluded.roster_category,
      status = 'Active',
      added_by = excluded.added_by,
      added_at = excluded.added_at,
      dropped_at = null,
      dropped_by = null,
      updated_at = excluded.updated_at;

  update public.launch_player_applications
  set status = 'Approved', reviewed_at = review_timestamp, reviewed_by = reviewer.id, updated_at = review_timestamp
  where id = application_record.id;

  return application_record.id;
end;
$$;

create or replace function public.captain_review_launch_player_application(
  target_application_id uuid,
  target_status text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.captain_review_launch_player_application(
    target_application_id,
    target_status,
    null,
    null
  );
$$;

revoke all on function public.captain_review_launch_player_application(uuid, text, text, text) from public, anon;
grant execute on function public.captain_review_launch_player_application(uuid, text, text, text) to authenticated;
revoke all on function public.captain_review_launch_player_application(uuid, text) from public, anon;
grant execute on function public.captain_review_launch_player_application(uuid, text) to authenticated;
