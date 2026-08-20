create table if not exists private.captain_reminder_rate_limits (
  actor_user_id uuid not null,
  match_id text not null,
  send_date date not null default current_date,
  last_sent_at timestamptz null,
  sends_today integer not null default 0 check (sends_today >= 0),
  primary key (actor_user_id, match_id)
);

create or replace function public.claim_captain_reminder_send(target_match_id text)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
set row_security = off
as $$
declare
  caller_user_id uuid := auth.uid();
  row_send_date date;
  row_last_sent_at timestamptz;
  row_sends_today integer;
begin
  if caller_user_id is null or nullif(btrim(target_match_id), '') is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.launch_profiles p
    where p.user_id = caller_user_id
      and p.role = 'Captain'
      and p.status = 'Approved'
  ) then
    return false;
  end if;

  insert into private.captain_reminder_rate_limits (
    actor_user_id,
    match_id,
    send_date,
    last_sent_at,
    sends_today
  ) values (
    caller_user_id,
    target_match_id,
    current_date,
    null,
    0
  )
  on conflict (actor_user_id, match_id) do nothing;

  select send_date, last_sent_at, sends_today
    into row_send_date, row_last_sent_at, row_sends_today
  from private.captain_reminder_rate_limits
  where actor_user_id = caller_user_id
    and match_id = target_match_id
  for update;

  if row_send_date <> current_date then
    row_send_date := current_date;
    row_last_sent_at := null;
    row_sends_today := 0;
  end if;

  if row_last_sent_at is not null
     and row_last_sent_at > now() - interval '5 minutes' then
    return false;
  end if;

  if row_sends_today >= 5 then
    return false;
  end if;

  update private.captain_reminder_rate_limits
  set send_date = current_date,
      last_sent_at = now(),
      sends_today = row_sends_today + 1
  where actor_user_id = caller_user_id
    and match_id = target_match_id;

  return true;
end;
$$;

revoke all on function public.claim_captain_reminder_send(text) from public, anon;
grant execute on function public.claim_captain_reminder_send(text) to authenticated;
