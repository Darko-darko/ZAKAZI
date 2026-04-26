create policy "providers select for agent"
on public.providers for select
to authenticated
using (agent_id = public.current_agent_id());
