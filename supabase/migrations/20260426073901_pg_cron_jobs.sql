create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobname)
from cron.job
where jobname in (
  'expire-pending-bookings',
  'create-monthly-invoices',
  'send-invoices',
  'billing-reminders'
);

select cron.schedule('expire-pending-bookings', '*/5 * * * *', $$
  update public.bookings
  set status = 'expired'
  where status = 'pending'
  and created_at < now() - interval '5 minutes'
$$);

-- Replace CRON_SECRET before pushing to production, or move this to a Vault-backed deployment step.
select cron.schedule('create-monthly-invoices', '0 8 1 * *', $$
  select net.http_post(
    url := 'https://zakazi.pro/api/cron/create-invoices',
    headers := '{"Authorization": "Bearer CHANGE_ME_CRON_SECRET"}'::jsonb
  )
$$);

select cron.schedule('send-invoices', '0 8 2 * *', $$
  select net.http_post(
    url := 'https://zakazi.pro/api/cron/send-invoices',
    headers := '{"Authorization": "Bearer CHANGE_ME_CRON_SECRET"}'::jsonb
  )
$$);

select cron.schedule('billing-reminders', '0 9 * * *', $$
  select net.http_post(
    url := 'https://zakazi.pro/api/cron/billing-check',
    headers := '{"Authorization": "Bearer CHANGE_ME_CRON_SECRET"}'::jsonb
  )
$$);
