"use server";

import { revalidatePath } from "next/cache";
import { normalizeAgentRole } from "@/lib/auth/roles";
import { createProviderSlug } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AgentRegisterState = {
  status: "idle" | "error" | "success";
  message: string;
  fields?: Record<string, string>;
  generatedPassword?: string;
  providerSlug?: string;
  providerName?: string;
};

const emptyState: AgentRegisterState = { status: "idle", message: "" };

export type CreateCommercialistState = {
  status: "idle" | "error" | "success";
  message: string;
  fields?: Record<string, string>;
  commercialistName?: string;
  commercialistEmail?: string;
  commercialistRefCode?: string;
  generatedPassword?: string;
};

const emptyCommercialistState: CreateCommercialistState = {
  status: "idle",
  message: "",
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  let raw = "";
  for (const byte of buffer) {
    raw += chars[byte % chars.length];
  }
  return raw.match(/.{1,4}/g)!.join("-");
}

function getSlugCandidate(baseSlug: string, attempt: number) {
  if (attempt === 0) {
    return baseSlug;
  }
  const suffix = `-${attempt + 1}`;
  return `${baseSlug.slice(0, 64 - suffix.length)}${suffix}`;
}

function isDuplicateError(message: string | undefined) {
  return message?.toLowerCase().includes("duplicate") ?? false;
}

function generateRefCodeCandidate() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buffer = new Uint8Array(6);
  crypto.getRandomValues(buffer);
  let raw = "";
  for (const byte of buffer) {
    raw += chars[byte % chars.length];
  }
  return raw;
}

function parsePercent(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }
  return parsed;
}

export async function registerProviderForClientAction(
  _state: AgentRegisterState = emptyState,
  formData: FormData,
): Promise<AgentRegisterState> {
  void _state;

  const providerName = readString(formData, "provider_name");
  const email = readString(formData, "email").toLowerCase();
  const phone = readString(formData, "phone");
  const city = readString(formData, "city");

  const fields = { provider_name: providerName, email, phone, city };

  if (!providerName || providerName.length < 2) {
    return { status: "error", message: "Unesi naziv salona.", fields };
  }

  if (!email.includes("@") || email.length < 5) {
    return {
      status: "error",
      message: "Unesi ispravan email klijenta.",
      fields,
    };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return {
      status: "error",
      message: "Sesija je istekla. Prijavi se ponovo.",
      fields,
    };
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("id, role, parent_agent_id, is_active, archived_at")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!agent || !agent.is_active || agent.archived_at) {
    return {
      status: "error",
      message: "Samo aktivni partneri mogu da koriste ovu formu.",
      fields,
    };
  }

  const topLevelAgentId =
    normalizeAgentRole(agent.role) === "commercialist"
      ? agent.parent_agent_id
      : agent.id;

  if (!topLevelAgentId) {
    return {
      status: "error",
      message: "Komercijalista nije povezan sa agentom. Obrati se podršci.",
      fields,
    };
  }

  const admin = createAdminClient();
  const password = generatePassword();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        provider_name: providerName,
        created_by_agent_id: agent.id,
      },
    });

  if (createError || !created.user) {
    const normalized = createError?.message?.toLowerCase() ?? "";
    if (
      normalized.includes("already") ||
      normalized.includes("registered") ||
      normalized.includes("exists")
    ) {
      return {
        status: "error",
        message:
          "Email je vec registrovan. Klijent ima nalog — neka koristi 'Zaboravljena lozinka'.",
        fields,
      };
    }
    return {
      status: "error",
      message: "Kreiranje naloga nije uspelo. Probaj ponovo.",
      fields,
    };
  }

  const baseSlug = createProviderSlug(providerName);
  let savedSlug: string | undefined;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = getSlugCandidate(baseSlug, attempt);
    const { error: insertError } = await admin.from("providers").insert({
      user_id: created.user.id,
      agent_id: topLevelAgentId,
      referrer_agent_id: agent.id,
      name: providerName,
      slug,
      billing_email: email,
      phone: phone || null,
      city: city || null,
    });

    if (!insertError) {
      savedSlug = slug;
      break;
    }

    lastError = insertError.message;

    if (!isDuplicateError(insertError.message)) {
      break;
    }
  }

  if (!savedSlug) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      status: "error",
      message: isDuplicateError(lastError)
        ? "URL salona je zauzet. Probaj drugi naziv."
        : "Salon nije sacuvan. Probaj ponovo.",
      fields,
    };
  }

  revalidatePath("/agent");

  return {
    status: "success",
    message:
      "Salon je registrovan. Klijent moze odmah da koristi 'Zaboravili ste lozinku?' na /login za postavljanje svoje lozinke.",
    generatedPassword: password,
    providerSlug: savedSlug,
    providerName,
  };
}

