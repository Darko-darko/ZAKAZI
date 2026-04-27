"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getReferralAgent } from "@/lib/auth/referrals";
import { getPostLoginRedirect } from "@/lib/auth/roles";
import { createProviderSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fields?: Record<string, string>;
};

const emptyState: AuthActionState = {
  status: "idle",
  message: "",
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function error(message: string, fields?: Record<string, string>): AuthActionState {
  return { status: "error", message, fields };
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

function getLoginErrorMessage(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("email not confirmed")) {
    return "Email adresa nije potvrdjena. Otvori poruku iz Supabase-a i potvrdi nalog, pa se prijavi ponovo.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "Email ili lozinka nisu ispravni.";
  }

  return "Prijava nije uspela. Proveri email, lozinku i da li je nalog potvrdjen.";
}

function getAuthOrigin() {
  return headers().then((headerStore) => headerStore.get("origin") ?? undefined);
}

export async function loginAction(
  _state: AuthActionState = emptyState,
  formData: FormData,
): Promise<AuthActionState> {
  void _state;

  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (!email || !password) {
    return error("Unesi email i lozinku.", { email, password: "" });
  }

  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !data.user) {
    return error(getLoginErrorMessage(signInError?.message), {
      email,
      password: "",
    });
  }

  redirect(await getPostLoginRedirect(supabase, data.user));
}

export async function forgotPasswordAction(
  _state: AuthActionState = emptyState,
  formData: FormData,
): Promise<AuthActionState> {
  void _state;

  const email = readString(formData, "email").toLowerCase();

  if (!email.includes("@") || email.length < 5) {
    return error("Unesi ispravan email.", { email });
  }

  const supabase = await createClient();
  const origin = await getAuthOrigin();

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo: origin ? `${origin}/reset-password` : undefined,
    },
  );

  if (resetError) {
    return error("Slanje reset linka nije uspelo. Proveri email i probaj ponovo.", {
      email,
    });
  }

  return {
    status: "success",
    message:
      "Ako nalog postoji, poslali smo email sa linkom za postavljanje nove lozinke.",
    fields: { email },
  };
}

export async function updatePasswordAction(
  _state: AuthActionState = emptyState,
  formData: FormData,
): Promise<AuthActionState> {
  void _state;

  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirm_password");

  if (password.length < 8) {
    return error("Lozinka mora imati najmanje 8 karaktera.");
  }

  if (password !== confirmPassword) {
    return error("Lozinke se ne poklapaju.");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return error(
      "Reset link je istekao ili nije validan. Zatrazi novi link za reset lozinke.",
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return error(
      updateError.message.toLowerCase().includes("weak")
        ? "Lozinka je preslaba. Koristi najmanje 8 karaktera."
        : "Lozinka nije promenjena. Zatrazi novi reset link i probaj ponovo.",
    );
  }

  await supabase.auth.signOut();
  redirect(
    "/login?message=Lozinka%20je%20promenjena.%20Prijavi%20se%20novom%20lozinkom.",
  );
}

async function insertProviderWithAvailableSlug({
  agentId,
  billingEmail,
  city,
  name,
  phone,
  refCode,
  supabase,
  userId,
}: {
  agentId: string | null;
  billingEmail: string | null;
  city: string;
  name: string;
  phone: string;
  refCode: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const baseSlug = createProviderSlug(name);
  let lastErrorMessage: string | undefined;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = getSlugCandidate(baseSlug, attempt);
    const { data, error: providerError } = await supabase
      .from("providers")
      .insert({
        user_id: userId,
        name,
        slug,
        billing_email: billingEmail,
        phone: phone || null,
        city: city || null,
        agent_id: agentId,
        ref_code: refCode,
      })
      .select("id")
      .single();

    if (!providerError && data) {
      return { id: data.id, errorMessage: undefined };
    }

    lastErrorMessage = providerError?.message;

    if (!isDuplicateError(providerError?.message)) {
      break;
    }
  }

  return { id: undefined, errorMessage: lastErrorMessage };
}

async function updateProviderWithAvailableSlug({
  city,
  name,
  phone,
  providerId,
  supabase,
}: {
  city: string;
  name: string;
  phone: string;
  providerId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const baseSlug = createProviderSlug(name);
  let lastErrorMessage: string | undefined;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = getSlugCandidate(baseSlug, attempt);
    const { error: updateError } = await supabase
      .from("providers")
      .update({
        name,
        slug,
        phone: phone || null,
        city: city || null,
      })
      .eq("id", providerId);

    if (!updateError) {
      return undefined;
    }

    lastErrorMessage = updateError.message;

    if (!isDuplicateError(updateError.message)) {
      break;
    }
  }

  return lastErrorMessage;
}

export async function registerAction(
  _state: AuthActionState = emptyState,
  formData: FormData,
): Promise<AuthActionState> {
  void _state;

  const providerName = readString(formData, "provider_name");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const phone = readString(formData, "phone");
  const city = readString(formData, "city");
  const ref = readString(formData, "ref").toUpperCase();

  const fields = {
    provider_name: providerName,
    slug: createProviderSlug(providerName),
    email,
    phone,
    city,
    ref,
  };

  if (!providerName || providerName.length < 2) {
    return error("Unesi naziv naloga.", fields);
  }

  if (!email.includes("@")) {
    return error("Unesi ispravan email.", fields);
  }

  if (password.length < 8) {
    return error("Lozinka mora imati najmanje 8 karaktera.", fields);
  }

  const supabase = await createClient();
  const origin = await getAuthOrigin();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { provider_name: providerName },
      emailRedirectTo: origin ? `${origin}/register/onboarding` : undefined,
    },
  });

  if (signUpError || !signUpData.user) {
    return error(
      signUpError?.message.includes("already")
        ? "Nalog sa ovim emailom vec postoji. Prijavi se umesto registracije."
        : "Registracija nije uspela. Proveri podatke i probaj ponovo.",
      fields,
    );
  }

  if (!signUpData.session) {
    return {
      status: "success",
      message:
        "Nalog je kreiran. Potvrdi email adresu, pa se prijavi da zavrsis onboarding.",
      fields,
    };
  }

  const { agentId, refCode } = await getReferralAgent(supabase, ref);
  const { data: existingProvider } = await supabase
    .from("providers")
    .select("id")
    .eq("user_id", signUpData.user.id)
    .maybeSingle();

  if (!existingProvider) {
    const { errorMessage } = await insertProviderWithAvailableSlug({
      agentId,
      billingEmail: email,
      city,
      name: providerName,
      phone,
      refCode,
      supabase,
      userId: signUpData.user.id,
    });

    if (errorMessage) {
      return error(
        isDuplicateError(errorMessage)
          ? "Nije moguce automatski napraviti URL. Probaj drugi naziv naloga."
          : "Nalog je kreiran, ali podaci biznisa nisu sacuvani. Prijavi se i zavrsi onboarding.",
        fields,
      );
    }
  }

  redirect("/register/onboarding");
}

