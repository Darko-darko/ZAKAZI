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
  slot_row record;
  booking_id uuid;
begin
  select s.worker_id, s.starts_at, s.ends_at
  into slot_row
  from public.get_public_slots(
    p_provider_id,
    p_service_id,
    (p_starts_at at time zone 'Europe/Belgrade')::date,
    p_worker_id
  ) s
  where s.worker_id = p_worker_id
  and s.starts_at = p_starts_at
  limit 1;

  if slot_row.worker_id is null then
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
    slot_row.starts_at,
    slot_row.ends_at,
    'confirmed',
    p_notes
  )
  returning id into booking_id;

  return booking_id;
end;
$$;

update public.bookings
set status = 'confirmed'
where status = 'pending'
and starts_at >= now();

grant execute on function public.create_public_booking(uuid, uuid, uuid, text, text, text, timestamptz, text) to anon, authenticated;
