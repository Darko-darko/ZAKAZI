alter table public.agents enable row level security;
alter table public.providers enable row level security;
alter table public.provider_gallery enable row level security;
alter table public.shifts enable row level security;
alter table public.workers enable row level security;
alter table public.worker_schedule enable row level security;
alter table public.shift_rotations enable row level security;
alter table public.shift_rotation_members enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.time_off enable row level security;
alter table public.services enable row level security;
alter table public.worker_services enable row level security;
alter table public.bookings enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.agent_commissions enable row level security;
alter table public.payments enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.providers to authenticated;
grant select on public.agents to authenticated;
grant update (phone) on public.agents to authenticated;
grant select, insert, update, delete on public.provider_gallery to authenticated;
grant select, insert, update, delete on public.shifts to authenticated;
grant select, insert, update, delete on public.workers to authenticated;
grant select, insert, update, delete on public.worker_schedule to authenticated;
grant select, insert, update, delete on public.shift_rotations to authenticated;
grant select, insert, update, delete on public.shift_rotation_members to authenticated;
grant select, insert, update, delete on public.schedule_overrides to authenticated;
grant select, insert, update, delete on public.time_off to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.worker_services to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select on public.invoices to authenticated;
grant select on public.agent_commissions to authenticated;
grant select on public.payments to authenticated;

create or replace function public.current_provider_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.providers p
  where p.user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_agent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from public.agents a
  where a.user_id = auth.uid()
  limit 1
$$;

create policy "providers select own"
on public.providers for select
to authenticated
using (user_id = auth.uid());

create policy "providers insert own"
on public.providers for insert
to authenticated
with check (user_id = auth.uid());

create policy "providers update own"
on public.providers for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "agents select own"
on public.agents for select
to authenticated
using (user_id = auth.uid());

create policy "agents update own phone"
on public.agents for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "provider gallery manage own"
on public.provider_gallery for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

create policy "shifts manage own"
on public.shifts for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

create policy "workers manage own"
on public.workers for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

create policy "worker schedule manage own"
on public.worker_schedule for all
to authenticated
using (
  exists (
    select 1 from public.workers w
    where w.id = worker_schedule.worker_id
    and w.provider_id = public.current_provider_id()
  )
)
with check (
  exists (
    select 1 from public.workers w
    where w.id = worker_schedule.worker_id
    and w.provider_id = public.current_provider_id()
  )
);

create policy "shift rotations manage own"
on public.shift_rotations for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

create policy "shift rotation members manage own"
on public.shift_rotation_members for all
to authenticated
using (
  exists (
    select 1 from public.shift_rotations sr
    where sr.id = shift_rotation_members.rotation_id
    and sr.provider_id = public.current_provider_id()
  )
)
with check (
  exists (
    select 1 from public.shift_rotations sr
    where sr.id = shift_rotation_members.rotation_id
    and sr.provider_id = public.current_provider_id()
  )
);

create policy "schedule overrides manage own"
on public.schedule_overrides for all
to authenticated
using (
  exists (
    select 1 from public.workers w
    where w.id = schedule_overrides.worker_id
    and w.provider_id = public.current_provider_id()
  )
)
with check (
  exists (
    select 1 from public.workers w
    where w.id = schedule_overrides.worker_id
    and w.provider_id = public.current_provider_id()
  )
);

create policy "time off manage own"
on public.time_off for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

create policy "services manage own"
on public.services for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

create policy "worker services manage own"
on public.worker_services for all
to authenticated
using (
  exists (
    select 1
    from public.workers w
    join public.services s on s.id = worker_services.service_id
    where w.id = worker_services.worker_id
    and w.provider_id = public.current_provider_id()
    and s.provider_id = public.current_provider_id()
  )
)
with check (
  exists (
    select 1
    from public.workers w
    join public.services s on s.id = worker_services.service_id
    where w.id = worker_services.worker_id
    and w.provider_id = public.current_provider_id()
    and s.provider_id = public.current_provider_id()
  )
);

create policy "bookings manage own"
on public.bookings for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

create policy "invoices select own provider"
on public.invoices for select
to authenticated
using (provider_id = public.current_provider_id());

create policy "agent commissions select related"
on public.agent_commissions for select
to authenticated
using (
  agent_id = public.current_agent_id()
  or provider_id = public.current_provider_id()
);

create policy "payments select own provider"
on public.payments for select
to authenticated
using (provider_id = public.current_provider_id());

