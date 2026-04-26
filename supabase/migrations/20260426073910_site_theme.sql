alter table public.providers
add column if not exists site_theme text not null default 'default'
check (site_theme in ('default', 'light', 'dark'));

create or replace function public.get_public_provider(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  intro_text text,
  address text,
  city text,
  phone text,
  logo_url text,
  cover_url text,
  primary_color text,
  text_color text,
  font_choice text,
  site_theme text,
  google_review_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  custom_domain text,
  booking_min_notice_hours int,
  booking_max_days_ahead int,
  cancel_min_hours int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.name, p.slug, p.description, p.intro_text, p.address, p.city, p.phone,
    p.logo_url, p.cover_url, p.primary_color, p.text_color, p.font_choice,
    p.site_theme, p.google_review_url, p.instagram_url, p.facebook_url,
    p.tiktok_url, p.custom_domain, p.booking_min_notice_hours,
    p.booking_max_days_ahead, p.cancel_min_hours
  from public.providers p
  where p.slug = p_slug
  and p.plan_status in ('trial', 'active', 'past_due')
  limit 1
$$;

grant execute on function public.get_public_provider(text) to anon, authenticated;
