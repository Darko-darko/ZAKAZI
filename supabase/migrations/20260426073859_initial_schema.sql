create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  ref_code text not null unique,
  default_commission_percent int not null default 15 check (default_commission_percent between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  agent_commission_percent int check (agent_commission_percent between 0 and 100),
  ref_code text,
  name text not null,
  slug text not null unique,
  description text,
  intro_text text,
  address text,
  city text,
  phone text,
  billing_email text,
  company_name text,
  company_pib text,
  company_mb text,
  company_address text,
  logo_url text,
  cover_url text,
  primary_color text not null default '#000000',
  text_color text not null default '#ffffff',
  font_choice text not null default 'default' check (font_choice in ('default', 'serif', 'modern', 'elegant')),
  google_review_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  custom_domain text unique,
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro')),
  plan_status text not null default 'trial' check (plan_status in ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  trial_ends_at timestamptz default (now() + interval '30 days'),
  plan_expires_at timestamptz,
  booking_min_notice_hours int not null default 2 check (booking_min_notice_hours >= 0),
  booking_max_days_ahead int not null default 30 check (booking_max_days_ahead > 0),
  cancel_min_hours int not null default 2 check (cancel_min_hours >= 0),
  created_at timestamptz not null default now()
);

create table public.provider_gallery (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  check (start_time < end_time),
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_start < break_end)
  )
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  photo_url text,
  bio text,
  buffer_minutes int not null default 0 check (buffer_minutes >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.worker_schedule (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  shift_id uuid references public.shifts(id) on delete set null,
  unique (worker_id, day_of_week)
);

create table public.shift_rotations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text,
  rotation_start_date date not null,
  created_at timestamptz not null default now()
);

create table public.shift_rotation_members (
  id uuid primary key default gen_random_uuid(),
  rotation_id uuid not null references public.shift_rotations(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  week_odd_shift_id uuid references public.shifts(id) on delete set null,
  week_even_shift_id uuid references public.shifts(id) on delete set null,
  day_of_week int not null check (day_of_week between 0 and 6),
  unique (rotation_id, worker_id, day_of_week)
);

create table public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  date date not null,
  shift_id uuid references public.shifts(id) on delete set null,
  reason text,
  unique (worker_id, date)
);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  reason text,
  is_public_holiday boolean not null default false,
  check (date_from <= date_to)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price int check (price is null or price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.worker_services (
  worker_id uuid not null references public.workers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (worker_id, service_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  client_name text not null,
  client_phone text not null,
  client_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'noshow', 'expired')),
  notes text,
  cancel_token uuid not null unique default gen_random_uuid(),
  review_token uuid not null unique default gen_random_uuid(),
  review_score int check (review_score between 1 and 5),
  review_sent_at timestamptz,
  cancelled_by text check (cancelled_by is null or cancelled_by in ('client', 'admin')),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

alter table public.bookings
  add constraint bookings_no_active_overlap
  exclude using gist (
    worker_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

create table public.invoice_counters (
  year int primary key,
  last_number int not null default 0
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  number text not null unique,
  period_from date,
  period_to date,
  amount int check (amount is null or amount >= 0),
  plan text check (plan is null or plan in ('free', 'basic', 'pro')),
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  payment_method text check (payment_method is null or payment_method in ('virman', 'cash', 'card')),
  payment_proof_url text,
  payment_claimed_at timestamptz,
  payment_claim_token uuid not null unique default gen_random_uuid(),
  pdf_url text,
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  invoice_year int := extract(year from coalesce(new.issued_at, new.created_at, now()))::int;
  next_number int;
begin
  if new.number is not null and new.number <> '' then
    return new;
  end if;

  insert into public.invoice_counters(year, last_number)
  values (invoice_year, 1)
  on conflict (year)
  do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into next_number;

  new.number := invoice_year::text || '-' || lpad(next_number::text, 4, '0');
  return new;
end;
$$;

create trigger set_invoice_number
before insert on public.invoices
for each row execute function public.assign_invoice_number();

create table public.agent_commissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  invoice_id uuid not null unique references public.invoices(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  percent int not null check (percent between 0 and 100),
  amount int not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid')),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  gateway text check (gateway is null or gateway in ('monri', 'fastspring', 'paddle', 'stripe')),
  gateway_payment_id text,
  amount int check (amount is null or amount >= 0),
  currency text not null default 'RSD',
  status text check (status is null or status in ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index agents_user_id_idx on public.agents(user_id);
create index providers_user_id_idx on public.providers(user_id);
create index providers_agent_id_idx on public.providers(agent_id);
create index providers_slug_idx on public.providers(slug);
create index providers_custom_domain_idx on public.providers(custom_domain);
create index provider_gallery_provider_id_idx on public.provider_gallery(provider_id, sort_order);
create index shifts_provider_id_idx on public.shifts(provider_id);
create index workers_provider_id_idx on public.workers(provider_id);
create index worker_schedule_worker_id_idx on public.worker_schedule(worker_id);
create index shift_rotations_provider_id_idx on public.shift_rotations(provider_id);
create index shift_rotation_members_rotation_id_idx on public.shift_rotation_members(rotation_id);
create index shift_rotation_members_worker_id_idx on public.shift_rotation_members(worker_id);
create index schedule_overrides_worker_id_date_idx on public.schedule_overrides(worker_id, date);
create index time_off_provider_id_dates_idx on public.time_off(provider_id, date_from, date_to);
create index time_off_worker_id_dates_idx on public.time_off(worker_id, date_from, date_to);
create index services_provider_id_idx on public.services(provider_id, sort_order);
create index bookings_provider_id_starts_at_idx on public.bookings(provider_id, starts_at);
create index bookings_worker_id_starts_at_idx on public.bookings(worker_id, starts_at);
create index bookings_status_created_at_idx on public.bookings(status, created_at);
create index invoices_provider_id_created_at_idx on public.invoices(provider_id, created_at desc);
create index invoices_status_due_at_idx on public.invoices(status, due_at);
create index agent_commissions_agent_id_idx on public.agent_commissions(agent_id);
create index agent_commissions_provider_id_idx on public.agent_commissions(provider_id);
create index payments_provider_id_idx on public.payments(provider_id);
