drop function if exists public.claim_invoice_payment(uuid, text);

create or replace function public.claim_invoice_payment(
  p_payment_claim_token uuid,
  p_payment_method text default 'virman',
  p_payment_proof_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_method text := lower(coalesce(nullif(trim(p_payment_method), ''), 'virman'));
begin
  if normalized_method not in ('virman', 'cash') then
    raise exception 'Unsupported payment method: %', normalized_method;
  end if;

  update public.invoices
  set
    payment_claimed_at = now(),
    payment_method = normalized_method,
    payment_proof_url = coalesce(p_payment_proof_url, payment_proof_url)
  where payment_claim_token = p_payment_claim_token
    and status in ('issued', 'overdue');

  return found;
end;
$$;

grant execute on function public.claim_invoice_payment(uuid, text, text) to anon, authenticated;
