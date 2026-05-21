"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";
import {
  formatNotificationEmails,
  invalidNotificationEmails,
} from "@/lib/email/notification-emails";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AccountActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const initialState: AccountActionState = {
  status: "idle",
  message: "",
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function success(message: string): AccountActionState {
  return { status: "success", message };
}

function error(message: string): AccountActionState {
  return { status: "error", message };
}

function normalizeAppUrl(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  try {
    const url = new URL(normalized);

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

async function getAppUrl() {
  return (
    normalizeAppUrl(
      process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.SITE_URL ??
        process.env.NEXT_PUBLIC_SITE_URL,
    ) ?? "https://zakazi.pro"
  );
}

export { initialState };

export async function updateNotificationEmailsAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const { supabase, provider } = await getCurrentProvider();
  const rawValue = readString(formData, "notification_emails");
  const invalidEmails = invalidNotificationEmails(rawValue);

  if (invalidEmails.length > 0) {
    return error(
      `Ove email adrese nisu ispravne: ${invalidEmails.join(", ")}.`,
    );
  }

  const { error: updateError } = await supabase
    .from("providers")
    .update({
      billing_email: formatNotificationEmails(rawValue),
    })
    .eq("id", provider.id)
    .eq("user_id", provider.user_id);

  if (updateError) {
    return error("Emailovi za obavestenja nisu sacuvani. Pokusaj ponovo.");
  }

  revalidatePath("/admin/nalog");
  revalidatePath("/admin/naplata");
  return success("Emailovi za obavestenja su sacuvani.");
}

export async function updateAccountPasswordAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirm_password");

  if (password.length < 8) {
    return error("Lozinka mora imati najmanje 8 karaktera.");
  }

  if (password !== confirmPassword) {
    return error("Lozinke se ne poklapaju.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return error(
      updateError.message.toLowerCase().includes("weak")
        ? "Lozinka je preslaba. Koristi najmanje 8 karaktera."
        : "Lozinka nije promenjena. Pokusaj ponovo.",
    );
  }

  return success("Lozinka je promenjena.");
}

export async function updateLoginEmailAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const nextEmail = readString(formData, "login_email").toLowerCase();

  if (!userData.user) {
    return error("Sesija je istekla. Prijavi se ponovo.");
  }

  if (!nextEmail.includes("@") || nextEmail.length < 5) {
    return error("Unesi ispravnu email adresu za prijavu.");
  }

  if ((userData.user.email ?? "").toLowerCase() === nextEmail) {
    return success("Login email je vec postavljen na ovu adresu.");
  }

  const { error: updateError } = await supabase.auth.updateUser(
    { email: nextEmail },
    { emailRedirectTo: `${await getAppUrl()}/admin/nalog` },
  );

  if (updateError) {
    return error(
      updateError.message.toLowerCase().includes("already")
        ? "Ovaj email je vec zauzet. Izaberi drugi."
        : "Promena login emaila nije pokrenuta. Pokusaj ponovo.",
    );
  }

  return success(
    "Poslali smo potvrdu za promenu login emaila. Potvrdi novu adresu preko email poruke.",
  );
}

export async function deleteAccountAction(
  _state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const confirmation = readString(formData, "delete_confirmation").toLowerCase();
  const { supabase, provider, user } = await getCurrentProvider();

  if (confirmation !== "jesam") {
    return error('Za brisanje naloga upisi tacno "Jesam".');
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return error("Brisanje naloga nije uspelo. Pokusaj ponovo.");
  }

  await supabase.auth.signOut();
  revalidatePath("/admin");
  revalidatePath("/admin/nalog");
  revalidatePath(`/${provider.slug}`);
  redirect("/login?message=Nalog%20je%20obrisan.");
}
