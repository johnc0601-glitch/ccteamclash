-- One-time/maintenance helper for replacing the Vault VAPID export.
-- Service role only; validates that both public/private JWK objects exist.

create or replace function public.replace_push_vapid_secret(
  p_exported_vapid_json text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  target_secret_id uuid;
begin
  begin
    payload := p_exported_vapid_json::jsonb;
  exception when others then
    raise exception 'VAPID export must be valid JSON.' using errcode='22023';
  end;

  if jsonb_typeof(payload->'publicKey') <> 'object'
     or jsonb_typeof(payload->'privateKey') <> 'object'
     or coalesce(payload->'privateKey'->>'d','') = ''
     or coalesce(payload->'privateKey'->>'x','') = ''
     or coalesce(payload->'privateKey'->>'y','') = '' then
    raise exception 'VAPID export is incomplete.' using errcode='22023';
  end if;

  select id
  into target_secret_id
  from vault.secrets
  where name='team_clash_push_private_key'
  limit 1;

  if target_secret_id is null then
    raise exception 'Team Clash VAPID secret does not exist.' using errcode='P0002';
  end if;

  perform vault.update_secret(
    target_secret_id,
    p_exported_vapid_json,
    'team_clash_push_private_key',
    'Team Clash exported VAPID JWK key pair',
    null
  );

  return true;
end;
$$;

revoke all on function public.replace_push_vapid_secret(text)
from public, anon, authenticated;
grant execute on function public.replace_push_vapid_secret(text)
to service_role;

comment on function public.replace_push_vapid_secret(text) is
  'Service-role-only maintenance helper for storing the complete exported VAPID JWK pair in Vault.';
