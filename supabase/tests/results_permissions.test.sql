begin;

select plan(5);

set local role anon;
select is(
  (select count(*)::integer from public.launch_match_results where status = 'Published'),
  (select count(*)::integer from public.launch_match_results),
  'anonymous users see only published results'
);
select throws_ok(
  $$insert into public.launch_match_results (match_id, home_score, away_score, status)
    values ('summer-2026-r1-dark-ninjas', 1, 0, 'Draft')$$,
  '42501',
  null,
  'anonymous users cannot save drafts'
);

set local role authenticated;
select is(
  (with inserted as (
    insert into public.launch_match_results (match_id, home_score, away_score, status)
    values ('summer-2026-r1-dark-ninjas', 1, 0, 'Draft')
    on conflict (match_id) do nothing returning match_id
  ) select count(*)::integer from inserted),
  0,
  'non-commissioners cannot create results'
);
select is(
  (with changed as (
    update public.launch_match_results set home_score = 99 returning match_id
  ) select count(*)::integer from changed),
  0,
  'non-commissioners cannot edit results'
);
select is(
  (with removed as (
    delete from public.launch_match_results returning match_id
  ) select count(*)::integer from removed),
  0,
  'non-commissioners cannot delete results'
);

select * from finish();
rollback;
