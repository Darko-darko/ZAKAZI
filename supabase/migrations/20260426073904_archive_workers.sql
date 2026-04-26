alter table public.workers
  add column if not exists archived_at timestamptz;

create index if not exists workers_provider_archived_idx
on public.workers(provider_id, archived_at);

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
  and w.archived_at is null
  and p.plan_status in ('trial', 'active', 'past_due')
  order by w.created_at, w.name
$$;

grant execute on function public.get_public_workers(uuid) to anon, authenticated;