export async function onboardingAction(
  _state: AuthActionState = emptyState,
  formData: FormData,
): Promise<AuthActionState> {
  void _state;

  const providerName = readString(formData, "provider_name");
  const phone = readString(formData, "phone");
  const city = readString(formData, "city");
  const ref = readString(formData, "ref").toUpperCase();
  const shiftName = readString(formData, "shift_name") || "Radno vreme";
  const startTime = readString(formData, "start_time");
  const endTime = readString(formData, "end_time");
  const workerName = readString(formData, "worker_name");
  const workDays = formData.getAll("work_days").map(String);

  const fields = {
    provider_name: providerName,
    slug: createProviderSlug(providerName),
    phone,
    city,
    ref,
    shift_name: shiftName,
    start_time: startTime,
    end_time: endTime,
    worker_name: workerName,
  };

  if (!providerName || !workerName || !startTime || !endTime) {
    return error("Popuni naziv, radno vreme i prvog radnika.", fields);
  }

  if (startTime >= endTime) {
    return error("Pocetak radnog vremena mora biti pre kraja.", fields);
  }

  if (workDays.length === 0) {
    return error("Izaberi bar jedan radni dan.", fields);
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return error("Sesija je istekla. Prijavi se ponovo.");
  }

  const { data: provider } = await supabase
    .from("providers")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { agentId, refCode } = provider
    ? { agentId: null, refCode: null }
    : await getReferralAgent(supabase, ref);

  let providerId = provider?.id;

  if (!providerId) {
    const { id, errorMessage } = await insertProviderWithAvailableSlug({
      agentId,
      billingEmail: userData.user.email ?? null,
      city,
      name: providerName,
      phone,
      refCode,
      supabase,
      userId: userData.user.id,
    });

    if (!id) {
      return error(
        isDuplicateError(errorMessage)
          ? "Nije moguce automatski napraviti URL. Probaj drugi naziv naloga."
          : "Nije moguce sacuvati nalog. Probaj ponovo.",
        fields,
      );
    }

    providerId = id;
  } else {
    const updateErrorMessage = await updateProviderWithAvailableSlug({
      city,
      name: providerName,
      phone,
      providerId,
      supabase,
    });

    if (updateErrorMessage) {
      return error(
        isDuplicateError(updateErrorMessage)
          ? "Nije moguce automatski napraviti URL. Probaj drugi naziv naloga."
          : "Nije moguce sacuvati podatke naloga.",
        fields,
      );
    }
  }

  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .insert({
      provider_id: providerId,
      name: shiftName,
      start_time: startTime,
      end_time: endTime,
    })
    .select("id")
    .single();

  if (shiftError || !shift) {
    return error("Nalog je sacuvan, ali smena nije kreirana.", fields);
  }

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .insert({
      provider_id: providerId,
      name: workerName,
    })
    .select("id")
    .single();

  if (workerError || !worker) {
    return error("Smena je sacuvana, ali prvi radnik nije kreiran.", fields);
  }

  const scheduleRows = workDays
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .map((day_of_week) => ({
      worker_id: worker.id,
      shift_id: shift.id,
      day_of_week,
    }));

  if (scheduleRows.length > 0) {
    const { error: scheduleError } = await supabase
      .from("worker_schedule")
      .insert(scheduleRows);

    if (scheduleError) {
      return error("Radnik je kreiran, ali raspored nije sacuvan.", fields);
    }
  }

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
