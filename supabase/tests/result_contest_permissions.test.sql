begin;

select plan(6);

select has_table('public', 'launch_result_contests', 'player contest table exists');
select has_table('public', 'launch_result_contest_players', 'contest player table exists');
select has_table_privilege('anon', 'public.launch_result_contests', 'select', 'public can read published contests through RLS');
select hasnt_table_privilege('anon', 'public.launch_result_contests', 'insert', 'public cannot create contests');
select has_table_privilege('authenticated', 'public.launch_result_contests', 'insert', 'authenticated commissioners can reach contest writes through RLS');
select has_table_privilege('authenticated', 'public.launch_result_contest_players', 'insert', 'authenticated commissioners can reach player writes through RLS');

select * from finish();
rollback;
