drop function if exists public.get_public_services(uuid);

create function public.get_public_services(
  p_provider_id uuid,
  p_worker_id uuid default null
)
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
  and (
    p_worker_id is null
    or exists (
      select 1
      from public.worker_services ws
      join public.workers w on w.id = ws.worker_id
      where ws.service_id = s.id
      and ws.worker_id = p_worker_id
      and w.is_active = true
      and w.archived_at is null
    )
  )
  order by s.sort_order, s.name
$$;

grant execute on function public.get_public_services(uuid, uuid) to anon, authenticated;
