create table if not exists public.burnt_mill_survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  support text not null
    check (support in ('strongly_support','somewhat_support','neutral_unsure','somewhat_oppose','strongly_oppose')),
  likely_use text not null
    check (likely_use in ('very_likely','somewhat_likely','not_sure','somewhat_unlikely','very_unlikely')),
  park_visit_frequency text not null
    check (park_visit_frequency in ('weekly_plus','few_times_month','monthly','few_times_year','rarely','never')),
  disc_golf_experience text not null
    check (disc_golf_experience in ('regular','occasional','new_interested','nonplayer_interested','nonplayer')),
  considerations text[] not null default '{}'::text[],
  comment text check (comment is null or char_length(comment) <= 2000),
  wilmington_resident text not null
    check (wilmington_resident in ('yes','no','not_sure')),
  zip_code text not null check (zip_code ~ '^[0-9]{5}$'),
  source text check (source is null or char_length(source) <= 100),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$')
);

alter table public.burnt_mill_survey_responses enable row level security;

revoke all on table public.burnt_mill_survey_responses from anon, authenticated;
grant select, insert, update, delete on table public.burnt_mill_survey_responses to service_role;

create index if not exists burnt_mill_survey_created_at_idx
  on public.burnt_mill_survey_responses (created_at desc);

create index if not exists burnt_mill_survey_ip_hash_created_at_idx
  on public.burnt_mill_survey_responses (ip_hash, created_at desc);

comment on table public.burnt_mill_survey_responses is
  'Anonymous, self-selected community input survey responses for the proposed permanent Burnt Mill Creek disc golf course.';
