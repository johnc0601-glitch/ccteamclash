-- Align existing provisional players with the new hardcoded Clash starting baselines.
-- This is an administrative seed adjustment and must never count toward CI +/-.

select set_config('app.clash_rating_engine_write', 'on', true);

update public.launch_players
set clash_index = 825,
    updated_at = now()
where clash_index_provisional = true
  and pdga_rating is null
  and gender = 'Male'
  and clash_index = 850;

update public.launch_players
set clash_index = 700,
    updated_at = now()
where clash_index_provisional = true
  and pdga_rating is null
  and gender = 'Female'
  and clash_index = 725;

select set_config('app.clash_rating_engine_write', 'off', true);
