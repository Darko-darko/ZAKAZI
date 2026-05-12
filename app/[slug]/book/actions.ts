"use server";

import { redirect } from "next/navigation";
import { sendBookingEmails } from "@/lib/email/booking";
import { createClient } from "@/lib/supabase/server";
import { ANY_WORKER, buildBookingUrl } from "./utils";

type ClientEmailStatus = "sent" | "failed" | "skipped" | "unknown";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildSuccessUrl(slug: string, emailStatus: ClientEmailStatus) {
  const search = new URLSearchParams();
  search.set("success", "1");
  search.set("email", emailStatus);
  return `${buildBookingUrl(slug, {})}?${search.toString()}`;
}

function redirectWithError(
  slug: string,
  message: string,
  formData: FormData,
): never {
  const workerId = readString(formData, "worker_id");
  const serviceId = readString(formData, "service_id");
  const startsAt = readString(formData, "starts_at");
  const search = new URLSearchParams();

  if (workerId) {
    search.set("worker", workerId);
  } else {
    search.set("worker", ANY_WORKER);
  }

  if (serviceId) {
    search.set("service", serviceId);
  }

  if (startsAt) {
    search.set("slot", `${workerId}|${startsAt}`);
  }

  search.set("error", message);
  redirect(`/${slug}/book?${search.toString()}`);
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

  const workerId = readString(formData, "worker_id");
  const serviceId = readString(formData, "service_id");
  const startsAt = readString(formData, "starts_at");
  const clientName = readString(formData, "client_name");
  const clientPhone = readString(formData, "client_phone");
  const clientEmail = readString(formData, "client_email");
  const notes = readString(formData, "notes") || undefined;

  if (
    !workerId ||
    !serviceId ||
    !startsAt ||
    !clientName ||
    !clientPhone ||
    !clientEmail
  ) {
    redirectWithError(slug, "Popuni ime, telefon i email.", formData);
  }

  const { data: bookingId, error } = await supabase.rpc(
    "create_public_booking",
    {
      p_provider_id: provider.id,
      p_worker_id: workerId,
      p_service_id: serviceId,
      p_client_name: clientName,
      p_client_phone: clientPhone,
      p_client_email: clientEmail,
      p_starts_at: startsAt,
      p_notes: notes,
    },
  );

  if (error || !bookingId) {
    redirectWithError(
      slug,
      "Termin vise nije slobodan. Izaberi drugi termin.",
      formData,
    );
  }

  let emailStatus: ClientEmailStatus = "unknown";

  try {
    const emailResult = await sendBookingEmails(bookingId, {
      triggerSource: "public_booking",
    });

    emailStatus = emailResult.client?.status ?? "unknown";

    if (emailResult.client?.status === "failed") {
      console.error("Client booking email nije poslat.", {
        bookingId,
        error: emailResult.client.errorMessage,
      });
    }
  } catch (emailError) {
    emailStatus = "failed";
    console.error("Booking je sacuvan, ali booking email dispatch nije uspeo.", {
      bookingId,
      error: emailError,
    });
  }

  redirect(buildSuccessUrl(slug, emailStatus));
}
