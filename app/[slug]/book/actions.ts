"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(
  slug: string,
  message: string,
  formData: FormData,
): never {
  const params = new URLSearchParams();
  const serviceId = readString(formData, "service_id");
  const workerId = readString(formData, "worker_id");
  const date = readString(formData, "date");

  if (serviceId) {
    params.set("service", serviceId);
  }

  if (workerId) {
    params.set("worker", workerId);
  }

  if (date) {
    params.set("date", date);
  }

  params.set("error", message);
  redirect(`/${slug}/book?${params.toString()}`);
}

export async function createBookingAction(slug: string, formData: FormData) {
  const supabase = await createClient();
  const { data: providers } = await supabase.rpc("get_public_provider", {
    p_slug: slug,
  });
  const provider = providers?.[0];

  if (!provider) {
    redirectWithError(slug, "Stranica za zakazivanje nije dostupna.", formData);
  }

  const slot = readString(formData, "slot");
  const [workerId, startsAt] = slot.split("|");
  const serviceId = readString(formData, "service_id");
  const clientName = readString(formData, "client_name");
  const clientPhone = readString(formData, "client_phone");
  const clientEmail = readString(formData, "client_email");
  const notes = readString(formData, "notes") || undefined;

  if (!workerId || !serviceId || !startsAt || !clientName || !clientPhone) {
    redirectWithError(slug, "Izaberi termin i popuni ime i telefon.", formData);
  }

  const { data: bookingId, error } = await supabase.rpc(
    "create_public_booking",
    {
      p_provider_id: provider.id,
      p_worker_id: workerId,
      p_service_id: serviceId,
      p_client_name: clientName,
      p_client_phone: clientPhone,
      p_client_email: clientEmail || "",
      p_starts_at: startsAt,
      p_notes: notes,
    },
  );

  if (error || !bookingId) {
    redirectWithError(
      slug,
      "Termin više nije slobodan. Izaberi drugi termin.",
      formData,
    );
  }

  redirect(`/${slug}/book?success=1`);
}
