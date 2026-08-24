grant insert, update on public.launch_match_feed_posts to authenticated;
grant insert, update on public.launch_match_feed_comments to authenticated;
grant insert, update, delete on public.launch_match_feed_post_reactions to authenticated;
grant insert, update, delete on public.launch_match_feed_comment_reactions to authenticated;

drop policy if exists "members create match feed posts" on public.launch_match_feed_posts;
drop policy if exists "authors edit match feed posts" on public.launch_match_feed_posts;
drop policy if exists "members create match feed comments" on public.launch_match_feed_comments;
drop policy if exists "authors edit match feed comments" on public.launch_match_feed_comments;
drop policy if exists "members manage own post reactions" on public.launch_match_feed_post_reactions;
drop policy if exists "members manage own comment reactions" on public.launch_match_feed_comment_reactions;

create policy "members create match feed posts" on public.launch_match_feed_posts for insert to authenticated
with check (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1));
create policy "authors edit match feed posts" on public.launch_match_feed_posts for update to authenticated
using (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1) or (select private.is_launch_commissioner()))
with check (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1) or (select private.is_launch_commissioner()));
create policy "members create match feed comments" on public.launch_match_feed_comments for insert to authenticated
with check (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1));
create policy "authors edit match feed comments" on public.launch_match_feed_comments for update to authenticated
using (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1) or (select private.is_launch_commissioner()))
with check (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1) or (select private.is_launch_commissioner()));
create policy "members manage own post reactions" on public.launch_match_feed_post_reactions for all to authenticated
using (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1))
with check (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1));
create policy "members manage own comment reactions" on public.launch_match_feed_comment_reactions for all to authenticated
using (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1))
with check (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1));

create policy "members upload match feed images" on storage.objects for insert to authenticated with check (bucket_id = 'match-feed');
create policy "owners or commissioners delete match feed images" on storage.objects for delete to authenticated
using (bucket_id = 'match-feed' and (owner_id = (select auth.uid())::text or (select private.is_launch_commissioner())));

grant select, insert, update on public.launch_match_roster_unlocks to authenticated;
drop policy if exists "commissioners read roster unlocks" on public.launch_match_roster_unlocks;
drop policy if exists "captains read own roster unlocks" on public.launch_match_roster_unlocks;
drop policy if exists "commissioners create roster unlocks" on public.launch_match_roster_unlocks;
drop policy if exists "commissioners close roster unlocks" on public.launch_match_roster_unlocks;
create policy "commissioners read roster unlocks" on public.launch_match_roster_unlocks for select to authenticated using ((select private.is_launch_commissioner()));
create policy "captains read own roster unlocks" on public.launch_match_roster_unlocks for select to authenticated using (team_id = (select captain_team_id from public.launch_profiles where user_id = (select auth.uid()) and status='Approved' and role='Captain' limit 1));
create policy "commissioners create roster unlocks" on public.launch_match_roster_unlocks for insert to authenticated with check ((select private.is_launch_commissioner()) and unlocked_by = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1));
create policy "commissioners close roster unlocks" on public.launch_match_roster_unlocks for update to authenticated using ((select private.is_launch_commissioner())) with check ((select private.is_launch_commissioner()));

create or replace function public.captain_confirm_unlocked_match_roster(target_match_id text, target_team_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  trusted_team_name text;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Captain'
    and profile.captain_team_id = target_team_id
  limit 1;

  select match.id, match.season_id, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status = 'Cancelled'
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not exists (select 1 from public.launch_match_roster_unlocks u where u.match_id = target_match_id and u.team_id = target_team_id and u.relocked_at is null)
  then
    raise exception 'Unlocked captain roster confirmation is not available.' using errcode='42501';
  end if;

  select name into trusted_team_name from public.launch_teams where id = target_team_id;
  if trusted_team_name is null then raise exception 'Team not found.' using errcode='22023'; end if;

  insert into public.launch_match_rosters (match_id, team_id, status, confirmed_by, confirmed_at)
  values (target_match_id, target_team_id, 'Confirmed', actor_profile_id, pg_catalog.now())
  on conflict (match_id, team_id) do update
    set status='Confirmed', confirmed_by=excluded.confirmed_by, confirmed_at=excluded.confirmed_at, updated_at=pg_catalog.now();

  delete from public.launch_match_roster_snapshot_players where match_id = target_match_id and team_id = target_team_id;

  insert into public.launch_match_roster_snapshot_players (match_id, team_id, team_name_snapshot, player_id, player_name_snapshot, updated_by, updated_at)
  select target_match_id, target_team_id, trusted_team_name, p.id, p.name, actor_profile_id, pg_catalog.now()
  from public.launch_match_attendance a
  join public.launch_players p on p.id = a.player_id and p.active = true
  join public.launch_season_roster_memberships m on m.season_id = target_match.season_id and m.team_id = target_team_id and m.player_id = p.id and m.status = 'Active'
  where a.match_id = target_match_id and a.team_id = target_team_id and a.status = 'Playing';

  update public.launch_match_roster_snapshots
  set team_name_snapshot = trusted_team_name, needs_commissioner_review = false, updated_by = actor_profile_id, updated_at = pg_catalog.now()
  where match_id = target_match_id and team_id = target_team_id;
  if not found then raise exception 'Official roster snapshot is not available.' using errcode='55000'; end if;

  update public.launch_match_roster_unlocks
  set relocked_at = pg_catalog.now(), relocked_by = actor_profile_id
  where match_id = target_match_id and team_id = target_team_id and relocked_at is null;
end;
$$;

grant execute on function public.captain_confirm_unlocked_match_roster(text,text) to authenticated;
