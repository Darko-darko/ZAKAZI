export type PlanId = "free" | "basic" | "pro";

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
    label: "Free",
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
    label: "Basic",
    monthlyPriceRsd: 2900,
    features: {
      customDomain: false,
      whiteLabel: false,
      maxWorkers: 3,
      prioritySupport: false,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    monthlyPriceRsd: 4900,
    features: {
      customDomain: true,
      whiteLabel: true,
      maxWorkers: null,
      prioritySupport: true,
    },
  },
};

export function getPlan(planId: string): PlanDetails {
  if (planId === "basic" || planId === "pro" || planId === "free") {
    return plans[planId];
  }
  return plans.free;
}
