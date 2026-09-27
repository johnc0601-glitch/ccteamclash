-- Robust push-delivery claiming and environment-specific dispatch endpoint.

alter table public.launch_push_config
  add column if not exists dispatch_url text;

alter table public.launch_notification_outbox
  add column if not exists processing_at timestamptz;

create index if not exists launch_notification_outbox_claim_idx
  on public.launch_notification_outbox(created_at)
  where sent_at is null and skipped_at is null;

drop function if exists public.get_push_delivery_config();

create function public.get_push_delivery_config()
returns table (
  public_key text,
  private_key text,
  dispatch_token text,
  subject text,
  dispatch_url text,
  enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    config.public_key,
    private_secret.decrypted_secret,
    dispatch_secret.decrypted_secret,
    config.subject,
    config.dispatch_url,
    config.enabled
  from public.launch_push_config config
  left join vault.decrypted_secrets private_secret
    on private_secret.name = 'team_clash_push_private_key'
  left join vault.decrypted_secrets dispatch_secret
    on dispatch_secret.name = 'team_clash_push_dispatch_token'
  where config.id = 'default'
  limit 1
$$;

revoke all on function public.get_push_delivery_config() from public, anon, authenticated;
grant execute on function public.get_push_delivery_config() to service_role;

create or replace function public.claim_push_notification_outbox(
  p_limit integer default 50
)
returns setof public.launch_notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 200 then
    raise exception 'Push claim limit must be between 1 and 200.' using errcode='22023';
  end if;

  update public.launch_notification_outbox
  set skipped_at = now(),
      processing_at = null,
      last_error = coalesce(last_error,'Notification expired before delivery.')
  where sent_at is null
    and skipped_at is null
    and expires_at <= now();

  return query
  with picked as (
    select item.id
    from public.launch_notification_outbox item
    where item.sent_at is null
      and item.skipped_at is null
      and item.expires_at > now()
      and (
        item.processing_at is null
        or item.processing_at < now() - interval '5 minutes'
      )
    order by item.created_at
    for update skip locked
    limit p_limit
  )
  update public.launch_notification_outbox item
  set processing_at = now(),
      attempts = item.attempts + 1
  from picked
  where item.id = picked.id
  returning item.*;
end;
$$;

revoke all on function public.claim_push_notification_outbox(integer)
from public, anon, authenticated;
grant execute on function public.claim_push_notification_outbox(integer)
to service_role;

drop function if exists public.initialize_push_delivery_config(text,text,text,text);

create function public.initialize_push_delivery_config(
  p_public_key text,
  p_private_key text,
  p_dispatch_token text,
  p_dispatch_url text,
  p_subject text default 'https://ccteamclash.com'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(length(trim(p_public_key)),0) < 80
     or coalesce(length(trim(p_private_key)),0) < 40
     or coalesce(length(trim(p_dispatch_token)),0) < 32
     or coalesce(length(trim(p_dispatch_url)),0) < 20 then
    raise exception 'Invalid Web Push bootstrap material.' using errcode='22023';
  end if;

  if exists (
    select 1 from public.launch_push_config where id='default' and enabled
  ) or exists (
    select 1 from vault.secrets
    where name in ('team_clash_push_private_key','team_clash_push_dispatch_token')
  ) then
    raise exception 'Web Push delivery is already initialized.' using errcode='55000';
  end if;

  insert into public.launch_push_config(
    id,public_key,subject,dispatch_url,enabled,updated_at
  )
  values (
    'default',
    trim(p_public_key),
    coalesce(nullif(trim(p_subject),''),'https://ccteamclash.com'),
    trim(p_dispatch_url),
    true,
    now()
  )
  on conflict(id) do update set
    public_key=excluded.public_key,
    subject=excluded.subject,
    dispatch_url=excluded.dispatch_url,
    enabled=true,
    updated_at=now();

  perform vault.create_secret(
    trim(p_private_key),
    'team_clash_push_private_key',
    'Team Clash Web Push VAPID private key'
  );
  perform vault.create_secret(
    trim(p_dispatch_token),
    'team_clash_push_dispatch_token',
    'Team Clash internal Web Push dispatch token'
  );

  return true;
end;
$$;

revoke all on function public.initialize_push_delivery_config(text,text,text,text,text)
from public, anon, authenticated;
grant execute on function public.initialize_push_delivery_config(text,text,text,text,text)
to service_role;
