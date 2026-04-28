"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";

const ALLOWED_STATUSES = new Set(["confirmed", "cancelled", "noshow"]);
const BOOKINGS_OVERVIEW_ID = "dnevni-pregled";
const MANUAL_ADD_ID = "rucno-dodaj-termin";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildManualUrl(formData: FormData, error?: string) {
  const search = new URLSearchParams();
  search.set("date", readString(formData, "current_date"));
  search.set("manual", "1");

  const currentWorker = readString(formData, "current_worker");
  const currentStatus = readString(formData, "current_status");
  const manualDate = readString(formData, "manual_date");
  const manualWorker = readString(formData, "worker_id");
  const manualService = readString(formData, "service_id");
  const manualSlot = readString(formData, "starts_at");

  if (currentWorker) {
    search.set("worker", currentWorker);
  }

  if (currentStatus || currentStatus === "") {
    search.set("status", currentStatus);
  }

  if (manualDate) {
    search.set("manual_date", manualDate);
  }

  if (manualWorker) {
    search.set("manual_worker", manualWorker);
  }

  if (manualService) {
    search.set("manual_service", manualService);
  }

  if (manualSlot) {
    search.set("manual_slot", manualSlot);
  }

  if (error) {
    search.set("manual_error", error);
  }

  return `/admin/termini?${search.toString()}#${MANUAL_ADD_ID}`;
}

export async function updateBookingStatusAction(
  bookingId: string,
  status: string,
  formData: FormData,
) {
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error("Status termina nije dozvoljen.");
  }

  const { supabase, provider } = await getCurrentProvider();
  const returnTo = readString(formData, "return_to") || "/admin/termini";

  const { error } = await supabase
    .from("bookings")
    .update({
      status,
      cancelled_by: status === "cancelled" ? "admin" : null,
    })
    .eq("id", bookingId)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Status termina nije sačuvan.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/termini");
  redirect(returnTo);
}

export async function createManualBookingAction(formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();
  const manualDate = readString(formData, "manual_date");
  const workerId = readString(formData, "worker_id");
  const serviceId = readString(formData, "service_id");
  const startsAt = readString(formData, "starts_at");
  const clientName = readString(formData, "client_name");
  const clientPhone = readString(formData, "client_phone");
  const clientEmail = readString(formData, "client_email");
  const notes = readString(formData, "notes") || undefined;

  if (
    !manualDate ||
    !workerId ||
    !serviceId ||
    !startsAt ||
    !clientName ||
    !clientPhone ||
    !clientEmail
  ) {
    redirect(
      buildManualUrl(formData, "Popuni radnika, uslugu, termin i podatke mušterije."),
    );
  }

  const { data: bookingId, error } = await supabase.rpc("create_public_booking", {
    p_provider_id: provider.id,
    p_worker_id: workerId,
    p_service_id: serviceId,
    p_client_name: clientName,
    p_client_phone: clientPhone,
    p_client_email: clientEmail,
    p_starts_at: startsAt,
    p_notes: notes,
  });

  if (error || !bookingId) {
    redirect(
      buildManualUrl(
        formData,
        "Termin više nije slobodan. Izaberi drugi slobodan termin.",
      ),
    );
  }

  const search = new URLSearchParams();
  search.set("date", manualDate);
  search.set("status", "active");
  search.set("worker", workerId);

  revalidatePath("/admin");
  revalidatePath("/admin/termini");
  redirect(`/admin/termini?${search.toString()}#${BOOKINGS_OVERVIEW_ID}`);
}
