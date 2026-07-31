begin;

select plan(6);

set local role anon;
select is(
  (select count(*)::integer from public.launch_playoff_brackets where status = 'Draft'),
  0,
  'anonymous users cannot see draft brackets'
);
select is(
  (select count(*)::integer from public.launch_playoff_games game
    join public.launch_playoff_brackets bracket on bracket.id = game.bracket_id
    where bracket.status = 'Draft'),
  0,
  'anonymous users cannot see games in draft brackets'
);
select throws_ok(
  $$insert into public.launch_playoff_brackets (
      id, season_id, status, regular_season_locked_at
    ) values (
      'unauthorized-playoffs', 'summer-team-clash-2026', 'Draft', now()
    )$$,
  '42501',
  null,
  'anonymous users cannot create brackets'
);

set local role authenticated;
select is(
  (with inserted as (
    insert into public.launch_playoff_brackets (
      id, season_id, status, regular_season_locked_at
    ) values (
      'unauthorized-playoffs', 'summer-team-clash-2026', 'Draft', now()
    ) on conflict (season_id) do nothing returning id
  ) select count(*)::integer from inserted),
  0,
  'non-commissioners cannot create brackets'
);
select is(
  (with changed as (
    update public.launch_playoff_brackets set status = 'Published' returning id
  ) select count(*)::integer from changed),
  0,
  'non-commissioners cannot publish brackets'
);
select is(
  (with removed as (
    delete from public.launch_playoff_games returning id
  ) select count(*)::integer from removed),
  0,
  'non-commissioners cannot delete playoff games'
);

select * from finish();
rollback;
