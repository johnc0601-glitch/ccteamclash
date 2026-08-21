alter table public.launch_teams
  add column if not exists primary_color text not null default '#006f71',
  add column if not exists secondary_color text not null default '#f4f6f2',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists captain text not null default '',
  add column if not exists home_course text not null default '',
  add column if not exists website text not null default '',
  add column if not exists facebook text not null default '',
  add column if not exists description text not null default '';

create or replace function private.guard_launch_team_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user in ('postgres','service_role','supabase_admin') or private.is_launch_commissioner() then
    new.updated_at := clock_timestamp();
    return new;
  end if;

  if private.is_launch_captain_for_team(old.id) then
    if new.id is distinct from old.id
      or new.name is distinct from old.name
      or new.short_name is distinct from old.short_name
      or new.active is distinct from old.active
      or new.created_at is distinct from old.created_at
      or new.city is distinct from old.city
      or new.state is distinct from old.state
      or new.captain is distinct from old.captain
      or new.home_course is distinct from old.home_course
      or new.website is distinct from old.website
      or new.facebook is distinct from old.facebook
      or new.description is distinct from old.description
    then
      raise exception 'Captains may only change team appearance.' using errcode = '42501';
    end if;
    new.updated_at := clock_timestamp();
    return new;
  end if;

  raise exception 'Team update is not permitted.' using errcode = '42501';
end;
$$;

drop trigger if exists guard_launch_team_update on public.launch_teams;
create trigger guard_launch_team_update
before update on public.launch_teams
for each row execute function private.guard_launch_team_update();

drop policy if exists "launch captains update own team appearance" on public.launch_teams;
create policy "launch captains update own team appearance"
on public.launch_teams for update
to authenticated
using (private.is_launch_captain_for_team(id) or private.is_launch_commissioner())
with check (private.is_launch_captain_for_team(id) or private.is_launch_commissioner());

drop policy if exists "launch commissioners insert teams" on public.launch_teams;
create policy "launch commissioners insert teams"
on public.launch_teams for insert
to authenticated
with check (private.is_launch_commissioner());

drop policy if exists "launch commissioners delete teams" on public.launch_teams;
create policy "launch commissioners delete teams"
on public.launch_teams for delete
to authenticated
using (private.is_launch_commissioner());

drop policy if exists "launch commissioners read all teams" on public.launch_teams;
create policy "launch commissioners read all teams"
on public.launch_teams for select
to authenticated
using (private.is_launch_commissioner());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('team-logos','team-logos',true,5242880,array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads team logos" on storage.objects;
create policy "public reads team logos"
on storage.objects for select
to public
using (bucket_id = 'team-logos');

drop policy if exists "captains upload own team logos" on storage.objects;
create policy "captains upload own team logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'team-logos'
  and split_part(name,'/',1) = 'teams'
  and (private.is_launch_commissioner() or private.is_launch_captain_for_team(split_part(name,'/',2)))
);

drop policy if exists "captains update own team logos" on storage.objects;
create policy "captains update own team logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'team-logos'
  and split_part(name,'/',1) = 'teams'
  and (private.is_launch_commissioner() or private.is_launch_captain_for_team(split_part(name,'/',2)))
)
with check (
  bucket_id = 'team-logos'
  and split_part(name,'/',1) = 'teams'
  and (private.is_launch_commissioner() or private.is_launch_captain_for_team(split_part(name,'/',2)))
);

drop policy if exists "captains delete own team logos" on storage.objects;
create policy "captains delete own team logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'team-logos'
  and split_part(name,'/',1) = 'teams'
  and (private.is_launch_commissioner() or private.is_launch_captain_for_team(split_part(name,'/',2)))
);
