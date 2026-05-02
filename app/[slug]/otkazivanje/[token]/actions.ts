"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelBookingByToken } from "@/lib/email/booking";

export async function cancelBookingAction(
  slug: string,
  token: string,
) {
  const result = await cancelBookingByToken(token);

  if (!result.ok) {
    const search = new URLSearchParams();
    search.set("status", result.reason);
    search.set("message", result.message);
    redirect(`/${slug}/otkazivanje/${token}?${search.toString()}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/termini");
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/book`);

  const search = new URLSearchParams();
  if (result.sentClientConfirmation) {
    search.set("email", "1");
  }
  redirect(`/${slug}/otkazivanje/uspesno?${search.toString()}`);
}
