-- Match Identity V2
--
-- Existing launch_schedule_matches.id values are permanent internal keys.
-- They are intentionally NOT rewritten because results, rosters, attendance,
-- feed posts, stories, media, playoff games, and rating data depend on them.
-- New rows receive opaque IDs at the database boundary. Public URLs use a
-- separate canonical slug, with aliases preserving every previous public ref.

alter table public.launch_schedule_matches
  add column if not exists public_slug text;

create table if not exists public.launch_match_url_aliases (
  alias text primary key,
  match_id text not null references public.launch_schedule_matches(id) on delete cascade,
  kind text not null default 'legacy_id' check (kind in ('legacy_id', 'previous_slug')),
  created_at timestamptz not null default now(),
  constraint launch_match_url_aliases_alias_check check (length(trim(alias)) > 0)
);

create index if not exists launch_match_url_aliases_match_id_idx
  on public.launch_match_url_aliases(match_id);

create or replace function private.launch_match_slug(
  target_away_team_id text,
  target_home_team_id text,
  target_season_id text,
  target_round_id text,
  target_match_id text
)
returns text
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  season_year integer;
  round_number integer;
  base_slug text;
begin
  select season.year, round.number
    into season_year, round_number
  from public.launch_rounds round
  join public.launch_seasons season on season.id = round.season_id
  where round.id = target_round_id
  limit 1;

  if target_away_team_id is not null and target_home_team_id is not null then
    base_slug := lower(target_away_team_id)
      || '-at-' || lower(target_home_team_id)
      || '-' || coalesce(season_year::text, 'season')
      || '-r' || coalesce(round_number::text, 'x');
  else
    base_slug := 'match-'
      || coalesce(season_year::text, 'season')
      || '-r' || coalesce(round_number::text, 'x')
      || '-' || left(md5(target_match_id), 8);
  end if;

  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  return nullif(base_slug, '');
end;
$$;

-- Existing matches receive canonical slugs without changing their primary keys.
update public.launch_schedule_matches match
set public_slug = private.launch_match_slug(
  match.away_team_id,
  match.home_team_id,
  match.season_id,
  match.round_id,
  match.id
)
where match.public_slug is null;

-- Defensive uniqueness fallback. Matchups should already be unique per round,
-- but this guarantees a stable URL even if historical data contains a duplicate.
with duplicate_slugs as (
  select id, public_slug,
         row_number() over (partition by public_slug order by created_at, id) as duplicate_number
  from public.launch_schedule_matches
  where public_slug is not null
)
update public.launch_schedule_matches match
set public_slug = match.public_slug || '-' || left(md5(match.id), 8)
from duplicate_slugs duplicate
where duplicate.id = match.id
  and duplicate.duplicate_number > 1;

-- A canonical slug must never steal another match's permanent legacy-ID URL.
update public.launch_schedule_matches match
set public_slug = match.public_slug || '-' || left(md5(match.id), 8)
where exists (
  select 1
  from public.launch_schedule_matches legacy
  where legacy.id = match.public_slug
    and legacy.id <> match.id
);

create unique index if not exists launch_schedule_matches_public_slug_uidx
  on public.launch_schedule_matches(public_slug)
  where public_slug is not null;

alter table public.launch_schedule_matches
  alter column public_slug set not null;

-- Every old database ID remains a valid public reference forever.
insert into public.launch_match_url_aliases(alias, match_id, kind)
select match.id, match.id, 'legacy_id'
from public.launch_schedule_matches match
on conflict (alias) do nothing;

create or replace function private.prepare_launch_match_identity()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  base_slug text;
  candidate_slug text;
  collision_attempt integer := 0;
begin
  -- INSERT and UPDATE are intentionally separated. OLD is not valid for an
  -- INSERT trigger and must never be referenced through a combined condition.
  if tg_op = 'INSERT' then
    -- New IDs contain no matchup, team, date, course, or round semantics.
    new.id := gen_random_uuid()::text;
  elsif not (
    new.public_slug is null
    or new.public_slug is distinct from old.public_slug
    or new.home_team_id is distinct from old.home_team_id
    or new.away_team_id is distinct from old.away_team_id
    or new.round_id is distinct from old.round_id
    or new.season_id is distinct from old.season_id
  ) then
    return new;
  end if;

  base_slug := private.launch_match_slug(
    new.away_team_id,
    new.home_team_id,
    new.season_id,
    new.round_id,
    new.id
  );

  if base_slug is null then
    raise exception 'Unable to generate canonical public match slug';
  end if;

  candidate_slug := base_slug;

  -- Keep canonical slugs disjoint from current slugs, legacy IDs, and every
  -- previous public slug. This preserves old URLs permanently.
  loop
    exit when not exists (
      select 1
      from public.launch_schedule_matches current_match
      where current_match.public_slug = candidate_slug
        and current_match.id <> new.id
    )
    and not exists (
      select 1
      from public.launch_schedule_matches legacy_match
      where legacy_match.id = candidate_slug
        and legacy_match.id <> new.id
    )
    and not exists (
      select 1
      from public.launch_match_url_aliases alias_row
      where alias_row.alias = candidate_slug
        and alias_row.match_id <> new.id
    );

    collision_attempt := collision_attempt + 1;
    candidate_slug := base_slug || '-' || left(md5(new.id || ':' || collision_attempt::text), 8);
  end loop;

  new.public_slug := candidate_slug;
  return new;
end;
$$;

create or replace function private.capture_launch_match_slug_alias()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if old.public_slug is distinct from new.public_slug and old.public_slug is not null then
    insert into public.launch_match_url_aliases(alias, match_id, kind)
    values (old.public_slug, new.id, 'previous_slug')
    on conflict (alias) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_launch_match_identity on public.launch_schedule_matches;
create trigger prepare_launch_match_identity
before insert or update of home_team_id, away_team_id, round_id, season_id, public_slug
on public.launch_schedule_matches
for each row execute function private.prepare_launch_match_identity();

drop trigger if exists capture_launch_match_slug_alias on public.launch_schedule_matches;
create trigger capture_launch_match_slug_alias
after update of public_slug on public.launch_schedule_matches
for each row execute function private.capture_launch_match_slug_alias();

alter table public.launch_match_url_aliases enable row level security;

drop policy if exists "Public can resolve match URL aliases" on public.launch_match_url_aliases;
create policy "Public can resolve match URL aliases"
on public.launch_match_url_aliases
for select
to anon, authenticated
using (true);

grant select on public.launch_match_url_aliases to anon, authenticated;

grant execute on function private.launch_match_slug(text, text, text, text, text) to authenticated;

comment on column public.launch_schedule_matches.public_slug is
  'Canonical public URL segment. Presentation only; never use as a foreign key.';
comment on table public.launch_match_url_aliases is
  'Legacy and previous public URL segments that resolve to an immutable internal match ID.';
