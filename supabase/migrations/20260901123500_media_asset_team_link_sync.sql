-- Keep the many-to-many team context synchronized for every media asset.
-- This preserves existing single-team editing while allowing match assets to
-- belong to both home and away teams without duplicating the stored image.

create or replace function private.sync_media_asset_team_links()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  match_row record;
begin
  delete from public.media_asset_team_links
  where media_asset_id = new.id;

  if new.match_id is not null then
    select home_team_id, away_team_id
    into match_row
    from public.launch_schedule_matches
    where id = new.match_id;

    if match_row.home_team_id is not null then
      insert into public.media_asset_team_links (media_asset_id, team_id, source)
      values (new.id, match_row.home_team_id, 'match')
      on conflict (media_asset_id, team_id) do nothing;
    end if;

    if match_row.away_team_id is not null then
      insert into public.media_asset_team_links (media_asset_id, team_id, source)
      values (new.id, match_row.away_team_id, 'match')
      on conflict (media_asset_id, team_id) do nothing;
    end if;
  end if;

  if new.team_id is not null then
    insert into public.media_asset_team_links (media_asset_id, team_id, source)
    values (new.id, new.team_id, 'manual')
    on conflict (media_asset_id, team_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_media_asset_team_links_trigger
  on public.media_assets;

create trigger sync_media_asset_team_links_trigger
after insert or update of team_id, match_id
on public.media_assets
for each row
execute function private.sync_media_asset_team_links();

-- Normalize all existing assets once so older manually tagged photos and the
-- Matchday backfill use the same team-context model.
insert into public.media_asset_team_links (media_asset_id, team_id, source)
select id, team_id, 'manual'
from public.media_assets
where team_id is not null
  and deleted_at is null
on conflict (media_asset_id, team_id) do nothing;

insert into public.media_asset_team_links (media_asset_id, team_id, source)
select asset.id, team_id, 'match'
from public.media_assets asset
join public.launch_schedule_matches match on match.id = asset.match_id
cross join lateral (
  values (match.home_team_id), (match.away_team_id)
) team(team_id)
where asset.match_id is not null
  and asset.deleted_at is null
  and team_id is not null
on conflict (media_asset_id, team_id) do nothing;
