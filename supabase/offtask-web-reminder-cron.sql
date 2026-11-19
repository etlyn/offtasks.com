-- Run after configuring the Edge Function, Vault secret names, and allowed origin.
-- The first-party queue is empty when nothing is due, so no HTTP request is sent.
create extension if not exists pg_net;

select cron.schedule('offtasks-web-reminders', '* * * * *', $job$
  select net.http_post(
    url := endpoint.decrypted_secret,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-offtasks-cron', token.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  from vault.decrypted_secrets endpoint
  cross join vault.decrypted_secrets token
  where endpoint.name = 'offtasks_web_reminder_url'
    and token.name = 'offtasks_web_reminder_token'
    and exists (
      select 1 from public.offtask_web_reminders r
      join public.offtask_web_reminder_devices d on d.id = r.device_id
      join public.offtask_web_reminder_origins o on o.origin = d.origin
      where r.available_at <= now()
    );
$job$);
