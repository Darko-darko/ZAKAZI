"use server";

import { revalidatePath } from "next/cache";
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
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!agent) {
    return {
      status: "error",
      message: "Samo agenti mogu da koriste ovu formu.",
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
      agent_id: agent.id,
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
      "Salon je registrovan. Diktiraj klijentu lozinku — vidis je samo jednom.",
    generatedPassword: password,
    providerSlug: savedSlug,
    providerName,
  };
}
