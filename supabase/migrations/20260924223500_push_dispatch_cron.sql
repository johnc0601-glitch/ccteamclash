select cron.schedule(
  'team-clash-push-dispatch-v1',
  '*/2 * * * *',
  $job$
    select net.http_post(
      url := config.dispatch_url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-team-clash-dispatch',dispatch_secret.decrypted_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    )
    from public.launch_push_config config
    join vault.decrypted_secrets dispatch_secret
      on dispatch_secret.name='team_clash_push_dispatch_token'
    where config.id='default'
      and config.enabled
      and config.dispatch_url is not null;
  $job$
);
