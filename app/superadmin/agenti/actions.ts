"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/superadmin";

export type CreateAgentState = {
  status: "idle" | "error" | "success";
  message: string;
  fields?: Record<string, string>;
  generatedPassword?: string;
  agentName?: string;
  agentEmail?: string;
  agentRefCode?: string;
};

const emptyCreateState: CreateAgentState = { status: "idle", message: "" };

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

function isDuplicateError(message: string | undefined) {
  return message?.toLowerCase().includes("duplicate") ?? false;
}

function parsePercent(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }
  return parsed;
}

export async function createAgentAction(
  _state: CreateAgentState = emptyCreateState,
  formData: FormData,
): Promise<CreateAgentState> {
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
    return { status: "error", message: "Unesi ime agenta.", fields };
  }

  if (!email.includes("@") || email.length < 5) {
    return { status: "error", message: "Unesi ispravan email.", fields };
  }

  const percent = parsePercent(percentRaw || "15");
  if (percent === null) {
    return {
      status: "error",
      message: "Procenat provizije mora biti broj između 0 i 100.",
      fields,
    };
  }

  const { admin } = await requireSuperAdmin();
  const password = generatePassword();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { agent_name: name },
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
          "Email je već registrovan u Supabase Auth-u. Probaj drugi email.",
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
        ? "Ref kod konflikt — probaj ponovo."
        : "Agent nije sačuvan. Probaj ponovo.",
      fields,
    };
  }

  revalidatePath("/superadmin/agenti");
  revalidatePath("/superadmin");

  return {
    status: "success",
    message:
      "Agent je kreiran. Diktiraj mu lozinku — vidiš je samo jednom.",
    generatedPassword: password,
    agentName: name,
    agentEmail: email,
    agentRefCode: savedRefCode,
  };
}

export async function updateAgentCommissionAction(formData: FormData) {
  const { admin } = await requireSuperAdmin();

  const agentId = readString(formData, "agent_id");
  const percent = parsePercent(readString(formData, "default_commission_percent"));

  if (!agentId || percent === null) {
    return;
  }

  await admin
    .from("agents")
    .update({ default_commission_percent: percent })
    .eq("id", agentId);

  revalidatePath("/superadmin/agenti");
}

export async function toggleAgentActiveAction(formData: FormData) {
  const { admin } = await requireSuperAdmin();

  const agentId = readString(formData, "agent_id");
  const nextActive = readString(formData, "next_active") === "true";

  if (!agentId) {
    return;
  }

  await admin
    .from("agents")
    .update({ is_active: nextActive })
    .eq("id", agentId);

  revalidatePath("/superadmin/agenti");
}
