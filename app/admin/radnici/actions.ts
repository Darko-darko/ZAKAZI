"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value || null;
}

export async function createWorkerAction(formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();
  const name = readString(formData, "name");

  if (!name) {
    throw new Error("Ime radnika je obavezno.");
  }

  const { error } = await supabase.from("workers").insert({
    provider_id: provider.id,
    name,
    bio: readNullableString(formData, "bio"),
    buffer_minutes: 0,
    is_active: false,
  });

  if (error) {
    throw new Error("Radnik nije sačuvan. Pokušaj ponovo.");
  }

  revalidatePath("/admin/radnici");
  redirect("/admin/radnici");
}

export async function updateWorkerAction(workerId: string, formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();
  const name = readString(formData, "name");

  if (!name) {
    throw new Error("Ime radnika je obavezno.");
  }

  const { error } = await supabase
    .from("workers")
    .update({
      name,
      bio: readNullableString(formData, "bio"),
      buffer_minutes: 0,
    })
    .eq("id", workerId)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Izmene nisu sačuvane. Pokušaj ponovo.");
  }

  revalidatePath("/admin/radnici");
  revalidatePath(`/admin/radnici/${workerId}`);
  redirect("/admin/radnici");
}

export async function setWorkerOnlineBookingAction(
  workerId: string,
  enabled: boolean,
) {
  const { supabase, provider } = await getCurrentProvider();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, archived_at")
    .eq("id", workerId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!worker) {
    throw new Error("Radnik nije pronadjen.");
  }

  if (worker.archived_at) {
    throw new Error("Arhiviran radnik ne moze u online zakazivanje.");
  }

  if (enabled) {
    const [{ data: services }, { data: schedules }] = await Promise.all([
      supabase
        .from("worker_services")
        .select("service_id")
        .eq("worker_id", worker.id)
        .limit(1),
      supabase
        .from("worker_schedule")
        .select("id")
        .eq("worker_id", worker.id)
        .not("shift_id", "is", null)
        .limit(1),
    ]);

    if (!services?.length || !schedules?.length) {
      throw new Error("Radniku nedostaju usluge ili raspored.");
    }
  }

  const { error } = await supabase
    .from("workers")
    .update({ is_active: enabled })
    .eq("id", worker.id)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Status online zakazivanja nije sacuvan.");
  }

  revalidatePath("/admin/radnici");
  revalidatePath(`/admin/radnici/${worker.id}`);
  redirect(`/admin/radnici/${worker.id}`);
}

export async function archiveWorkerAction(workerId: string, formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();
  const confirmation = readString(formData, "confirm_archive").toLowerCase();

  if (confirmation !== "da") {
    throw new Error("Za arhiviranje upisi da.");
  }

  const { error } = await supabase
    .from("workers")
    .update({
      archived_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", workerId)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Radnik nije arhiviran. Pokusaj ponovo.");
  }

  revalidatePath("/admin/radnici");
  revalidatePath(`/admin/radnici/${workerId}`);
  redirect("/admin/radnici");
}

export async function restoreWorkerAction(workerId: string) {
  const { supabase, provider } = await getCurrentProvider();

  const { error } = await supabase
    .from("workers")
    .update({
      archived_at: null,
      is_active: false,
    })
    .eq("id", workerId)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Radnik nije vracen. Pokusaj ponovo.");
  }

  revalidatePath("/admin/radnici");
  revalidatePath(`/admin/radnici/${workerId}`);
  redirect(`/admin/radnici/${workerId}`);
}

export async function updateWorkerPhotoAction(
  workerId: string,
  photoPath: string | null,
) {
  const { supabase, provider } = await getCurrentProvider();
  const normalizedPath = photoPath?.trim() || null;

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("id", workerId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!worker) {
    throw new Error("Radnik nije pronadjen.");
  }

  if (
    normalizedPath &&
    !normalizedPath.startsWith(`providers/${provider.id}/workers/${worker.id}/`)
  ) {
    throw new Error("Putanja fotografije nije ispravna.");
  }

  const photoUrl = normalizedPath
    ? supabase.storage.from("provider-assets").getPublicUrl(normalizedPath).data
        .publicUrl
    : null;

  const { error } = await supabase
    .from("workers")
    .update({ photo_url: photoUrl })
    .eq("id", worker.id)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Fotografija nije sacuvana. Pokusaj ponovo.");
  }

  revalidatePath("/admin/radnici");
  revalidatePath(`/admin/radnici/${worker.id}`);

  return { photoUrl };
}

export async function updateWorkerServicesAction(
  workerId: string,
  formData: FormData,
) {
  const { supabase, provider } = await getCurrentProvider();
  const selectedServiceIds = Array.from(
    new Set(
      formData
        .getAll("service_id")
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("id", workerId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!worker) {
    throw new Error("Radnik nije pronadjen.");
  }

  const { error: deleteError } = await supabase
    .from("worker_services")
    .delete()
    .eq("worker_id", worker.id);

  if (deleteError) {
    throw new Error("Usluge radnika nisu sacuvane. Pokusaj ponovo.");
  }

  if (selectedServiceIds.length) {
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id")
      .eq("provider_id", provider.id)
      .in("id", selectedServiceIds);

    if (servicesError) {
      throw new Error("Usluge radnika nisu sacuvane. Pokusaj ponovo.");
    }

    const rows = services.map((service) => ({
      worker_id: worker.id,
      service_id: service.id,
    }));

    if (rows.length) {
      const { error: insertError } = await supabase
        .from("worker_services")
        .insert(rows);

      if (insertError) {
        throw new Error("Usluge radnika nisu sacuvane. Pokusaj ponovo.");
      }
    }
  }

  revalidatePath("/admin/radnici");
  revalidatePath(`/admin/radnici/${worker.id}`);
  redirect(`/admin/radnici/${worker.id}`);
}

export async function updateWorkerScheduleAction(
  workerId: string,
  formData: FormData,
) {
  const { supabase, provider } = await getCurrentProvider();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("id", workerId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!worker) {
    throw new Error("Radnik nije pronadjen.");
  }

  const selectedRows = Array.from({ length: 7 }, (_, day) => ({
    day_of_week: day,
    shift_id: readString(formData, `shift_${day}`),
  })).filter((row) => row.shift_id);

  if (selectedRows.length) {
    const selectedShiftIds = Array.from(
      new Set(selectedRows.map((row) => row.shift_id)),
    );
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("id")
      .eq("provider_id", provider.id)
      .in("id", selectedShiftIds);

    if (shiftsError || shifts.length !== selectedShiftIds.length) {
      throw new Error("Raspored nije sacuvan. Izabrana smena nije ispravna.");
    }
  }

  const { error: deleteError } = await supabase
    .from("worker_schedule")
    .delete()
    .eq("worker_id", worker.id);

  if (deleteError) {
    throw new Error("Raspored nije sacuvan. Pokusaj ponovo.");
  }

  if (selectedRows.length) {
    const { error: insertError } = await supabase
      .from("worker_schedule")
      .insert(
        selectedRows.map((row) => ({
          worker_id: worker.id,
          day_of_week: row.day_of_week,
          shift_id: row.shift_id,
        })),
      );

    if (insertError) {
      throw new Error("Raspored nije sacuvan. Pokusaj ponovo.");
    }
  }

  revalidatePath("/admin/radnici");
  revalidatePath(`/admin/radnici/${worker.id}`);
  redirect(`/admin/radnici/${worker.id}`);
}
