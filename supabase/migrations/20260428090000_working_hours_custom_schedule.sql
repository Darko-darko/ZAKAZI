create table if not exists public.provider_working_hours (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  unique (provider_id, day_of_week),
  check (
    (is_closed = true and opens_at is null and closes_at is null)
    or (is_closed = false and opens_at is not null and closes_at is not null and opens_at < closes_at)
  )
);

alter table public.worker_schedule
  add column if not exists custom_start_time time,
  add column if not exists custom_end_time time,
  add column if not exists custom_break_start time,
  add column if not exists custom_break_end time;

alter table public.schedule_overrides
  add column if not exists custom_start_time time,
  add column if not exists custom_end_time time,
  add column if not exists custom_break_start time,
  add column if not exists custom_break_end time;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'worker_schedule_shift_or_custom_time_check'
  ) then
    alter table public.worker_schedule
      add constraint worker_schedule_shift_or_custom_time_check
      check (
        (
          shift_id is not null
          and custom_start_time is null
          and custom_end_time is null
          and custom_break_start is null
          and custom_break_end is null
        )
        or (
          shift_id is null
          and custom_start_time is not null
          and custom_end_time is not null
          and custom_start_time < custom_end_time
          and (
            (custom_break_start is null and custom_break_end is null)
            or (
              custom_break_start is not null
              and custom_break_end is not null
              and custom_break_start < custom_break_end
            )
          )
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'schedule_overrides_shift_or_custom_time_check'
  ) then
    alter table public.schedule_overrides
      add constraint schedule_overrides_shift_or_custom_time_check
      check (
        (
          shift_id is not null
          and custom_start_time is null
          and custom_end_time is null
          and custom_break_start is null
          and custom_break_end is null
        )
        or (
          shift_id is null
          and custom_start_time is null
          and custom_end_time is null
          and custom_break_start is null
          and custom_break_end is null
        )
        or (
          shift_id is null
          and custom_start_time is not null
          and custom_end_time is not null
          and custom_start_time < custom_end_time
          and (
            (custom_break_start is null and custom_break_end is null)
            or (
              custom_break_start is not null
              and custom_break_end is not null
              and custom_break_start < custom_break_end
            )
          )
        )
      );
  end if;
end $$;

insert into public.provider_working_hours (
  provider_id,
  day_of_week,
  opens_at,
  closes_at,
  is_closed
)
select
  p.id,
  d.day_of_week,
  min(s.start_time),
  max(s.end_time),
  false
from public.providers p
cross join generate_series(0, 6) as d(day_of_week)
join public.workers w on w.provider_id = p.id
join public.worker_schedule ws
  on ws.worker_id = w.id
  and ws.day_of_week = d.day_of_week
join public.shifts s on s.id = ws.shift_id
where ws.shift_id is not null
group by p.id, d.day_of_week
on conflict (provider_id, day_of_week) do nothing;

insert into public.provider_working_hours (
  provider_id,
  day_of_week,
  opens_at,
  closes_at,
  is_closed
)
select
  p.id,
  d.day_of_week,
  case when d.day_of_week between 1 and 5 then '09:00'::time else null end,
  case when d.day_of_week between 1 and 5 then '17:00'::time else null end,
  d.day_of_week not between 1 and 5
from public.providers p
cross join generate_series(0, 6) as d(day_of_week)
on conflict (provider_id, day_of_week) do nothing;

create index if not exists provider_working_hours_provider_day_idx
on public.provider_working_hours(provider_id, day_of_week);

alter table public.provider_working_hours enable row level security;

grant select, insert, update, delete on public.provider_working_hours to authenticated;

drop policy if exists "provider working hours manage own" on public.provider_working_hours;
create policy "provider working hours manage own"
on public.provider_working_hours for all
to authenticated
using (provider_id = public.current_provider_id())
with check (provider_id = public.current_provider_id());

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
  provider_hours record;
  override_row record;
  schedule_row record;
  selected_shift record;
  selected_shift_id uuid;
  rotation_row record;
  rotation_member_exists boolean;
  rotation_found boolean;
  override_found boolean;
  schedule_found boolean;
  week_number int;
  slot_start timestamptz;
  slot_end timestamptz;
  busy_row record;
  free_start timestamptz;
  segment_end timestamptz;
  work_start timestamptz;
  work_end timestamptz;
  raw_work_start time;
  raw_work_end time;
  raw_break_start time;
  raw_break_end time;
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

  select pwh.opens_at, pwh.closes_at, pwh.is_closed
  into provider_hours
  from public.provider_working_hours pwh
  where pwh.provider_id = p_provider_id
  and pwh.day_of_week = v_day_of_week
  limit 1;

  if coalesce(provider_hours.is_closed, false) = true then
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
    raw_work_start := null;
    raw_work_end := null;
    raw_break_start := null;
    raw_break_end := null;
    rotation_member_exists := false;

    select so.id, so.shift_id, so.custom_start_time, so.custom_end_time, so.custom_break_start, so.custom_break_end
    into override_row
    from public.schedule_overrides so
    where so.worker_id = worker_row.id
    and so.date = p_date
    limit 1;
    override_found := found;

    if override_found then
      if override_row.shift_id is null
        and override_row.custom_start_time is null
        and override_row.custom_end_time is null then
        continue;
      end if;

      if override_row.custom_start_time is not null then
        raw_work_start := override_row.custom_start_time;
        raw_work_end := override_row.custom_end_time;
        raw_break_start := override_row.custom_break_start;
        raw_break_end := override_row.custom_break_end;
      else
        select s.*
        into selected_shift
        from public.shifts s
        where s.id = override_row.shift_id
        and s.provider_id = p_provider_id
        limit 1;
        if found then
          selected_shift_id := selected_shift.id;
        end if;
      end if;
    else
      select sr.id, sr.rotation_start_date
      into rotation_row
      from public.shift_rotations sr
      where sr.provider_id = p_provider_id
      and sr.rotation_start_date <= p_date
      order by sr.rotation_start_date desc
      limit 1;
      rotation_found := found;

      if rotation_found then
        week_number := floor((p_date - rotation_row.rotation_start_date) / 7)::int + 1;

        select exists (
          select 1
          from public.shift_rotation_members srm
          where srm.rotation_id = rotation_row.id
          and srm.worker_id = worker_row.id
          and srm.day_of_week = v_day_of_week
        )
        into rotation_member_exists;

        select s.*
        into selected_shift
        from public.shift_rotation_members srm
        join public.shifts s on s.id = case
          when week_number % 2 = 1 then srm.week_odd_shift_id
          else srm.week_even_shift_id
        end
        where srm.rotation_id = rotation_row.id
        and srm.worker_id = worker_row.id
        and srm.day_of_week = v_day_of_week
        and s.provider_id = p_provider_id
        limit 1;
        if found then
          selected_shift_id := selected_shift.id;
        end if;
      end if;

      if rotation_member_exists and selected_shift_id is null then
        continue;
      end if;

      if not rotation_member_exists and selected_shift_id is null then
        select ws.id, ws.shift_id, ws.custom_start_time, ws.custom_end_time, ws.custom_break_start, ws.custom_break_end
        into schedule_row
        from public.worker_schedule ws
        where ws.worker_id = worker_row.id
        and ws.day_of_week = v_day_of_week
        limit 1;
        schedule_found := found;

        if schedule_found and schedule_row.shift_id is not null then
          select s.*
          into selected_shift
          from public.shifts s
          where s.id = schedule_row.shift_id
          and s.provider_id = p_provider_id
          limit 1;
          if found then
            selected_shift_id := selected_shift.id;
          end if;
        elsif schedule_found and schedule_row.custom_start_time is not null then
          raw_work_start := schedule_row.custom_start_time;
          raw_work_end := schedule_row.custom_end_time;
          raw_break_start := schedule_row.custom_break_start;
          raw_break_end := schedule_row.custom_break_end;
        end if;
      end if;
    end if;

    if selected_shift_id is not null then
      raw_work_start := selected_shift.start_time;
      raw_work_end := selected_shift.end_time;
      raw_break_start := selected_shift.break_start;
      raw_break_end := selected_shift.break_end;
    end if;

    if raw_work_start is null or raw_work_end is null then
      continue;
    end if;

    raw_work_start := greatest(raw_work_start, coalesce(provider_hours.opens_at, raw_work_start));
    raw_work_end := least(raw_work_end, coalesce(provider_hours.closes_at, raw_work_end));

    if raw_work_start >= raw_work_end then
      continue;
    end if;

    work_start := (p_date + raw_work_start) at time zone timezone_name;
    work_end := (p_date + raw_work_end) at time zone timezone_name;
    free_start := work_start;

    for busy_row in
      select
        greatest(busy.starts_at, work_start) as starts_at,
        least(busy.ends_at, work_end) as ends_at
      from (
        select
          (p_date + raw_break_start) at time zone timezone_name as starts_at,
          (p_date + raw_break_end) at time zone timezone_name as ends_at
        where raw_break_start is not null
        and raw_break_end is not null

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

    selected_shift_id := null;
  end loop;
end;
$$;

grant execute on function public.get_public_slots(uuid, uuid, date, uuid) to anon, authenticated;
