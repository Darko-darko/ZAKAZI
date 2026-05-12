export const BOOKABLE_PROVIDER_STATUSES = ["trial", "active", "past_due"] as const;

export type SiteFontChoice = "sans" | "serif";

export function normalizeSiteFontChoice(
  fontChoice: string | null | undefined,
): SiteFontChoice {
  if (fontChoice === "serif" || fontChoice === "elegant") {
    return "serif";
  }

  return "sans";
}

export function getSiteFontClass(fontChoice: string | null | undefined) {
  return normalizeSiteFontChoice(fontChoice) === "serif"
    ? "font-serif"
    : "font-sans";
}

export function isProviderBookableStatus(
  planStatus: string | null | undefined,
): boolean {
  return BOOKABLE_PROVIDER_STATUSES.includes(
    (planStatus ?? "") as (typeof BOOKABLE_PROVIDER_STATUSES)[number],
  );
}

export function getProviderStatusLabel(planStatus: string | null | undefined) {
  if (planStatus === "suspended") {
    return "suspendovan";
  }

  if (planStatus === "cancelled") {
    return "otkazan";
  }

  return "nedostupan";
}
