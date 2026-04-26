create or replace function public.get_referral_agent(p_ref_code text)
returns table (
  id uuid,
  ref_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.ref_code
  from public.agents a
  where a.ref_code = upper(trim(p_ref_code))
  and a.is_active = true
  limit 1
$$;

grant execute on function public.get_referral_agent(text) to anon, authenticated;
