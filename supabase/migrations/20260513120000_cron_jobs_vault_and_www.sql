-- Canonical source of truth for HTTP-based pg_cron jobs.
--
-- Fixes two issues introduced by earlier cron migrations:
--   1. URLs pointed at the apex domain (zakazi.pro), which Vercel
--      redirects (307) to www.zakazi.pro. libcurl drops the Authorization
--      header on cross-host redirects, so handlers received the request
--      without a Bearer token and returned 401. All URLs here use www.
--   2. The Bearer token was hardcoded as the literal string
--      CHANGE_ME_CRON_SECRET inside cron.schedule bodies. This file
--      instead reads the token from Vault at job-execution time, so the
--      secret never appears in git or in cron command text.
--
-- Supersedes the cron.schedule blocks in:
--   - 20260426073901_pg_cron_jobs.sql        (create-monthly-invoices, send-invoices, billing-reminders)
--   - 20260504100000_booking_reminder_cron.sql  (send-booking-reminders)
--   - 20260505133000_stable_booking_reminders.sql (send-booking-reminders)
-- Those files are left untouched so historical migration hashes stay
-- stable; this migration always runs last and wins.
--
-- Schedules for create-monthly-invoices and send-invoices changed from
-- monthly (1st/2nd of month) to daily, to support the anniversary billing
-- model introduced in 32c65f7 ("Switch billing to post-trial anniversary
-- cycles"). The daily run is idempotent: each invocation only acts on
-- providers whose anniversary date matches today.
--
-- The job 'expire-pending-bookings' (defined in 20260426073901) is pure
-- SQL with no HTTP call and is intentionally NOT touched here.
--
-- BEFORE applying this migration, the 'cron_secret' must exist in Vault.
-- Run (in Supabase SQL editor, one-time per environment):
--   select vault.create_secret('<real_secret>', 'cron_secret', 'Bearer token for pg_cron HTTP jobs');
-- Verify with:
--   select count(*) from vault.decrypted_secrets where name = 'cron_secret';
--
-- The guard below aborts the migration if the secret is missing, so an
-- accidental apply will NOT unschedule any working job.

do $$
begin
  if (select count(*) from vault.decrypted_secrets where name = 'cron_secret') = 0 then
    raise exception using
      message = 'cron_secret missing from vault. Populate it before applying this migration.',
      hint = 'select vault.create_secret(''<real_secret>'', ''cron_secret'', ''Bearer token for pg_cron HTTP jobs'');';
  end if;
end
$$;

select cron.unschedule(jobname)
from cron.job
where jobname in (
  'send-booking-reminders',
  'create-monthly-invoices',
  'send-invoices',
  'billing-reminders'
);

select cron.schedule('send-booking-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://www.zakazi.pro/api/cron/send-booking-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
$$);

select cron.schedule('create-monthly-invoices', '0 8 * * *', $$
  select net.http_post(
    url := 'https://www.zakazi.pro/api/cron/create-invoices',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
$$);

select cron.schedule('send-invoices', '5 8 * * *', $$
  select net.http_post(
    url := 'https://www.zakazi.pro/api/cron/send-invoices',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
$$);

select cron.schedule('billing-reminders', '0 9 * * *', $$
  select net.http_post(
    url := 'https://www.zakazi.pro/api/cron/billing-check',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
$$);
