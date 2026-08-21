-- Prevent normal result edits from invalidating finalized Clash ratings.
-- A future correction/rebuild RPC may set app.clash_rating_correction_write = 'on'
-- transaction-locally while it rebuilds the affected event and all later events.

create or replace function private.assert_clash_event_not_finalized(p_match_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round_id text;
begin
  if current_setting('app.clash_rating_correction_write', true) = 'on' then
    return;
  end if;

  select match.round_id
    into v_round_id
  from public.launch_schedule_matches as match
  where match.id = p_match_id;

  if v_round_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.clash_rating_event_players as event_player
    where event_player.event_key = v_round_id
  ) then
    raise exception 'This result belongs to a finalized Clash Index event. Use the rating correction workflow before editing it.'
      using errcode = '23514';
  end if;
end;
$$;

revoke all on function private.assert_clash_event_not_finalized(text) from public;

create or replace function private.protect_finalized_clash_match_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_clash_event_not_finalized(coalesce(new.match_id, old.match_id));
  return coalesce(new, old);
end;
$$;

create or replace function private.protect_finalized_clash_contest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_clash_event_not_finalized(coalesce(new.match_id, old.match_id));
  return coalesce(new, old);
end;
$$;

create or replace function private.protect_finalized_clash_contest_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match_id text;
begin
  select contest.match_id
    into v_match_id
  from public.launch_result_contests as contest
  where contest.id = coalesce(new.contest_id, old.contest_id);

  if v_match_id is not null then
    perform private.assert_clash_event_not_finalized(v_match_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists protect_finalized_clash_match_result on public.launch_match_results;
create trigger protect_finalized_clash_match_result
before insert or update or delete on public.launch_match_results
for each row execute function private.protect_finalized_clash_match_result();

drop trigger if exists protect_finalized_clash_contest on public.launch_result_contests;
create trigger protect_finalized_clash_contest
before insert or update or delete on public.launch_result_contests
for each row execute function private.protect_finalized_clash_contest();

drop trigger if exists protect_finalized_clash_contest_player on public.launch_result_contest_players;
create trigger protect_finalized_clash_contest_player
before insert or update or delete on public.launch_result_contest_players
for each row execute function private.protect_finalized_clash_contest_player();
