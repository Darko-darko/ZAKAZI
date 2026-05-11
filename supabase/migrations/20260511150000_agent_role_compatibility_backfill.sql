update public.agents
set role = 'agent'
where role is null;

create or replace function public.current_agent_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(a.role, 'agent')
  from public.agents a
  where a.user_id = auth.uid()
  and a.is_active = true
  and a.archived_at is null
  limit 1
$$;

create or replace function public.current_top_level_agent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when coalesce(a.role, 'agent') = 'commercialist' then a.parent_agent_id
      else a.id
    end
  from public.agents a
  where a.user_id = auth.uid()
  and a.is_active = true
  and a.archived_at is null
  limit 1
$$;

create or replace function public.get_referral_agent(p_ref_code text)
returns table (
  id uuid,
  ref_code text,
  role text,
  parent_agent_id uuid,
  top_level_agent_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.ref_code,
    coalesce(a.role, 'agent') as role,
    a.parent_agent_id,
    case
      when coalesce(a.role, 'agent') = 'commercialist' then a.parent_agent_id
      else a.id
    end as top_level_agent_id
  from public.agents a
  where a.ref_code = upper(trim(p_ref_code))
  and a.is_active = true
  and a.archived_at is null
  limit 1
$$;
