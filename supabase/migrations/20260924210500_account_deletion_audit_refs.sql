-- Audit snapshots must not prevent an account from being deleted.
-- The generated content remains; only the deleted Auth identity reference is cleared.

do $$
begin
  if to_regclass('public.clash_pulse_snapshots') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema='public'
         and table_name='clash_pulse_snapshots'
         and column_name='generated_by'
     ) then
    alter table public.clash_pulse_snapshots
      alter column generated_by drop not null;

    alter table public.clash_pulse_snapshots
      drop constraint if exists clash_pulse_snapshots_generated_by_fkey;

    alter table public.clash_pulse_snapshots
      add constraint clash_pulse_snapshots_generated_by_fkey
      foreign key (generated_by)
      references auth.users(id)
      on delete set null;
  end if;
end
$$;
