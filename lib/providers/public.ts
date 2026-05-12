import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_PROVIDER_SELECT = `
  id,
  name,
  slug,
  description,
  intro_text,
  address,
  city,
  phone,
  logo_url,
  cover_url,
  cover_focal_x,
  cover_focal_y,
  primary_color,
  text_color,
  font_choice,
  site_theme,
  custom_domain,
  booking_min_notice_hours,
  booking_max_days_ahead,
  cancel_min_hours,
  plan_status
`;

export async function getPublicProviderBySlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("providers")
    .select(PUBLIC_PROVIDER_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  return data;
}
