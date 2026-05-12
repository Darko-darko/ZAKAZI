export type PlanId = "free" | "basic" | "pro" | "standard";

export type PlanDetails = {
  id: PlanId;
  label: string;
  monthlyPriceRsd: number;
  features: {
    customDomain: boolean;
    whiteLabel: boolean;
    maxWorkers: number | null;
    prioritySupport: boolean;
  };
};

export const plans: Record<PlanId, PlanDetails> = {
  free: {
    id: "free",
    label: "Trial",
    monthlyPriceRsd: 0,
    features: {
      customDomain: false,
      whiteLabel: false,
      maxWorkers: 1,
      prioritySupport: false,
    },
  },
  basic: {
    id: "basic",
    label: "Standard",
    monthlyPriceRsd: 2990,
    features: {
      customDomain: false,
      whiteLabel: false,
      maxWorkers: null,
      prioritySupport: false,
    },
  },
  pro: {
    id: "pro",
    label: "Standard",
    monthlyPriceRsd: 2990,
    features: {
      customDomain: false,
      whiteLabel: false,
      maxWorkers: null,
      prioritySupport: false,
    },
  },
  standard: {
    id: "standard",
    label: "Standard",
    monthlyPriceRsd: 2990,
    features: {
      customDomain: false,
      whiteLabel: false,
      maxWorkers: null,
      prioritySupport: false,
    },
  },
};

export function getPlan(planId: string): PlanDetails {
  if (
    planId === "basic" ||
    planId === "pro" ||
    planId === "free" ||
    planId === "standard"
  ) {
    return plans[planId];
  }
  return plans.free;
}
