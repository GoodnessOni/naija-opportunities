begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'naija-v3-instant-alerts',
  '*/5 * * * *',
  $job$
  select net.http_get(
    url := 'https://naija-opportunities-v3.vercel.app/api/alerts/digest?delivery=instant',
    headers := jsonb_build_object('Authorization','Bearer ' || decrypted_secret),
    timeout_milliseconds := 15000
  )
  from vault.decrypted_secrets
  where name = 'naija_v3_alert_cron_secret'
    and length(decrypted_secret) >= 32
  limit 1;
  $job$
);
commit;
