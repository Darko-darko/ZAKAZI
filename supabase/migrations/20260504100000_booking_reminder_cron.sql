alter table public.booking_email_logs
drop constraint if exists booking_email_logs_email_type_check;

alter table public.booking_email_logs
add constraint booking_email_logs_email_type_check
check (
  email_type in (
    'confirmation_client',
    'confirmation_admin',
    'cancellation_client',
    'cancellation_admin',
    'reminder_client'
  )
);

alter table public.booking_email_logs
drop constraint if exists booking_email_logs_trigger_source_check;

alter table public.booking_email_logs
add constraint booking_email_logs_trigger_source_check
check (
  trigger_source in (
    'public_booking',
    'admin_manual',
    'resend',
    'client_cancellation',
    'reminder_cron'
  )
);

select cron.unschedule(jobname)
from cron.job
where jobname in ('send-booking-reminders');

select cron.schedule('send-booking-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://zakazi.pro/api/cron/send-booking-reminders',
    headers := '{"Authorization": "Bearer CHANGE_ME_CRON_SECRET"}'::jsonb
  )
$$);
