alter table public.agents
  add column if not exists role text not null default 'agent'
    check (role in ('agent', 'commercialist')),
  add column if not exists parent_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists archived_at timestamptz;

alter table public.agents
  add constraint agents_not_own_parent_check
  check (parent_agent_id is null or parent_agent_id <> id);

update public.agents
set role = 'agent'
where role is distinct from 'commercialist';

alter table public.providers
  add column if not exists referrer_agent_id uuid references public.agents(id) on delete set null;

update public.providers
set referrer_agent_id = agent_id
where referrer_agent_id is null
and agent_id is not null;

create index if not exists agents_parent_agent_id_idx
on public.agents(parent_agent_id);

create index if not exists providers_referrer_agent_id_idx
on public.providers(referrer_agent_id);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'agent_commissions_invoice_id_key'
  ) then
    alter table public.agent_commissions
      drop constraint agent_commissions_invoice_id_key;
  end if;
end $$;

create index if not exists agent_commissions_invoice_id_idx
on public.agent_commissions(invoice_id);

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
  and a.is_active = true
  and a.archived_at is null
  limit 1
$$;

create or replace function public.current_agent_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.role
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
      when a.role = 'commercialist' then a.parent_agent_id
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
    a.role,
    a.parent_agent_id,
    case
      when a.role = 'commercialist' then a.parent_agent_id
      else a.id
    end as top_level_agent_id
  from public.agents a
  where a.ref_code = upper(trim(p_ref_code))
  and a.is_active = true
  and a.archived_at is null
  limit 1
$$;

drop policy if exists "agents select own" on public.agents;
create policy "agents select own and network"
on public.agents for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.current_agent_role() = 'agent'
    and parent_agent_id = public.current_agent_id()
  )
);

drop policy if exists "providers select for agent" on public.providers;
create policy "providers select for agent network"
on public.providers for select
to authenticated
using (
  agent_id = public.current_top_level_agent_id()
);

create policy "providers select for commercialist"
on public.providers for select
to authenticated
using (
  referrer_agent_id = public.current_agent_id()
);

grant execute on function public.current_agent_role() to authenticated;
grant execute on function public.current_top_level_agent_id() to authenticated;
grant execute on function public.get_referral_agent(text) to anon, authenticated;
