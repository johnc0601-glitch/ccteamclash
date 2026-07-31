begin;

select plan(4);

set local role anon;
select is(
  (select count(*)::integer from public.launch_schedules where published),
  (select count(*)::integer from public.launch_schedules),
  'anonymous users see only published schedules'
);
select is(
  (select count(*)::integer from public.launch_rounds where published),
  (select count(*)::integer from public.launch_rounds),
  'anonymous users see only published rounds'
);

select throws_ok(
  $$insert into public.launch_schedules
    (id, season_id, name, description, published, created_at, updated_at)
    values
    ('anon-forbidden', 'summer-team-clash-2026', 'Forbidden', '', false, now(), now())$$,
  '42501',
  null,
  'anonymous users cannot create schedules'
);

set local role authenticated;
select is(
  (with deleted as (
    delete from public.launch_schedules where id = 'summer-2026-championship' returning id
  ) select count(*)::integer from deleted),
  0,
  'non-commissioner authenticated users cannot delete schedules'
);

select * from finish();
rollback;
