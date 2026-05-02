-- Dopuna podataka za fakturisanje (kupac fakture - salon)
alter table public.providers
  add column if not exists company_city text,
  add column if not exists company_zip text,
  add column if not exists is_vat_payer boolean not null default false;

-- Podaci platforme (izdavalac fakture - vlasnik zakazi.pro)
create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  company_legal_name text,
  company_pib text,
  company_mb text,
  company_address text,
  company_city text,
  company_zip text,
  bank_name text,
  account_number text,
  iban text,
  is_vat_payer boolean not null default false,
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0 and vat_rate <= 100),
  contact_email text,
  contact_phone text,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