export async function createCommercialistAction(
  _state: CreateCommercialistState = emptyCommercialistState,
  formData: FormData,
): Promise<CreateCommercialistState> {
  void _state;

  const name = readString(formData, "name");
  const email = readString(formData, "email").toLowerCase();
  const phone = readString(formData, "phone");
  const percentRaw = readString(formData, "default_commission_percent");

  const fields = {
    name,
    email,
    phone,
    default_commission_percent: percentRaw,
  };

  if (!name || name.length < 2) {
    return { status: "error", message: "Unesi ime komercijaliste.", fields };
  }

  if (!email.includes("@") || email.length < 5) {
    return { status: "error", message: "Unesi ispravan email.", fields };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return {
      status: "error",
      message: "Sesija je istekla. Prijavi se ponovo.",
      fields,
    };
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("id, default_commission_percent, role, is_active, archived_at")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (
    !agent ||
    normalizeAgentRole(agent.role) !== "agent" ||
    !agent.is_active ||
    agent.archived_at
  ) {
    return {
      status: "error",
      message: "Samo aktivan agent može da kreira komercijalistu.",
      fields,
    };
  }

  const percent = parsePercent(
    percentRaw || String(agent.default_commission_percent),
  );

  if (percent === null) {
    return {
      status: "error",
      message: "Procenat mora biti broj između 0 i 100.",
      fields,
    };
  }

  if (percent > agent.default_commission_percent) {
    return {
      status: "error",
      message: "Komercijalista ne može imati veći procenat od svog agenta.",
      fields,
    };
  }

  const admin = createAdminClient();
  const password = generatePassword();
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        commercialist_name: name,
        created_by_agent_id: agent.id,
      },
    });

  if (createError || !created.user) {
    const normalized = createError?.message?.toLowerCase() ?? "";
    if (
      normalized.includes("already") ||
      normalized.includes("registered") ||
      normalized.includes("exists")
    ) {
      return {
        status: "error",
        message: "Email je već registrovan. Probaj drugi email.",
        fields,
      };
    }

    return {
      status: "error",
      message: "Kreiranje naloga nije uspelo. Probaj ponovo.",
      fields,
    };
  }

  let savedRefCode: string | undefined;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const refCode = generateRefCodeCandidate();
    const { error: insertError } = await admin.from("agents").insert({
      user_id: created.user.id,
      name,
      email,
      phone: phone || null,
      ref_code: refCode,
      default_commission_percent: percent,
      role: "commercialist",
      parent_agent_id: agent.id,
    });

    if (!insertError) {
      savedRefCode = refCode;
      break;
    }

    lastError = insertError.message;
    if (!isDuplicateError(insertError.message)) {
      break;
    }
  }

  if (!savedRefCode) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      status: "error",
      message: isDuplicateError(lastError)
        ? "Ref kod konflikt, probaj ponovo."
        : "Komercijalista nije sačuvan. Probaj ponovo.",
      fields,
    };
  }

  revalidatePath("/agent");
  revalidatePath("/komercijalista");
  revalidatePath("/superadmin/agenti");

  return {
    status: "success",
    message:
      "Komercijalista je kreiran. Lozinku vidiš samo jednom, a referral link je odmah spreman za deljenje.",
    commercialistName: name,
    commercialistEmail: email,
    commercialistRefCode: savedRefCode,
    generatedPassword: password,
  };
}

export async function updateCommercialistCommissionAction(formData: FormData) {
  const commercialistId = readString(formData, "commercialist_id");
  const percent = parsePercent(readString(formData, "default_commission_percent"));

  if (!commercialistId || percent === null) {
    return;
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return;
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("id, default_commission_percent, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (
    !agent ||
    normalizeAgentRole(agent.role) !== "agent" ||
    percent > agent.default_commission_percent
  ) {
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("agents")
    .update({ default_commission_percent: percent })
    .eq("id", commercialistId)
    .eq("parent_agent_id", agent.id)
    .eq("role", "commercialist");

  revalidatePath("/agent");
  revalidatePath("/superadmin/agenti");
}

export async function archiveCommercialistAction(formData: FormData) {
  const commercialistId = readString(formData, "commercialist_id");
  const shouldArchive = readString(formData, "next_archived") === "true";

  if (!commercialistId) {
    return;
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return;
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!agent || normalizeAgentRole(agent.role) !== "agent") {
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("agents")
    .update({
      archived_at: shouldArchive ? new Date().toISOString() : null,
      is_active: !shouldArchive,
    })
    .eq("id", commercialistId)
    .eq("parent_agent_id", agent.id)
    .eq("role", "commercialist");

  revalidatePath("/agent");
  revalidatePath("/komercijalista");
  revalidatePath("/superadmin/agenti");
}
