update public.workers
set buffer_minutes = 0
where buffer_minutes <> 0;

create or replace function public.get_public_slots(
  p_provider_id uuid,
  p_service_id uuid,
  p_date date,
  p_worker_id uuid default null
)
returns table (
  worker_id uuid,
  worker_name text,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  provider_row record;
  service_row record;
  worker_row record;
  override_exists boolean;
  selected_shift_id uuid;
  selected_shift record;
  rotation_row record;
  rotation_member_exists boolean;
  week_number int;
  slot_start timestamptz;
  slot_end timestamptz;
  busy_row record;
  free_start timestamptz;
  segment_end timestamptz;
  work_start timestamptz;
  work_end timestamptz;
  v_day_of_week int := extract(dow from p_date)::int;
  timezone_name text := 'Europe/Belgrade';
begin
  select p.id, p.booking_min_notice_hours, p.booking_max_days_ahead
  into provider_row
  from public.providers p
  where p.id = p_provider_id
  and p.plan_status in ('trial', 'active', 'past_due')
  limit 1;

  if provider_row.id is null then
    return;
  end if;

  if exists (
    select 1
    from public.time_off t
    where t.provider_id = p_provider_id
    and t.worker_id is null
    and p_date between t.date_from and t.date_to
  ) then
    return;
  end if;

  select s.id, s.duration_minutes
  into service_row
  from public.services s
  where s.id = p_service_id
  and s.provider_id = p_provider_id
  and s.is_active = true
  limit 1;

  if service_row.id is null then
    return;
  end if;

  for worker_row in
    select w.id, w.name
    from public.workers w
    where w.provider_id = p_provider_id
    and w.is_active = true
    and w.archived_at is null
    and (p_worker_id is null or w.id = p_worker_id)
    and exists (
      select 1
      from public.worker_services ws
      where ws.worker_id = w.id
      and ws.service_id = p_service_id
    )
    and not exists (
      select 1
      from public.time_off t
      where t.provider_id = p_provider_id
      and t.worker_id = w.id
      and p_date between t.date_from and t.date_to
    )
    order by w.created_at, w.name
  loop
    selected_shift_id := null;
    rotation_member_exists := false;

    select exists (
      select 1
      from public.schedule_overrides so
      where so.worker_id = worker_row.id
      and so.date = p_date
    )
    into override_exists;

    if override_exists then
      select so.shift_id
      into selected_shift_id
      from public.schedule_overrides so
      where so.worker_id = worker_row.id
      and so.date = p_date
      limit 1;
    else
      select sr.id, sr.rotation_start_date
      into rotation_row
      from public.shift_rotations sr
      where sr.provider_id = p_provider_id
      and sr.rotation_start_date <= p_date
      order by sr.rotation_start_date desc
      limit 1;

      if rotation_row.id is not null then
        week_number := floor((p_date - rotation_row.rotation_start_date) / 7)::int + 1;

        select exists (
          select 1
          from public.shift_rotation_members srm
          where srm.rotation_id = rotation_row.id
          and srm.worker_id = worker_row.id
          and srm.day_of_week = v_day_of_week
        )
        into rotation_member_exists;

        select
          case
            when week_number % 2 = 1 then srm.week_odd_shift_id
            else srm.week_even_shift_id
          end
        into selected_shift_id
        from public.shift_rotation_members srm
        where srm.rotation_id = rotation_row.id
        and srm.worker_id = worker_row.id
        and srm.day_of_week = v_day_of_week
        limit 1;
      end if;

      if rotation_member_exists and selected_shift_id is null then
        continue;
      end if;

      if not rotation_member_exists and selected_shift_id is null then
        select ws.shift_id
        into selected_shift_id
        from public.worker_schedule ws
        where ws.worker_id = worker_row.id
        and ws.day_of_week = v_day_of_week
        limit 1;
      end if;
    end if;

    if selected_shift_id is null then
      continue;
    end if;

    select s.*
    into selected_shift
    from public.shifts s
    where s.id = selected_shift_id
    and s.provider_id = p_provider_id
    limit 1;

    if selected_shift.id is null then
      continue;
    end if;

    work_start := (p_date + selected_shift.start_time) at time zone timezone_name;
    work_end := (p_date + selected_shift.end_time) at time zone timezone_name;
    free_start := work_start;

    for busy_row in
      select
        greatest(busy.starts_at, work_start) as starts_at,
        least(busy.ends_at, work_end) as ends_at
      from (
        select
          (p_date + selected_shift.break_start) at time zone timezone_name as starts_at,
          (p_date + selected_shift.break_end) at time zone timezone_name as ends_at
        where selected_shift.break_start is not null
        and selected_shift.break_end is not null

        union all

        select
          b.starts_at as starts_at,
          b.ends_at as ends_at
        from public.bookings b
        where b.worker_id = worker_row.id
        and b.status in ('pending', 'confirmed')
        and b.ends_at > work_start
        and b.starts_at < work_end
      ) busy
      where busy.ends_at > work_start
      and busy.starts_at < work_end
      order by busy.starts_at, busy.ends_at
    loop
      if busy_row.ends_at <= free_start then
        continue;
      end if;

      if busy_row.starts_at > free_start then
        segment_end := busy_row.starts_at;

        for slot_start in
          select generated_slot
          from generate_series(
            free_start,
            segment_end - make_interval(mins => service_row.duration_minutes),
            make_interval(mins => service_row.duration_minutes)
          ) generated_slot
        loop
          slot_end := slot_start + make_interval(mins => service_row.duration_minutes);

          if slot_start < now() + make_interval(hours => provider_row.booking_min_notice_hours) then
            continue;
          end if;

          if slot_start >= now() + make_interval(days => provider_row.booking_max_days_ahead) then
            continue;
          end if;

          worker_id := worker_row.id;
          worker_name := worker_row.name;
          starts_at := slot_start;
          ends_at := slot_end;
          return next;
        end loop;
      end if;

      if busy_row.ends_at > free_start then
        free_start := busy_row.ends_at;
      end if;

      if free_start >= work_end then
        exit;
      end if;
    end loop;

    if free_start < work_end then
      for slot_start in
        select generated_slot
        from generate_series(
          free_start,
          work_end - make_interval(mins => service_row.duration_minutes),
          make_interval(mins => service_row.duration_minutes)
        ) generated_slot
      loop
        slot_end := slot_start + make_interval(mins => service_row.duration_minutes);

        if slot_start < now() + make_interval(hours => provider_row.booking_min_notice_hours) then
          continue;
        end if;

        if slot_start >= now() + make_interval(days => provider_row.booking_max_days_ahead) then
          continue;
        end if;

        worker_id := worker_row.id;
        worker_name := worker_row.name;
        starts_at := slot_start;
        ends_at := slot_end;
        return next;
      end loop;
    end if;
  end loop;
end;
$$;

grant execute on function public.get_public_slots(uuid, uuid, date, uuid) to anon, authenticated;
