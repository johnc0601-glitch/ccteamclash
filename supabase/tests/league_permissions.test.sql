begin;

select plan(4);

set local role anon;
select is(
  (select count(*)::integer from public.launch_leagues where active),
  (select count(*)::integer from public.launch_leagues),
  'anonymous users see active leagues'
);
select throws_ok(
  $$insert into public.launch_leagues (id, name, short_name)
    values ('unauthorized-league', 'Unauthorized League', 'Unauthorized')$$,
  '42501',
  null,
  'anonymous users cannot create leagues'
);

set local role authenticated;
select is(
  (with changed as (
    update public.launch_leagues set name = 'Unauthorized' returning id
  ) select count(*)::integer from changed),
  0,
  'non-commissioners cannot edit leagues'
);
select is(
  (with removed as (
    delete from public.launch_leagues returning id
  ) select count(*)::integer from removed),
  0,
  'non-commissioners cannot delete leagues'
);

select * from finish();
rollback;
