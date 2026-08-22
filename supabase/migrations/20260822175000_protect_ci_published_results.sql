-- Once CI has been published, changing the underlying Matchday result would make
-- immutable rating facts and live player CI disagree. Re-rating/reversal needs its
-- own explicit workflow, so ordinary result reopen/edit is blocked here.

create or replace function private.protect_ci_published_match_result()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
begin
  if exists (
    select 1
    from public.clash_match_publications publication
    where publication.match_id = old.match_id
  ) then
    if new.status is distinct from old.status
       or new.home_score is distinct from old.home_score
       or new.away_score is distinct from old.away_score
       or new.published_at is distinct from old.published_at then
      raise exception 'This Matchday has already updated Clash Index. Use the CI correction workflow instead of reopening or editing the published result.'
        using errcode = '55000';
    end if;
  end if;
  return new;
end;
$function$;

create trigger protect_ci_published_match_result
before update on public.launch_match_results
for each row execute function private.protect_ci_published_match_result();

create or replace function private.protect_ci_published_contest()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
declare
  v_match_id text;
begin
  v_match_id := coalesce(new.match_id, old.match_id);
  if exists (select 1 from public.clash_match_publications where match_id = v_match_id) then
    raise exception 'This Matchday has already updated Clash Index. Its contests are immutable until a CI correction workflow reverses that publication.'
      using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$function$;

create trigger protect_ci_published_contest
before insert or update or delete on public.launch_result_contests
for each row execute function private.protect_ci_published_contest();

create or replace function private.protect_ci_published_contest_player()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
declare
  v_contest_id text;
  v_match_id text;
begin
  v_contest_id := coalesce(new.contest_id, old.contest_id);
  select match_id into v_match_id from public.launch_result_contests where id = v_contest_id;
  if exists (select 1 from public.clash_match_publications where match_id = v_match_id) then
    raise exception 'This Matchday has already updated Clash Index. Its contest players are immutable until a CI correction workflow reverses that publication.'
      using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$function$;

create trigger protect_ci_published_contest_player
before insert or update or delete on public.launch_result_contest_players
for each row execute function private.protect_ci_published_contest_player();

comment on function private.protect_ci_published_match_result() is
  'Prevents ordinary result reopen/edit after an atomic CI publication.';
