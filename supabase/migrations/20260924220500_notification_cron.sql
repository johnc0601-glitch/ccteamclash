-- Supabase Cron keeps notification timing inside the existing database,
-- avoiding paid Vercel cron precision requirements.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'team-clash-notification-queue-v1',
  '*/5 * * * *',
  $job$select public.queue_due_team_clash_notifications();$job$
);

select cron.schedule(
  'team-clash-cron-history-cleanup-v1',
  '17 4 * * *',
  $job$
    delete from cron.job_run_details
    where end_time is not null
      and end_time < now() - interval '30 days';
  $job$
);
