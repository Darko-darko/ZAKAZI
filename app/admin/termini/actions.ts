"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";

const ALLOWED_STATUSES = new Set(["confirmed", "cancelled", "noshow"]);

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
