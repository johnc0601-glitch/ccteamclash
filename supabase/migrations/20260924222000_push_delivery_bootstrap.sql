-- One-time service-role bootstrap for Web Push keys.
-- The private VAPID key and dispatch token are generated inside the Edge runtime
-- and written directly to Vault; they never enter source control.

create or replace function public.initialize_push_delivery_config(
  p_public_key text,
  p_private_key text,
  p_dispatch_token text,
  p_subject text default 'https://ccteamclash.com'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(length(trim(p_public_key)), 0) < 80
     or coalesce(length(trim(p_private_key)), 0) < 40
     or coalesce(length(trim(p_dispatch_token)), 0) < 32 then
    raise exception 'Invalid Web Push key material.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.launch_push_config
    where id='default' and enabled
  ) or exists (
    select 1 from vault.secrets
    where name in ('team_clash_push_private_key','team_clash_push_dispatch_token')
  ) then
    raise exception 'Web Push delivery is already initialized.' using errcode = '55000';
  end if;

  insert into public.launch_push_config(id,public_key,subject,enabled,updated_at)
  values ('default',trim(p_public_key),coalesce(nullif(trim(p_subject),''),'https://ccteamclash.com'),true,now())
  on conflict(id) do update set
    public_key=excluded.public_key,
    subject=excluded.subject,
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

revoke all on function public.initialize_push_delivery_config(text,text,text,text)
from public, anon, authenticated;
grant execute on function public.initialize_push_delivery_config(text,text,text,text)
to service_role;

comment on function public.initialize_push_delivery_config(text,text,text,text) is
  'Service-role-only one-time bootstrap for Web Push. Stores private material directly in Supabase Vault.';
