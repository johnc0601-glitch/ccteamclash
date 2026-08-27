-- A brand-new player with a verified PDGA rating starts Clash Index at that rating.
-- This only applies before the player has any Coastal Clash rating history. Later
-- PDGA rating changes must never overwrite an earned Clash Index.

create or replace function private.seed_new_player_ci_from_pdga()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pdga_rating is null
     or nullif(btrim(coalesce(new.pdga_number, '')), '') is null then
    return new;
  end if;

  -- An update seeds CI only when the PDGA rating is first populated. A later
  -- PDGA refresh cannot reset CI, even if the player has not played recently.
  if tg_op = 'UPDATE' and old.pdga_rating is not null then
    return new;
  end if;

  -- "New" means no historical league play, no published CI facts, and no
  -- frozen match snapshot. Returning/established players keep their earned CI.
  if exists (
       select 1 from public.historical_player_matchups h where h.player_id = new.id
     )
     or exists (
       select 1 from public.clash_contest_rating_facts f where f.player_id = new.id
     )
     or exists (
       select 1 from public.clash_match_rating_snapshots s where s.player_id = new.id
     ) then
    return new;
  end if;

  new.clash_index := new.pdga_rating;
  return new;
end;
$$;

drop trigger if exists seed_new_player_ci_from_pdga on public.launch_players;
create trigger seed_new_player_ci_from_pdga
before insert or update of pdga_rating on public.launch_players
for each row
execute function private.seed_new_player_ci_from_pdga();
