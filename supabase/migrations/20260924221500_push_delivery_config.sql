-- Web Push public configuration and service-role-only access to Vault secrets.
-- Private key values are never stored in this migration or source control.

create table if not exists public.launch_push_config (
  id text primary key default 'default' check (id = 'default'),
  public_key text not null,
  subject text not null default 'https://ccteamclash.com',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.launch_push_config enable row level security;

drop policy if exists "push config public read" on public.launch_push_config;
create policy "push config public read"
on public.launch_push_config
for select
to anon, authenticated
using (enabled);

grant select on public.launch_push_config to anon, authenticated;

create or replace function public.get_push_delivery_config()
returns table (
  public_key text,
  private_key text,
  dispatch_token text,
  subject text,
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

comment on table public.launch_push_config is
  'Public Web Push configuration only. Private VAPID and dispatch secrets are stored in Supabase Vault.';
comment on function public.get_push_delivery_config() is
  'Service-role-only Web Push delivery configuration, including Vault-backed private material.';
