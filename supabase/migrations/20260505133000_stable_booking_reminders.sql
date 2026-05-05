alter table public.providers
add column if not exists booking_reminders_enabled boolean not null default true,
add column if not exists booking_reminder_hours_before int not null default 2
  check (booking_reminder_hours_before between 1 and 168);

alter table public.booking_email_logs
drop constraint if exists booking_email_logs_status_check;

alter table public.booking_email_logs
add constraint booking_email_logs_status_check
check (status in ('processing', 'sent', 'failed', 'skipped'));

create index if not exists bookings_status_starts_at_idx
on public.bookings(status, starts_at);

create index if not exists booking_email_logs_reminder_lookup_idx
on public.booking_email_logs(booking_id, email_type, trigger_source, status);

create or replace function public.claim_booking_reminder_email_log(
  p_booking_id uuid,
  p_provider_id uuid,
  p_recipient_email text,
  p_subject text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_booking_id::text || ':reminder_client', 0));

  select id
  into v_log_id
  from public.booking_email_logs
  where booking_id = p_booking_id
    and email_type = 'reminder_client'
    and trigger_source = 'reminder_cron'
    and (
      status in ('sent', 'skipped')
      or (status = 'processing' and created_at > now() - interval '30 minutes')
    )
  order by created_at desc
  limit 1;

  if v_log_id is not null then
    return null;
  end if;

  select id
  into v_log_id
  from public.booking_email_logs
  where booking_id = p_booking_id
    and email_type = 'reminder_client'
    and trigger_source = 'reminder_cron'
    and (
      status = 'failed'
      or (status = 'processing' and created_at <= now() - interval '30 minutes')
    )
  order by created_at desc
  limit 1
  for update;

  if v_log_id is not null then
    update public.booking_email_logs
    set
      recipient_email = p_recipient_email,
      subject = p_subject,
      status = 'processing',
      brevo_message_id = null,
      error_message = null,
      sent_at = null,
      created_at = now()
    where id = v_log_id;

    return v_log_id;
  end if;

  insert into public.booking_email_logs (
    booking_id,
    provider_id,
    email_type,
    trigger_source,
    recipient_email,
    subject,
    status
  )
  values (
    p_booking_id,
    p_provider_id,
    'reminder_client',
    'reminder_cron',
    p_recipient_email,
    p_subject,
    'processing'
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

grant execute on function public.claim_booking_reminder_email_log(uuid, uuid, text, text)
to service_role;

select cron.unschedule(jobname)
from cron.job
where jobname in ('send-booking-reminders');

select cron.schedule('send-booking-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://zakazi.pro/api/cron/send-booking-reminders',
    headers := '{"Authorization": "Bearer CHANGE_ME_CRON_SECRET"}'::jsonb
  )
$$);
