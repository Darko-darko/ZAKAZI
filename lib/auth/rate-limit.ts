import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

type AuthRateLimitAction =
  | "register"
  | "login"
  | "forgot_password"
  | "resend_confirmation";

type RateLimitRule = {
  maxAttempts: number;
  windowMinutes: number;
};

type RateLimitConfig = {
  email?: RateLimitRule;
  ip?: RateLimitRule;
  message: string;
};

const RATE_LIMIT_CONFIG: Record<AuthRateLimitAction, RateLimitConfig> = {
  register: {
    email: { maxAttempts: 3, windowMinutes: 30 },
    ip: { maxAttempts: 5, windowMinutes: 15 },
    message:
      "Previse pokusaja registracije. Sacekaj malo pa probaj ponovo.",
  },
  login: {
    email: { maxAttempts: 8, windowMinutes: 10 },
    ip: { maxAttempts: 12, windowMinutes: 10 },
    message: "Previse pokusaja prijave. Sacekaj malo pa probaj ponovo.",
  },
  forgot_password: {
    email: { maxAttempts: 2, windowMinutes: 30 },
    ip: { maxAttempts: 4, windowMinutes: 15 },
    message:
      "Previse zahteva za reset lozinke. Sacekaj malo pa probaj ponovo.",
  },
  resend_confirmation: {
    email: { maxAttempts: 2, windowMinutes: 30 },
    ip: { maxAttempts: 4, windowMinutes: 15 },
    message:
      "Previse zahteva za novu potvrdu emaila. Sacekaj malo pa probaj ponovo.",
  },
};

function normalizeEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

async function getRequestIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp =
    headerStore.get("x-real-ip") ?? headerStore.get("cf-connecting-ip");

  return realIp?.trim() || undefined;
}

function getWindowStartIso(windowMinutes: number) {
  return new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
}

async function countRecentAttempts({
  action,
  field,
  value,
  windowMinutes,
}: {
  action: AuthRateLimitAction;
  field: "email" | "ip_address";
  value: string;
  windowMinutes: number;
}) {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("auth_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
    .eq(field, value)
    .gte("created_at", getWindowStartIso(windowMinutes));

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function recordAttempt({
  action,
  email,
  ipAddress,
}: {
  action: AuthRateLimitAction;
  email?: string;
  ipAddress?: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("auth_rate_limit_events").insert({
    action,
    email: email ?? null,
    ip_address: ipAddress ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function enforceAuthRateLimit({
  action,
  email,
}: {
  action: AuthRateLimitAction;
  email?: string;
}) {
  const config = RATE_LIMIT_CONFIG[action];
  const normalizedEmail = normalizeEmail(email);
  const ipAddress = await getRequestIp();

  try {
    if (config.email && normalizedEmail) {
      const emailAttempts = await countRecentAttempts({
        action,
        field: "email",
        value: normalizedEmail,
        windowMinutes: config.email.windowMinutes,
      });

      if (emailAttempts >= config.email.maxAttempts) {
        return { allowed: false, message: config.message };
      }
    }

    if (config.ip && ipAddress) {
      const ipAttempts = await countRecentAttempts({
        action,
        field: "ip_address",
        value: ipAddress,
        windowMinutes: config.ip.windowMinutes,
      });

      if (ipAttempts >= config.ip.maxAttempts) {
        return { allowed: false, message: config.message };
      }
    }

    await recordAttempt({ action, email: normalizedEmail, ipAddress });

    return { allowed: true as const };
  } catch (error) {
    console.error("Auth rate limit check failed:", error);
    return { allowed: true as const };
  }
}
