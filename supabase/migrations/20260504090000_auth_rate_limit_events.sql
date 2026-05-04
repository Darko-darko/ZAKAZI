create table public.auth_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null check (
    action in ('register', 'login', 'forgot_password', 'resend_confirmation')
  ),
  email text,
  ip_address text,
  created_at timestamptz not null default now()
);

create index auth_rate_limit_events_action_created_at_idx
on public.auth_rate_limit_events(action, created_at desc);

create index auth_rate_limit_events_action_email_created_at_idx
on public.auth_rate_limit_events(action, email, created_at desc)
where email is not null;

create index auth_rate_limit_events_action_ip_created_at_idx
on public.auth_rate_limit_events(action, ip_address, created_at desc)
where ip_address is not null;

alter table public.auth_rate_limit_events enable row level security;
