do $$
declare
  target_schedule_id text := 'summer-2026-championship';
  legacy_schedule_id text := 'summer-2026-playoff-planning';
  next_round_number integer;
begin
  update public.launch_schedules
  set
    name = '2026 Schedule',
    description = '',
    updated_at = now()
  where id = target_schedule_id;

  if exists (
    select 1 from public.launch_schedules where id = target_schedule_id
  ) and exists (
    select 1 from public.launch_schedules where id = legacy_schedule_id
  ) then
    update public.launch_rounds
    set number = number + 10000
    where schedule_id = legacy_schedule_id;

    select coalesce(max(number), 0) + 1
    into next_round_number
    from public.launch_rounds
    where schedule_id = target_schedule_id;

    update public.launch_rounds
    set
      schedule_id = target_schedule_id,
      number = case id
        when 'summer-2026-draft-round-1' then next_round_number
        when 'summer-2026-playoff-championship-round' then next_round_number + 1
        else number
      end,
      name = case id
        when 'summer-2026-draft-round-1' then 'Semifinals'
        when 'summer-2026-playoff-championship-round' then 'Championship'
        else name
      end,
      updated_at = now()
    where schedule_id = legacy_schedule_id;

    delete from public.launch_schedules
    where id = legacy_schedule_id
      and not exists (
        select 1
        from public.launch_rounds
        where schedule_id = legacy_schedule_id
      );
  end if;
end
$$;

create unique index if not exists launch_schedules_one_per_season_idx
  on public.launch_schedules (season_id);