create or replace function public.get_public_provider(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  intro_text text,
  address text,
  city text,
  phone text,
  logo_url text,
  cover_url text,
  primary_color text,
  text_color text,
  font_choice text,
  google_review_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  custom_domain text,
  booking_min_notice_hours int,
  booking_max_days_ahead int,
  cancel_min_hours int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.name, p.slug, p.description, p.intro_text, p.address, p.city, p.phone,
    p.logo_url, p.cover_url, p.primary_color, p.text_color, p.font_choice,
    p.google_review_url, p.instagram_url, p.facebook_url, p.tiktok_url,
    p.custom_domain, p.booking_min_notice_hours, p.booking_max_days_ahead,
    p.cancel_min_hours
  from public.providers p
  where p.slug = p_slug
  and p.plan_status in ('trial', 'active', 'past_due')
  limit 1
$$;

create or replace function public.get_public_provider_gallery(p_provider_id uuid)
returns table (
  id uuid,
  image_url text,
  sort_order int
)
language sql
stable
security definer
set search_path = public
as $$
  select pg.id, pg.image_url, pg.sort_order
  from public.provider_gallery pg
  join public.providers p on p.id = pg.provider_id
  where pg.provider_id = p_provider_id
  and p.plan_status in ('trial', 'active', 'past_due')
  order by pg.sort_order, pg.created_at
$$;

create or replace function public.get_public_services(p_provider_id uuid)
returns table (
  id uuid,
  name text,
  duration_minutes int,
  price int,
  sort_order int
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.duration_minutes, s.price, s.sort_order
  from public.services s
  join public.providers p on p.id = s.provider_id
  where s.provider_id = p_provider_id
  and s.is_active = true
  and p.plan_status in ('trial', 'active', 'past_due')
  order by s.sort_order, s.name
$$;

create or replace function public.get_public_workers(p_provider_id uuid)
returns table (
  id uuid,
  name text,
  photo_url text,
  bio text
)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.name, w.photo_url, w.bio
  from public.workers w
  join public.providers p on p.id = w.provider_id
  where w.provider_id = p_provider_id
  and w.is_active = true
  and p.plan_status in ('trial', 'active', 'past_due')
  order by w.created_at, w.name
$$;

create or replace function public.create_public_booking(
  p_provider_id uuid,
  p_worker_id uuid,
  p_service_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_starts_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  service_duration int;
  booking_id uuid;
begin
  select s.duration_minutes
  into service_duration
  from public.services s
  join public.workers w on w.provider_id = s.provider_id
  join public.worker_services ws on ws.worker_id = w.id and ws.service_id = s.id
  join public.providers p on p.id = s.provider_id
  where s.id = p_service_id
  and s.provider_id = p_provider_id
  and s.is_active = true
  and w.id = p_worker_id
  and w.is_active = true
  and p.plan_status in ('trial', 'active', 'past_due')
  and p_starts_at >= now() + make_interval(hours => p.booking_min_notice_hours)
  and p_starts_at < now() + make_interval(days => p.booking_max_days_ahead)
  limit 1;

  if service_duration is null then
    raise exception 'Invalid booking request';
  end if;

  insert into public.bookings (
    provider_id,
    worker_id,
    service_id,
    client_name,
    client_phone,
    client_email,
    starts_at,
    ends_at,
    status,
    notes
  )
  values (
    p_provider_id,
    p_worker_id,
    p_service_id,
    nullif(trim(p_client_name), ''),
    nullif(trim(p_client_phone), ''),
    nullif(trim(p_client_email), ''),
    p_starts_at,
    p_starts_at + make_interval(mins => service_duration),
    'pending',
    p_notes
  )
  returning id into booking_id;

  return booking_id;
end;
$$;

create or replace function public.claim_invoice_payment(
  p_payment_claim_token uuid,
  p_payment_proof_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invoices
  set
    payment_claimed_at = now(),
    payment_proof_url = coalesce(p_payment_proof_url, payment_proof_url)
  where payment_claim_token = p_payment_claim_token
  and status in ('issued', 'overdue');

  return found;
end;
$$;

grant execute on function public.get_public_provider(text) to anon, authenticated;
grant execute on function public.get_public_provider_gallery(uuid) to anon, authenticated;
grant execute on function public.get_public_services(uuid) to anon, authenticated;
grant execute on function public.get_public_workers(uuid) to anon, authenticated;
grant execute on function public.create_public_booking(uuid, uuid, uuid, text, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.claim_invoice_payment(uuid, text) to anon, authenticated;
