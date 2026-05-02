create table public.booking_email_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  email_type text not null check (
    email_type in (
      'confirmation_client',
      'confirmation_admin',
      'cancellation_client',
      'cancellation_admin'
    )
  ),
  trigger_source text not null check (
    trigger_source in (
      'public_booking',
      'admin_manual',
      'resend',
      'client_cancellation'
    )
  ),
  recipient_email text,
  subject text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  brevo_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index booking_email_logs_booking_id_created_at_idx
on public.booking_email_logs(booking_id, created_at desc);

create index booking_email_logs_provider_id_created_at_idx
on public.booking_email_logs(provider_id, created_at desc);

alter table public.booking_email_logs enable row level security;

grant select on public.booking_email_logs to authenticated;

create policy "booking_email_logs read own"
on public.booking_email_logs for select
to authenticated
using (
  exists (
    select 1
    from public.providers
    where providers.id = booking_email_logs.provider_id
      and providers.user_id = auth.uid()
  )
);
